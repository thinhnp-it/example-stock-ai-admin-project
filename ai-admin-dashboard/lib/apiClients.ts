import axios from "axios";
// import { getToken, clearToken } from "./auth";
import { getAccessToken, clearAccessToken } from "@/lib/auth/token";
import { getApiBaseUrl } from "@/lib/runtimeConfig";

function makeClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    timeout: 30_000
  });

  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401 && !err?.config?.url?.includes("/auth/login")) {
        clearAccessToken();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const aiApi = makeClient(
  getApiBaseUrl("AI_API_BASE_URL", process.env.NEXT_PUBLIC_AI_API_BASE_URL, "http://localhost:8001")
);

export const authApi = makeClient(
  getApiBaseUrl("AUTH_API_BASE_URL", process.env.NEXT_PUBLIC_AUTH_API_BASE_URL, "http://localhost:8002")
);

export const dataApi = makeClient(
  getApiBaseUrl("DATA_API_BASE_URL", process.env.NEXT_PUBLIC_DATA_SERVER, "http://localhost:8080")
);

export const ragApi = makeClient(
  getApiBaseUrl("RAG_API_BASE_URL", process.env.NEXT_PUBLIC_RAG_API, "http://localhost:8081")
);

export const dagApi = makeClient(
  getApiBaseUrl("DAG_API_BASE_URL", process.env.NEXT_PUBLIC_DAG_API, "http://localhost:8082")
);

export const tagApi = makeClient(
  getApiBaseUrl("TAG_API_BASE_URL", process.env.NEXT_PUBLIC_TAG_API, "http://localhost:8083")
);
