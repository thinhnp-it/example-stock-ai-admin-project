"use client";

import React from "react";
import { Avatar, Button, Dropdown, Input, Space, Typography } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/lib/auth/store";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function HeaderBar({
  collapsed,
  onToggle
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="h-full flex items-center justify-between gap-3">
      <Space size="middle" className="min-w-0">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={onToggle}
          className="!text-white"
        />
        <Input.Search
          placeholder="Search (demo)"
          className="w-[180px] md:w-[360px]"
          allowClear
          onSearch={(v) => {
            // simple demo search action
            if (v.trim().toLowerCase().includes("ai")) router.push("/ai-query");
            if (v.trim().toLowerCase().includes("data")) router.push("/data-management");
          }}
        />
      </Space>

      <Dropdown
        menu={{
          items: [
            {
              key: "settings",
              icon: <UserOutlined />,
              label: "Tài khoản",
              onClick: () => router.push("/settings")
            },
            {
              key: "logout",
              icon: <LogoutOutlined />,
              danger: true,
              label: "Đăng xuất",
              onClick: () => {
                logout();
                queryClient.clear();
                router.replace("/login");
              }
            }
          ]
        }}
        placement="bottomRight"
        trigger={["click"]}
      >
        <Button type="text" className="!text-white">
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <Typography.Text className="!text-white hidden md:inline">
              {user?.name ?? "Guest"}
            </Typography.Text>
          </Space>
        </Button>
      </Dropdown>
    </div>
  );
}
