# Document RAG API (`ai-admin-rag-server`)

FastAPI service for uploading business documents, storing originals in S3-compatible object storage, indexing extracted text in Pinecone, and answering questions with retrieved context through OpenAI.

## Workflow and purpose

1. `POST /upload_file/` accepts PDF, XLSX, CSV, DOCX, HTML, or TXT files. Files must be non-empty and no larger than 20 MiB; the service sanitizes the filename and uploads the object to the configured bucket.
2. `POST /insert_file/` lists bucket objects, downloads supported files to temporary storage, extracts text, splits it into chunks, embeds it, and writes chunks with source metadata to Pinecone.
3. `POST /rag_query/` retrieves candidate chunks, optionally prioritizes referenced sources, reranks results, and asks OpenAI to answer from retrieved context and cite source names.
4. The response includes the answer and ordered unique `data_sources`.

`GET /list_files/` returns filenames and one-hour presigned URLs. `GET /get_users/` and `POST /add_user/` are auxiliary Supabase user-table endpoints, not the admin authentication store.

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_JWT_SECRET` | Yes | Shared HS256 secret used by the auth API; at least 32 bytes. |
| `CORS_ORIGINS` | No | Comma-separated allowed frontend origins; defaults to localhost ports 3000 and 3003. |
| `PINECONE_API_KEY` | Yes | Pinecone credential. |
| `PINECONE_INDEX_NAME` | Yes | Index name. Missing indexes are created as 1024 dimensions, cosine metric, AWS serverless in `us-east-1`; ensure embedding/index compatibility. |
| `SUPABASE_URL` | Yes | Supabase project URL for the auxiliary `users` table. |
| `SUPABASE_KEY` | Yes | Supabase key with only the permissions required by this service. |
| `AWS_ACCESS_KEY_ID` | Yes | S3-compatible storage access key. |
| `AWS_SECRET_ACCESS_KEY` | Yes | S3-compatible storage secret. |
| `S3_BUCKET_NAME` | Yes | Bucket used for source files. |
| `OPENAI_API_KEY` | Yes | OpenAI credential; query code currently selects `gpt-5-mini`. |

Illustrative values only:

```dotenv
AUTH_JWT_SECRET=replace-with-private-random-value-at-least-32-bytes
CORS_ORIGINS=http://localhost:3000
PINECONE_API_KEY=replace-me
PINECONE_INDEX_NAME=ai-admin-documents
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=replace-me
AWS_ACCESS_KEY_ID=replace-me
AWS_SECRET_ACCESS_KEY=replace-me
S3_BUCKET_NAME=your-private-bucket
OPENAI_API_KEY=replace-me
```

External clients initialize when the app is imported, so valid configuration is needed before starting the API.

## Run locally

From this directory:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env and verify S3, Supabase, Pinecone, and OpenAI access.
uvicorn main:app --reload --host 0.0.0.0 --port 8083
```

Suggested dashboard base URL: `http://localhost:8083`. Authenticated requests require a bearer JWT. `GET /healthz` is unauthenticated liveness, not dependency readiness.

## API

- `POST /upload_file/` — multipart field `file`.
- `POST /insert_file/` — index supported objects currently in the bucket.
- `GET /list_files/` — filenames and presigned URLs (expire after one hour).
- `POST /rag_query/` — JSON `{"text":"..."}`; returns `response` and `data_sources`.
- `GET /get_users/`, `POST /add_user/` — auxiliary Supabase user-table operations.
- `GET /healthz` — liveness probe.

## Docker

The image installs CPU-only PyTorch and may take longer/build larger than the other API images. Build from this directory and provide environment values at runtime:

```bash
docker build -t ai-admin-rag .
docker run --rm --name ai-admin-rag --env-file .env -p 8083:8000 ai-admin-rag
```

The container listens on port 8000 internally and runs as an unprivileged user. Keep documents private and restrict credentials to the required bucket/index/project. Presigned URLs grant temporary access to individual objects.

## Operational notes

- Indexing is explicit and may process all supported bucket files. Plan for processing time and avoid concurrent indexing without considering duplicate/re-index behavior.
- Extraction uses temporary container storage; provide sufficient memory and ephemeral disk.
- Uploads and indexed objects are limited to 20 MiB by the service.
- Retrieved content is untrusted input. Restrict the source corpus and apply appropriate access controls.
