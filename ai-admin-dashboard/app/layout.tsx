import "./globals.css";
import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Script from "next/script";
import { AppProviders } from "@/components/providers/AppProviders";
import { env } from "@/lib/env";

export const metadata = {
  title: env.APP_NAME,
  description: "Admin dashboard quản lý thông minh cho doanh nghiệp (DAG/RAG/TAG)"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={env.DEFAULT_LOCALE.startsWith("vi") ? "vi" : "en"}>
      <body>
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
