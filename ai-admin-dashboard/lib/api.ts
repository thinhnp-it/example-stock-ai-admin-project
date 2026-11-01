import axios from "axios";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/auth/token";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

export const api = axios.create({
  baseURL: getApiBaseUrl("API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL, env.API_BASE_URL),
  timeout: 30_000
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
