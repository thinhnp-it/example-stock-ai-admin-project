import axios from "axios";

export function apiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") return "Yêu cầu quá thời gian chờ.";
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
