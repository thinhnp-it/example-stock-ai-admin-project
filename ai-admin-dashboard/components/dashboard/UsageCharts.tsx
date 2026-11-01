"use client";

import React from "react";
import { Card, Col, Row, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/* ---------- COLOR SYSTEM ---------- */

const COLORS = {
  ai: "#3b82f6",   // blue
  rag: "#10b981",  // green
  dag: "#a855f7",  // purple
  tag: "#f59e0b"   // orange
};

type ReportPayload = {
  labels: string[];
  aiQueries: number[];
  rag: number[];
  dag: number[];
  tag: number[];
};

const mock: ReportPayload = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  aiQueries: [120, 140, 90, 180, 160],
  rag: [80, 100, 55, 120, 110],
  dag: [35, 40, 25, 55, 50],
  tag: [20, 25, 18, 40, 36]
};

export function UsageCharts() {
  const q = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get("/reports");
      return res.data as ReportPayload;
    },
    placeholderData: mock
  });

  const data = q.data ?? mock;

  /* ---------- LINE TREND ---------- */

  const lineData = {
    labels: data.labels,
    datasets: [
      {
        label: "AI Queries",
        data: data.aiQueries,
        borderColor: COLORS.ai,
        backgroundColor: "rgba(59,130,246,0.15)",
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: COLORS.ai
      }
    ]
  };

  /* ---------- DOUGHNUT ---------- */

  const doughnutData = {
    labels: ["RAG", "DAG", "TAG"],
    datasets: [
      {
        data: [
          data.rag.reduce((a, b) => a + b, 0),
          data.dag.reduce((a, b) => a + b, 0),
          data.tag.reduce((a, b) => a + b, 0)
        ],
        backgroundColor: [
          COLORS.rag,
          COLORS.dag,
          COLORS.tag
        ],
        borderWidth: 0
      }
    ]
  };

  return (
    <Row gutter={[24, 24]}>
      {/* TREND */}
      <Col xs={24} lg={14}>
        <Card size="small">
          <Typography.Text strong>
            AI Usage Trend
          </Typography.Text>

          <div style={{ height: 170 }}>
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  x: {
                    grid: { display: false }
                  },
                  y: {
                    grid: {
                      color: "rgba(255,255,255,0.05)"
                    }
                  }
                }
              }}
            />
          </div>
        </Card>
      </Col>

      {/* RATIO */}
      <Col xs={24} lg={10}>
        <Card size="small">
          <Typography.Text strong>
            DAG / RAG / TAG Ratio
          </Typography.Text>

          <div style={{ height: 170 }}>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom"
                  }
                },
                cutout: "65%"
              }}
            />
          </div>
        </Card>
      </Col>
    </Row>
  );
}
