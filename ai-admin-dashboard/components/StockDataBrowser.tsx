"use client";

import React, { useState } from "react";
import { Alert, App, Button, Card, DatePicker, Segmented, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import { dataApi } from "@/lib/apiClients";

type StockData = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  name: string;
};

const columns: ColumnsType<StockData> = [
  { title: "Date", dataIndex: "date", width: 120 },
  ...(["open", "high", "low", "close"] as const).map((name) => ({
    title: name.charAt(0).toUpperCase() + name.slice(1),
    dataIndex: name,
    width: 120,
    render: (value: number) => Number(value).toFixed(2),
  })),
  { title: "Volume", dataIndex: "volume", width: 160, render: (value: number) => Number(value).toLocaleString() },
];

export default function StockDataBrowser() {
  const { message } = App.useApp();
  const [symbol, setSymbol] = useState("tsla");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const start = range[0]?.format("YYYY-MM-DD");
  const end = range[1]?.format("YYYY-MM-DD");

  const symbols = useQuery({
    queryKey: ["stock", "symbols"],
    queryFn: async () => (await dataApi.get<string[]>("/stocks")).data,
  });
  const data = useQuery({
    queryKey: ["stock", "data", symbol, start, end],
    queryFn: async () => (await dataApi.get<StockData[]>(`/stocks/${symbol}`, {
      params: { start, end, limit: 365, order: "desc" },
    })).data,
    enabled: !!symbol,
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }} align="center">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>Stock Data Server</Typography.Title>
            <Typography.Text type="secondary">Dữ liệu OHLCV từ PostgreSQL theo từng symbol.</Typography.Text>
          </div>
          <Space wrap>
            <DatePicker.RangePicker allowEmpty={[true, true]} value={range}
              onChange={(value) => setRange([value?.[0] ?? null, value?.[1] ?? null])} />
            <Button onClick={() => { setRange([null, null]); message.success("Reset filters"); }}>Reset</Button>
          </Space>
        </Space>
        <div style={{ marginTop: 12 }}>
          <Segmented
            options={(symbols.data ?? []).map((item) => ({ label: item.toUpperCase(), value: item }))}
            value={symbol}
            onChange={(value) => setSymbol(String(value))}
            block
          />
        </div>
      </Card>
      {symbols.isError || data.isError ? <Alert type="error" showIcon message="Không thể tải dữ liệu từ Data Server." /> : null}
      <Card style={{ borderRadius: 16 }} loading={data.isLoading}>
        <Typography.Title level={5}>OHLCV Table</Typography.Title>
        <Table<StockData> rowKey={(row) => `${symbol}-${row.date}`} dataSource={data.data ?? []}
          columns={columns} pagination={{ pageSize: 12 }} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
