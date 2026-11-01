# AI Admin Platform

AI Admin is a modular admin dashboard for stock-market analytics and AI-assisted access to business data and documents. This workspace contains a Next.js frontend and four FastAPI backend services: authentication, stock data, document RAG, and natural-language SQL querying.

## Capabilities

- Admin login and short-lived JWT bearer tokens.
- Stock history and summaries for TSLA, AMZN, MSFT, GOOGL, and NVDA.
- Document uploads to S3-compatible storage, vector indexing in Pinecone, and grounded document Q&A.
- Natural-language database questions converted to SQL, validated, and run in read-only mode.

The HR page is demo data. The frontend has AI/TAG API clients, but this workspace has no corresponding AI or TAG backend service.

## Repository map

| Directory | Purpose |
| --- | --- |
| `ai-admin-dashboard/` | Next.js/React pages, components, auth state, and backend API clients. |
| `user-server/` | Admin login, password verification, and JWT issuance. |
| `ai-admin-data-server/` | PostgreSQL-backed stock history and summary API. |
| `ai-admin-rag-server/` | Document upload, S3 storage, Pinecone indexing/retrieval, and LLM answers. |
| `ai-admin-dag-server/` | LangGraph natural-language-to-SQL workflow with SQL safety checks. |
| [Architecture.md](Architecture.md) | Integration, service flows, local setup, Docker, and production guidance. |

Service-specific documentation: [auth](user-server/README.md), [stock data](ai-admin-data-server/README.md), [RAG](ai-admin-rag-server/README.md), [DAG](ai-admin-dag-server/README.md), and [frontend](ai-admin-dashboard/README.md).

## Local development quick start

Prerequisites: Python 3.13, Node.js 22/npm, PostgreSQL, and credentials for the external services you use. Start each API in its own terminal. For each Python service, from its directory:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env with valid service settings before starting the API.
```

Suggested local API ports (each backend Docker image listens on port 8000 internally):

```bash
# Run from user-server/
uvicorn main:app --host 0.0.0.0 --port 8002
# Run from ai-admin-data-server/
uvicorn main:app --host 0.0.0.0 --port 8009
# Run from ai-admin-rag-server/
uvicorn main:app --host 0.0.0.0 --port 8083
# Run from ai-admin-dag-server/
uvicorn main:app --host 0.0.0.0 --port 8084
```

Run only services with valid configuration and reachable dependencies. Configure the dashboard `.env.local` with browser-reachable backend URLs, then run:

```bash
cd ai-admin-dashboard
npm ci
cp .env.example .env.local
# Set URLs in .env.local; NEXT_PUBLIC_* values are browser-visible, not secrets.
npm run dev
```

For complete environment examples, setup, and Docker deployment notes, see [Architecture.md](Architecture.md) and each service README.

## Docker Compose on a VM

The workspace includes a Compose stack for the dashboard, four APIs, and Caddy reverse proxy. PostgreSQL/MySQL and the RAG/LLM providers remain external dependencies.

```bash
cp .env.compose.example .env
cp user-server/.env.example user-server/.env
cp ai-admin-data-server/.env.example ai-admin-data-server/.env
cp ai-admin-rag-server/.env.example ai-admin-rag-server/.env
cp ai-admin-dag-server/.env.example ai-admin-dag-server/.env
# Edit the five .env files; use a shared AUTH_JWT_SECRET and valid external credentials.
docker compose config
docker compose up --build -d
docker compose ps
```

With the default `CADDY_SITE=:80`, open `http://localhost`. For a public VM, set `CADDY_SITE` to a DNS hostname and allow inbound TCP ports 80/443 so Caddy can provision TLS. See [Architecture.md](Architecture.md) for runtime configuration, operations, and production guidance.

## Security essentials

- Set the same `AUTH_JWT_SECRET` for `user-server` and every protected API. It must contain at least 32 bytes and remain secret.
- Generate the administrator hash by running `python hash_password.py` in `user-server/`; the helper prompts without echoing the password.
- Use a database account with read-only privileges for DAG. Set `DAG_READ_ONLY_DB_CONFIRMED=true` only after verifying the account.
- Do not commit populated `.env` files or put backend secrets in `NEXT_PUBLIC_*` variables.

## Checks

```bash
# From user-server/
python -m unittest
# From ai-admin-dag-server/
python -m unittest test_sql_safety.py
# From ai-admin-dashboard/
npm run lint && npm run build
```
