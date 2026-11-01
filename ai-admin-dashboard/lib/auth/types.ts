export type User = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthState = {
  user: User | null;
  token: string | null;
};
