import { authApi } from "@/lib/apiClients";
import type { LoginInput, User } from "@/lib/auth/types";

export async function login(input: LoginInput): Promise<{
  token: string;
  user: User;
}> {
  const res = await authApi.post("/auth/login", input);
  const token = res.data?.access_token as string;
  const user = res.data?.user as User;
  if (!token || !user) {
    throw new Error("Phản hồi login không hợp lệ từ backend");
  }
  return { token, user };
}

export async function fetchMe(): Promise<User> {
  const res = await authApi.get("/auth/me");
  return res.data as User;
}
