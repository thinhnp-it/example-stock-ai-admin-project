import pandas as pd
import psycopg2
from psycopg2 import sql
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Database connection parameters - replace with your actual details
DB_HOST = os.getenv("HOST")
DB_NAME = os.getenv("DATABASE")
DB_USER = os.getenv("USERNAME")
DB_PASS = os.getenv("PASSWORD")
DB_PORT = os.getenv("PORT")

# Folder containing CSV files
DATA_FOLDER = Path(__file__).resolve().parent / "data"

def create_table_if_not_exists(conn, table_name):
    """Create table if it doesn't exist."""
    create_query = sql.SQL("""
    CREATE TABLE IF NOT EXISTS {} (
        date DATE PRIMARY KEY,
        open NUMERIC,
        high NUMERIC,
        low NUMERIC,
        close NUMERIC,
        volume NUMERIC,
        name VARCHAR(10)
    )
    """).format(sql.Identifier(table_name))
    
    with conn.cursor() as cur:
        cur.execute(create_query)
        cur.execute(sql.SQL("CREATE UNIQUE INDEX IF NOT EXISTS {} ON {} (date)").format(
            sql.Identifier(f"{table_name}_date_unique"), sql.Identifier(table_name)
        ))
    conn.commit()

def load_csv_to_table(csv_file, table_name):
    """Load CSV data into PostgreSQL table."""
    # Read CSV into DataFrame
    df = pd.read_csv(csv_file)
    
    # Connect to PostgreSQL
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS, 
        port=DB_PORT
    )
    
    try:
        # Create table if not exists
        create_table_if_not_exists(conn, table_name)
        
        # Insert data row by row (for simplicity; use COPY for large datasets)
        with conn.cursor() as cur:
            for _, row in df.iterrows():
                insert_query = sql.SQL("""
                INSERT INTO {} (date, open, high, low, close, volume, name)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (date) DO UPDATE SET
                    open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                    close = EXCLUDED.close, volume = EXCLUDED.volume, name = EXCLUDED.name
                """).format(sql.Identifier(table_name))
                cur.execute(insert_query, (
                    row['Date'], row['Open'], row['High'], row['Low'],
                    row['Close'], row['Volume'], row['Name']
                ))
        conn.commit()
        print(f"Data from {csv_file} loaded into table {table_name} successfully.")
    except Exception as e:
        conn.rollback()
        raise RuntimeError(f"Error loading {csv_file}: {e}") from e
    finally:
        conn.close()

if __name__ == "__main__":
    for csv_file in sorted(DATA_FOLDER.glob("*_stock_data.csv")):
        load_csv_to_table(csv_file, csv_file.stem.lower())
