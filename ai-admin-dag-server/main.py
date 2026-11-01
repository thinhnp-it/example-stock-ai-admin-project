import logging
import os
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field
from report import generate_report
from fastapi.middleware.cors import CORSMiddleware

from security import install_health_probe, require_user

app = FastAPI(title="Database Query Agent API", dependencies=[Depends(require_user)])
install_health_probe(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:3003"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)


@app.post("/query-database")
def api_generate_report(request: QueryRequest):
    if os.getenv("DAG_READ_ONLY_DB_CONFIRMED", "").lower() != "true":
        raise HTTPException(
            status_code=503, detail="Read-only database is not configured"
        )
    try:
        response = generate_report(request.question)

        result = {
            "query_result": response["query_result"],
            "sql_query": response.get("sql_query", ""),
        }
        return result
    except Exception:
        logging.exception("DAG query failed")
        raise HTTPException(
            status_code=500, detail="Unable to process the query"
        ) from None
