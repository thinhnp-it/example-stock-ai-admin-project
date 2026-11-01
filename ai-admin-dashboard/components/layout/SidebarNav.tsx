"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import {
  DashboardOutlined,
  DatabaseOutlined,
  ToolOutlined,
  TeamOutlined,
  SettingOutlined,
  RobotOutlined
} from "@ant-design/icons";
import { t } from "@/lib/i18n";

export function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  const items = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">{t("nav.dashboard")}</Link>
    },
    {
      key: "/data-management",
      icon: <DatabaseOutlined />,
      label: <Link href="/data-management">{t("nav.data")}</Link>
    },
    {
      key: "/ai-query",
      icon: <RobotOutlined />,
      label: <Link href="/ai-query">{t("nav.aiQuery")}</Link>
    },
    {
      key: "/tools-config",
      icon: <ToolOutlined />,
      label: <Link href="/tools-config">{t("nav.tools")}</Link>
    },
    {
      key: "/employee",
      icon: <TeamOutlined />,
      label: <Link href="/employee">{t("nav.employee")}</Link>
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: <Link href="/settings">{t("nav.settings")}</Link>
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="px-4 pt-5 pb-3">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              {/* <MessageOutlined className="opacity-80" /> */}
              <div className="brand-logo">Cybersoft FinAgent</div>
            </div>
            <div className="brand-sub">DAG • RAG • TAG Admin</div>
          </>
        ) : (
          <div className="px-2 py-1 text-lg font-bold">AI</div>
        )}
      </div>

      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[pathname ?? "/dashboard"]}
        items={items}
        className="flex-1"
      />

      {!collapsed ? (
        <div className="p-4 text-xs opacity-70">
          Tip: <kbd>Ctrl</kbd> + <kbd>K</kbd> để search nhanh (demo).
        </div>
      ) : null}
    </div>
  );
}
