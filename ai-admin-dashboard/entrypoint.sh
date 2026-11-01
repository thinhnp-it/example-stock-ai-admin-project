#!/bin/sh
set -eu

node <<'NODE'
const fs = require("node:fs");
const config = {
  AI_API_BASE_URL: process.env.PUBLIC_AI_API_BASE_URL ?? "",
  AUTH_API_BASE_URL: process.env.PUBLIC_AUTH_API_BASE_URL ?? "",
  DATA_API_BASE_URL: process.env.PUBLIC_DATA_API_BASE_URL ?? "",
  RAG_API_BASE_URL: process.env.PUBLIC_RAG_API_BASE_URL ?? "",
  DAG_API_BASE_URL: process.env.PUBLIC_DAG_API_BASE_URL ?? "",
  TAG_API_BASE_URL: process.env.PUBLIC_TAG_API_BASE_URL ?? "",
  API_BASE_URL: process.env.PUBLIC_API_BASE_URL ?? "",
};
fs.writeFileSync(
  "/app/public/runtime-config.js",
  `window.__AI_ADMIN_CONFIG__ = ${JSON.stringify(config)};\n`,
  { mode: 0o644 },
);
NODE

exec node server.js
