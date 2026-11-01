"use client";

import React from "react";
import { Button, Card, Form, Input, Typography, Alert } from "antd";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth/service";
import { useAuthStore } from "@/lib/auth/store";
import { apiError } from "@/lib/errors";

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="mb-4">
          <Title level={3} style={{ marginBottom: 0 }}>
            Đăng nhập
          </Title>
          <Text type="secondary">Đăng nhập bằng tài khoản quản trị đã cấu hình.</Text>
        </div>

        {error ? (
          <Alert className="mb-3" type="error" title={error} showIcon />
        ) : null}
        <Form
          layout="vertical"
          onFinish={async (values) => {
            setError(null);
            setLoading(true);
            try {
              const res = await login(values);
              setSession({ token: res.token, user: res.user });
              router.replace("/dashboard");
            } catch (error: unknown) {
              setError(apiError(error, "Không thể đăng nhập"));
            } finally {
              setLoading(false);
            }
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email không hợp lệ" }
            ]}
          >
            <Input placeholder="you@company.com" autoComplete="email" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            Login
          </Button>

        </Form>
      </Card>
    </div>
  );
}
