"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, initAuthFromStorage } from "@/lib/auth/store";
import { fetchMe } from "@/lib/auth/service";
import { Button, Result, Spin } from "antd";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    const stored = initAuthFromStorage();
    if (!stored.token) {
      router.replace("/login");
      return;
    }
    fetchMe().then((user) => {
      if (!cancelled) {
        hydrate({ token: stored.token, user });
        setStatus("ready");
      }
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; };
  }, [hydrate, router, attempt]);

  if (status === "loading") return <div style={{ padding: 48, textAlign: "center" }}><Spin /></div>;
  if (status === "error") return <Result status="error" title="Không thể xác thực phiên" subTitle="Kiểm tra kết nối tới dịch vụ đăng nhập." extra={<Button onClick={() => { setStatus("loading"); setAttempt((n) => n + 1); }}>Thử lại</Button>} />;
  return <>{children}</>;
}
