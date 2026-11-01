"use client";

import React, { useMemo, useState } from "react";
import { Alert, Card, Col, Row, Select, DatePicker, Typography, Statistic, Spin, App } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/apiClients";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type StockRow = {
  date: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  name: string;
};

type StockSummary = {
  symbol: string;
  name?: string | null;
  start?: string | null;
  end?: string | null;
  latest_date?: string | null;
  latest_close: number;
  change_pct: number;
  avg_volume: number;
  high: number;
  low: number;
  points: number;
};

const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const { message } = App.useApp();

  const [symbol, setSymbol] = useState<string>("tsla");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(180, "day"), dayjs()]);

  // 1) symbols
  const symbolsQ = useQuery({
    queryKey: ["dataServer-symbols"],
    queryFn: async () => {
      const res = await dataApi.get<string[]>("/stocks");
      return res.data;
    }
  });

  // 2) summary (KPI)
  const summaryQ = useQuery({
    queryKey: ["dataServer-summary", symbol, range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")],
    queryFn: async () => {
      const res = await dataApi.get<StockSummary>(`/stocks/${symbol}/summary`, {
        params: {
          start: range[0].format("YYYY-MM-DD"),
          end: range[1].format("YYYY-MM-DD"),
          limit: 2000
        }
      });
      return res.data;
    },
    enabled: !!symbol
  });

  // 3) series data for charts
  const stockQ = useQuery({
    queryKey: ["dataServer-stock", symbol, range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD")],
    queryFn: async () => {
      const res = await dataApi.get<StockRow[]>(`/stocks/${symbol}`, {
        params: {
          start: range[0].format("YYYY-MM-DD"),
          end: range[1].format("YYYY-MM-DD"),
          order: "asc",
          limit: 2000
        }
      });
      return res.data;
    },
    enabled: !!symbol
  });

  const rows = useMemo(() => stockQ.data ?? [], [stockQ.data]);
  const summary = summaryQ.data;

  // const closeLine = useMemo(() => {
  //   return {
  //     labels: rows.map((r) => r.date),
  //     datasets: [
  //       {
  //         label: `${symbol.toUpperCase()} Close`,
  //         data: rows.map((r) => r.close),
  //         tension: 0.25,
  //         pointRadius: 0
  //       }
  //     ]
  //   };
  // }, [rows, symbol]);
  const closeLine = useMemo(() => {
    return {
      labels: rows.map((r) => r.date),
      datasets: [
        {
          label: `${symbol.toUpperCase()} Close`,
          data: rows.map((r) => r.close),

          borderColor: "#1677ff",
          backgroundColor: "rgba(22,119,255,0.15)",

          fill: true,
          tension: 0.35,

          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,

          pointBackgroundColor: "#1677ff"
        }
      ]
    };
  }, [rows, symbol]);

  const volumeBar = useMemo(() => {
    return {
      labels: rows.map((r) => r.date),
      datasets: [
        {
          label: `${symbol.toUpperCase()} Volume`,
          data: rows.map((r) => r.volume),

          backgroundColor: "rgba(82,196,26,0.6)",
          borderColor: "#52c41a",
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: "#389e0d"
        }
      ]
    };
  }, [rows, symbol]);

  const loading = symbolsQ.isLoading || summaryQ.isLoading || stockQ.isLoading;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Tổng quan • Stock Dashboard
            </Typography.Title>
            <Typography.Text type="secondary">
              Data Server: {process.env.NEXT_PUBLIC_DATA_API_BASE_URL}
            </Typography.Text>
          </Col>

          <Col xs={24} md={8}>
            <Typography.Text strong>Symbol</Typography.Text>
            <div style={{ marginTop: 6 }}>
              <Select
                style={{ width: "100%" }}
                value={symbol}
                loading={symbolsQ.isLoading}
                options={(symbolsQ.data ?? []).map((s) => ({ value: s, label: s.toUpperCase() }))}
                onChange={(v) => setSymbol(v)}
              />
            </div>
          </Col>

          <Col xs={24} md={8}>
            <Typography.Text strong>Date range</Typography.Text>
            <div style={{ marginTop: 6 }}>
              <RangePicker
                style={{ width: "100%" }}
                value={range}
                allowClear={false}
                onChange={(v) => {
                  if (!v?.[0] || !v?.[1]) return;
                  if (v[0].isAfter(v[1])) {
                    message.error("Khoảng thời gian không hợp lệ");
                    return;
                  }
                  setRange([v[0], v[1]]);
                }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {symbolsQ.isError || summaryQ.isError || stockQ.isError ? (
        <Alert type="error" showIcon message="Không thể tải dữ liệu chứng khoán. Kiểm tra Data Server và kết nối." />
      ) : null}

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", height: 260 }}>
          <Spin size="large" />
        </div>
      ) : symbolsQ.isError || summaryQ.isError || stockQ.isError ? null : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic title="Latest Close" value={summary?.latest_close ?? 0} precision={2} />
                <Typography.Text type="secondary">
                  {summary?.latest_date ? `Date: ${summary.latest_date}` : ""}
                </Typography.Text>
              </Card>
            </Col>

            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic title="Change %" value={summary?.change_pct ?? 0} precision={2} suffix="%" />
                <Typography.Text type="secondary">Range-based</Typography.Text>
              </Card>
            </Col>

            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic title="Avg Volume" value={summary?.avg_volume ?? 0} />
                <Typography.Text type="secondary">Points: {summary?.points ?? 0}</Typography.Text>
              </Card>
            </Col>

            <Col xs={24} md={6}>
              <Card style={{ borderRadius: 16 }}>
                <Statistic
                  title="High / Low"
                  value={`${(summary?.high ?? 0).toFixed(2)} / ${(summary?.low ?? 0).toFixed(2)}`}
                />
                <Typography.Text type="secondary">{summary?.name ?? ""}</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card style={{ borderRadius: 16 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  Close Price
                </Typography.Title>
                <div style={{ height: 360 }}>
                  <Line
                    data={closeLine}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,

                      interaction: {
                        mode: "index",
                        intersect: false
                      },

                      plugins: {
                        legend: {
                          display: true,
                          position: "top"
                        },
                        tooltip: {
                          backgroundColor: "#1f1f1f",
                          padding: 10
                        }
                      },

                      scales: {
                        x: {
                          grid: {
                            display: false
                          }
                        },
                        y: {
                          grid: {
                            color: "rgba(0,0,0,0.06)"
                          }
                        }
                      }
                    }}
                  />
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card style={{ borderRadius: 16 }}>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  Volume
                </Typography.Title>
                <div style={{ height: 360 }}>
                  <Bar
                    data={volumeBar}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,

                      plugins: {
                        legend: {
                          display: true
                        }
                      },

                      scales: {
                        x: {
                          grid: { display: false }
                        },
                        y: {
                          grid: {
                            color: "rgba(0,0,0,0.05)"
                          }
                        }
                      }
                    }}
                  />
                </div>
              </Card>
            </Col>
          </Row>

          {rows.length === 0 ? (
            <Card style={{ borderRadius: 16 }}>
              <Typography.Text type="secondary">
                Không có dữ liệu trong khoảng thời gian đã chọn.
              </Typography.Text>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
