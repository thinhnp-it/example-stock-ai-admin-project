"use client";

import React from "react";
import { Layout } from "antd";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { HeaderBar } from "@/components/layout/HeaderBar";

const { Sider, Header, Content } = Layout;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        breakpoint="lg"
        // className="!bg-[rgba(0,0,0,0.20)]"
        style={{
    height: "100vh",
    position: "sticky",
    top: 0,
    left: 0
  }}
      >
        <SidebarNav collapsed={collapsed} />
      </Sider>

      <Layout>
        <Header className="!px-4 md:!px-6 !h-[64px] !leading-[64px]">
          <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </Header>

        <Content className="p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto space-y-8">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
