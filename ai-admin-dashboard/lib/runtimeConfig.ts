export type RuntimeApiKey =
  | "AI_API_BASE_URL"
  | "AUTH_API_BASE_URL"
  | "DATA_API_BASE_URL"
  | "RAG_API_BASE_URL"
  | "DAG_API_BASE_URL"
  | "TAG_API_BASE_URL"
  | "API_BASE_URL";

type RuntimeConfig = Partial<Record<RuntimeApiKey, string>>;

declare global {
  interface Window {
    __AI_ADMIN_CONFIG__?: RuntimeConfig;
  }
}

export function getApiBaseUrl(
  key: RuntimeApiKey,
  buildTimeValue: string | undefined,
  fallback: string,
): string {
  if (typeof window !== "undefined") {
    const runtimeValue = window.__AI_ADMIN_CONFIG__?.[key];
    if (typeof runtimeValue === "string") return runtimeValue.trim();
  }

  return buildTimeValue?.trim() || fallback;
}
