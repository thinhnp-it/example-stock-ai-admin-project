export const env = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000",
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "SmartBiz AI Admin",
  DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim() || "vi-VN"
} as const;
