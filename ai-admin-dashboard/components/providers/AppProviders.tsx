"use client";

import React from "react";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { env } from "@/lib/env";
import { getAntdLocale } from "@/lib/i18n";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/queryClient";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "dayjs/locale/en";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => makeQueryClient());

  React.useEffect(() => {
    const locale = env.DEFAULT_LOCALE;
    dayjs.locale(locale.toLowerCase().startsWith("vi") ? "vi" : "en");
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ConfigProvider
        locale={getAntdLocale(env.DEFAULT_LOCALE)}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            borderRadius: 14,
            colorBgContainer: "rgba(255,255,255,0.06)",
            colorBorder: "rgba(255,255,255,0.10)"
          }
        }}
      >
        {/* ✅ Add this */}
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>

      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}