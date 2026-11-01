"use client";

import React from "react";
import { Alert, Card, Descriptions, Typography } from "antd";
import { useAuthStore } from "@/lib/auth/store";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-4">
      <Typography.Title level={3}>Cài đặt</Typography.Title>
      <Card title="Tài khoản hiện tại">
        <Descriptions column={1} items={[
          { key: "name", label: "Tên", children: user?.name },
          { key: "email", label: "Email", children: user?.email },
          { key: "role", label: "Vai trò", children: user?.role },
        ]} />
      </Card>
      <Alert type="info" showIcon message="Thông tin tài khoản và cấu hình dịch vụ được quản lý tại backend, không lưu API key trên trình duyệt." />
    </div>
  );
}
