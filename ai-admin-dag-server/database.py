from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import URL
from dotenv import load_dotenv
import os

load_dotenv()

# Database configuration from environment variables
DB_TYPE = os.getenv("DB_TYPE", "postgresql")  # Default to postgresql
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Build database URL
if DB_TYPE not in ("postgresql", "mysql"):
    raise ValueError("Unsupported database type in DB_TYPE env var.")
DATABASE_URL = URL.create(
    "postgresql+psycopg2" if DB_TYPE == "postgresql" else "mysql+pymysql",
    username=DB_USERNAME,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT) if DB_PORT else None,
    database=DB_NAME,
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_database_schema():
    inspector = inspect(engine)
    schema = ""
    for table_name in inspector.get_table_names():
        schema += f"Table: {table_name}\n"
        primary_keys = set(
            inspector.get_pk_constraint(table_name).get("constrained_columns") or []
        )
        foreign_keys = {
            column: f"{fk['referred_table']}.{target}"
            for fk in inspector.get_foreign_keys(table_name)
            for column, target in zip(fk["constrained_columns"], fk["referred_columns"])
        }
        for column in inspector.get_columns(table_name):
            col_name = column["name"]
            col_type = str(column["type"])
            if col_name in primary_keys:
                col_type += ", Primary Key"
            if col_name in foreign_keys:
                col_type += f", Foreign Key to {foreign_keys[col_name]}"
            schema += f"- {col_name}: {col_type}\n"
        schema += "\n"
    print("Retrieved database schema.")
    return schema
