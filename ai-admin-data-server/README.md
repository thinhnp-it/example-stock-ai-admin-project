# Stock data API (`ai-admin-data-server`)

FastAPI read API for stock time-series data stored in PostgreSQL. It supports a fixed allow-list of symbols and provides historical rows and summary metrics for the dashboard.

## Workflow and purpose

1. The dashboard requests available symbols.
2. The user selects a symbol and date interval.
3. The API maps the symbol to a fixed PostgreSQL table and applies date/order/row-limit filters.
4. The summary endpoint calculates latest close, percent change, average volume, high, low, and point count.

| Symbol | PostgreSQL table |
| --- | --- |
| `tsla` | `tsla_stock_data` |
| `amzn` | `amzn_stock_data` |
| `msft` | `msft_stock_data` |
| `googl` | `googl_stock_data` |
| `nvda` | `nvda_stock_data` |

Tables are expected to contain `date`, `open`, `high`, `low`, `close`, `volume`, and `name`. API startup does not import the CSV files; prepare the tables separately.

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_JWT_SECRET` | Yes | Same HS256 secret as `user-server`; at least 32 bytes. |
| `CORS_ORIGINS` | No | Comma-separated browser origins; defaults to localhost ports 3000 and 3003. |
| `HOST` | Yes | PostgreSQL host. Use `127.0.0.1` for host-based local development or DB service DNS in containers. |
| `PORT` | No | PostgreSQL port; usually `5432`. |
| `DATABASE` | Yes | Database containing stock tables. |
| `USERNAME` | Yes | Database user; use read-only privileges. |
| `PASSWORD` | Yes | Database password. |

Illustrative values:

```dotenv
AUTH_JWT_SECRET=replace-with-private-random-value-at-least-32-bytes
CORS_ORIGINS=http://localhost:3000
HOST=127.0.0.1
PORT=5432
DATABASE=stocks
USERNAME=stock_reader
PASSWORD=replace-me
```

## Run locally

From this directory:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env with a reachable PostgreSQL database and shared JWT secret.
uvicorn main:app --reload --host 0.0.0.0 --port 8009
```

Suggested dashboard base URL: `http://localhost:8009`. `GET /healthz` is unauthenticated liveness. `GET /health` exists but is subject to the app-wide authentication dependency; send a bearer token when using it.

## API

Stock routes require a valid bearer JWT.

- `GET /stocks` — supported symbol list.
- `GET /stocks/{symbol}` — rows; optional `start`, `end` (`YYYY-MM-DD`), `limit` (1–5000, default 365), and `order` (`asc`/`desc`, default `asc`).
- `GET /stocks/{symbol}/summary` — summary metrics; optional `start`, `end`, `limit` (2–5000, default 365).
- `GET /healthz` — unauthenticated liveness.

## Docker

Build from this directory. A database on the macOS host is usually addressed from a container as `host.docker.internal`, not `localhost`.

```bash
docker build -t ai-admin-data .
docker run --rm --name ai-admin-data --env-file .env -p 8009:8000 ai-admin-data
```

The container listens on port 8000 internally and runs as an unprivileged user. Keep PostgreSQL on private networking and give this service only the read permissions it needs.
