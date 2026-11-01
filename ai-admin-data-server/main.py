from __future__ import annotations

import os
from datetime import date
from typing import List, Optional, Literal, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Date, Float, String, select, desc, asc, func
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from sqlalchemy.engine import URL
from security import install_health_probe, require_user

load_dotenv()

DB_HOST = os.getenv("HOST")
DB_NAME = os.getenv("DATABASE")
DB_USER = os.getenv("USERNAME")
DB_PASS = os.getenv("PASSWORD")
DB_PORT = os.getenv("PORT")

DATABASE_URL = URL.create("postgresql+psycopg2", username=DB_USER, password=DB_PASS, host=DB_HOST,
                          port=int(DB_PORT) if DB_PORT else None, database=DB_NAME)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# Available symbols and their table names
SYMBOLS: Dict[str, str] = {
    "tsla": "tsla_stock_data",
    "amzn": "amzn_stock_data",
    "msft": "msft_stock_data",
    "googl": "googl_stock_data",
    "nvda": "nvda_stock_data",
}


# ---------- Pydantic models ----------
class StockData(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    name: str


class StockSummary(BaseModel):
    symbol: str
    name: Optional[str] = None
    start: Optional[date] = None
    end: Optional[date] = None

    latest_date: Optional[date] = None
    latest_close: float = 0

    change_pct: float = 0
    avg_volume: float = 0
    high: float = 0
    low: float = 0

    points: int = 0


# ---------- DB session dependency ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- Dynamic table factory ----------
_dynamic_tables: Dict[str, Any] = {}


def get_dynamic_table(table_name: str):
    """
    Create (and cache) a SQLAlchemy mapped class for a given table name.
    This avoids re-declaring the class on every request.
    """
    if table_name in _dynamic_tables:
        return _dynamic_tables[table_name]

    class DynamicTable(Base):
        __tablename__ = table_name

        date = Column(Date, primary_key=True)
        open = Column(Float)
        high = Column(Float)
        low = Column(Float)
        close = Column(Float)
        volume = Column(Float)
        name = Column(String)

    _dynamic_tables[table_name] = DynamicTable
    return DynamicTable


# ---------- App ----------
app = FastAPI(title="Stock Data API", description="API to fetch stock data from PostgreSQL", dependencies=[Depends(require_user)])
install_health_probe(app)

# cors_origins = os.getenv("CORS_ORIGINS", "*")
# allow_origins = ["*"] if cors_origins == "*" else [o.strip() for o in cors_origins.split(",")]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=allow_origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
# origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[o.strip() for o in origins],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3003").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/stocks", response_model=List[str])
def get_available_symbols():
    """Get list of available stock symbols."""
    return list(SYMBOLS.keys())


@app.get("/stocks/{symbol}", response_model=List[StockData])
def get_stock_data(
    symbol: str,
    start: Optional[date] = Query(default=None, description="Start date YYYY-MM-DD"),
    end: Optional[date] = Query(default=None, description="End date YYYY-MM-DD"),
    limit: int = Query(default=365, ge=1, le=5000, description="Max rows"),
    order: Literal["asc", "desc"] = Query(default="asc"),
    db: Session = Depends(get_db),
):
    """
    Get stock data for a symbol with optional date filtering.
    Recommended: order=asc for charting.
    """
    sym = symbol.lower()
    if sym not in SYMBOLS:
        raise HTTPException(status_code=404, detail="Symbol not found")

    table_name = SYMBOLS[sym]
    T = get_dynamic_table(table_name)

    stmt = select(T)

    if start is not None:
        stmt = stmt.where(T.date >= start)
    if end is not None:
        stmt = stmt.where(T.date <= end)

    stmt = stmt.order_by(asc(T.date) if order == "asc" else desc(T.date)).limit(limit)

    results = db.execute(stmt).scalars().all()

    return [
        StockData(
            date=row.date,
            open=row.open or 0,
            high=row.high or 0,
            low=row.low or 0,
            close=row.close or 0,
            volume=row.volume or 0,
            name=row.name or "",
        )
        for row in results
    ]


@app.get("/stocks/{symbol}/summary", response_model=StockSummary)
def get_stock_summary(
    symbol: str,
    start: Optional[date] = Query(default=None),
    end: Optional[date] = Query(default=None),
    limit: int = Query(default=365, ge=2, le=5000),
    db: Session = Depends(get_db),
):
    """
    Summary for dashboard KPI cards.
    It uses up to `limit` points within [start,end].
    """
    sym = symbol.lower()
    if sym not in SYMBOLS:
        raise HTTPException(status_code=404, detail="Symbol not found")

    table_name = SYMBOLS[sym]
    T = get_dynamic_table(table_name)

    stmt = select(T)

    if start is not None:
        stmt = stmt.where(T.date >= start)
    if end is not None:
        stmt = stmt.where(T.date <= end)

    # Take the latest points in the range, then restore chronological order.
    stmt = stmt.order_by(desc(T.date)).limit(limit)
    rows = list(reversed(db.execute(stmt).scalars().all()))

    if len(rows) == 0:
        return StockSummary(symbol=sym, start=start, end=end, points=0)

    # calc
    first = rows[0]
    latest = rows[-1]
    closes = [r.close or 0 for r in rows]
    highs = [r.high or 0 for r in rows]
    lows = [r.low or 0 for r in rows]
    volumes = [r.volume or 0 for r in rows]

    first_close = closes[0] if closes else 0
    latest_close = closes[-1] if closes else 0
    change_pct = ((latest_close - first_close) / first_close * 100) if first_close else 0

    avg_volume = sum(volumes) / max(len(volumes), 1)
    high_val = max(highs) if highs else 0
    low_val = min(lows) if lows else 0

    return StockSummary(
        symbol=sym,
        name=latest.name,
        start=start,
        end=end,
        latest_date=latest.date,
        latest_close=latest_close,
        change_pct=change_pct,
        avg_volume=avg_volume,
        high=high_val,
        low=low_val,
        points=len(rows),
    )


# Run:
# uvicorn main:app --host 0.0.0.0 --port 8000
