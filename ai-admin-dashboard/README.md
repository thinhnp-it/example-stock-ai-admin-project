# AI Admin Dashboard (`ai-admin-dashboard`)

Next.js/React frontend for the AI Admin platform. It provides the administrator login, stock dashboard, and user interfaces for the RAG and DAG agents. It calls backend services directly from the browser; it is not an API proxy.

See the [workspace overview](../README.md) and [full architecture and deployment guide](../Architecture.md) for the service topology and integrated setup.

## Purpose and workflow

1. The user signs in through `user-server` using the configured administrator account.
2. The frontend stores the returned JWT and calls `/auth/me` to confirm the session.
3. API clients attach the token as `Authorization: Bearer <token>` to protected backend requests. A `401` clears the token and redirects to login.
4. The dashboard fetches stock symbols, time series, and summaries from the data API. The AI Query page provides separate RAG and DAG panels that call their respective APIs.

The HR page currently contains illustrative data. The frontend also includes AI/TAG clients, but this workspace has no matching AI or TAG backend service; configure those URLs only when a compatible backend is available.

## Environment variables

For local development, create `.env.local` from `.env.example`. Its URLs must be reachable from the user's browser. For the container deployment, the entrypoint writes `/runtime-config.js` from `PUBLIC_*_BASE_URL` values at container startup, so the same image can use different endpoints in different environments. All frontend URL variables are browser-visible and must never contain secrets.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_AUTH_API_BASE_URL` | Yes for login | Auth API base URL. Example: `http://localhost:8002`. |
| `NEXT_PUBLIC_DATA_SERVER` | Yes for stock dashboard | Stock API base URL. Example: `http://localhost:8009`. |
| `NEXT_PUBLIC_RAG_API` | For RAG | RAG API base URL. Example: `http://localhost:8083`. |
| `NEXT_PUBLIC_DAG_API` | For DAG | DAG API base URL. Example: `http://localhost:8084`. |
| `NEXT_PUBLIC_TAG_API` | Optional | TAG API URL; example template uses port 8085, but no TAG backend is included in this workspace. |
| `NEXT_PUBLIC_APP_NAME` | No | Displayed app name; example template uses `GOLD AI Console`. |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | No | Default locale; example template uses `vi`. |
| `NEXT_PUBLIC_AI_API_BASE_URL` | Optional client | Legacy/alternate AI API client URL; code fallback is `http://localhost:8001`. Not present in `.env.example` or the current Docker build arguments. |
| `NEXT_PUBLIC_API_BASE_URL` | Optional client | Generic API client URL; code fallback is `http://localhost:8000`. Not present in `.env.example` or the current Docker build arguments. |

Container runtime URL variables (Compose): `PUBLIC_AUTH_API_BASE_URL`, `PUBLIC_DATA_API_BASE_URL`, `PUBLIC_RAG_API_BASE_URL`, `PUBLIC_DAG_API_BASE_URL`, `PUBLIC_TAG_API_BASE_URL`, `PUBLIC_AI_API_BASE_URL`, and `PUBLIC_API_BASE_URL`. Empty values select same-origin API paths through Caddy. These are configuration values, not credentials.

Example matching the current `.env.example`:

```dotenv
NEXT_PUBLIC_AUTH_API_BASE_URL=http://localhost:8002
NEXT_PUBLIC_DATA_SERVER=http://localhost:8009
NEXT_PUBLIC_RAG_API=http://localhost:8083
NEXT_PUBLIC_DAG_API=http://localhost:8084
NEXT_PUBLIC_TAG_API=http://localhost:8085
NEXT_PUBLIC_APP_NAME=GOLD AI Console
NEXT_PUBLIC_DEFAULT_LOCALE=vi
```

Each protected backend must use the same `AUTH_JWT_SECRET` as the auth service. That secret belongs only in backend configuration and must not be added to `.env.local` or any `NEXT_PUBLIC_*` variable. Configure backend CORS to allow the exact origin serving this dashboard.

## Run locally

Prerequisites: Node.js 22 and npm. From this directory:

```bash
npm ci
cp .env.example .env.local
# Edit .env.local if the backend URLs differ from the local example.
npm run dev
```

The development server is normally available at `http://localhost:3000`. Start the auth service and any backend used by the page/agent before making requests. See the [auth](../user-server/README.md), [stock data](../ai-admin-data-server/README.md), [RAG](../ai-admin-rag-server/README.md), and [DAG](../ai-admin-dag-server/README.md) service guides.

## Checks and production build

```bash
npm run lint
npm run build
npm start
```

`npm start` serves the production build. For the container build, `next.config.ts` enables standalone output.

## Docker

For an integrated local or single-VM deployment, use the workspace Compose stack from the project root:

```bash
cp .env.compose.example .env
cp user-server/.env.example user-server/.env
cp ai-admin-data-server/.env.example ai-admin-data-server/.env
cp ai-admin-rag-server/.env.example ai-admin-rag-server/.env
cp ai-admin-dag-server/.env.example ai-admin-dag-server/.env
# Configure the service .env files, then from the workspace root:
docker compose config
docker compose up --build -d
```

The dashboard image is a Node 22 multi-stage standalone build and runs as the non-root `node` user on port 3000. At container startup, the entrypoint writes `/runtime-config.js` from the `PUBLIC_*_BASE_URL` environment variables. Leave them empty to use same-origin API paths through Caddy, or provide browser-reachable base URLs when deploying with a different proxy. These values are public, not secrets. The root Compose file handles Caddy routing and publishes ports 80/443; see the [architecture guide](../Architecture.md) for VM/TLS setup and operations.

## Security and scope notes

- There is no login bypass; use the administrator configured in `user-server`.
- Do not put credentials, JWT signing secrets, or provider keys into frontend environment variables.
- Browser-to-API calls require correctly configured CORS and TLS in production.
- The employee/HR screen is demo data and is not connected to an HR backend.


## Note for Vietnamese

Next.js/React frontend cho hệ thống DAG, RAG và TAG. Xem [hướng dẫn cấu hình và vận hành toàn hệ thống](../README.md) trước khi chạy.

1. `npm ci`
2. Tạo `.env.local` từ `.env.example`; dùng địa chỉ mà trình duyệt truy cập được.
3. Khởi động các backend đã cấu hình xác thực, sau đó chạy `npm run dev`.
4. Kiểm tra bằng `npm run lint` và `npm run build`.

Frontend không còn tài khoản bypass. Đăng nhập dùng tài khoản đã cấu hình ở `user_server`. Trang nhân sự hiện là dữ liệu minh họa, chưa kết nối hệ thống HR.
