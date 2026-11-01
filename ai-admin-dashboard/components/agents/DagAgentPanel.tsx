"use client";

import React, { useState } from "react";
import { App, Button, Card, Divider, Form, Input, Space, Typography } from "antd";
import { CodeOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { dagApi } from "@/lib/apiClients";
import { apiError } from "@/lib/errors";

type DagResponse = {
  query_result: string;
  sql_query: string;
};

export default function DagAgentPanel() {
  const { message } = App.useApp();
  const [result, setResult] = useState<DagResponse | null>(null);

  const runM = useMutation({
    mutationFn: async (question: string) => {
      const res = await dagApi.post<DagResponse>(
        "/query-database",
        { question },
        { timeout: 180_000 }
      );
      return res.data;
    },
    onSuccess: (data) => setResult(data),
    onError: (error: unknown) => message.error(apiError(error, "DAG query failed"))
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(120deg, rgba(80,160,255,0.16), rgba(255,255,255,1))"
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Truy vấn dữ liệu tự động
        </Typography.Title>
        <Typography.Text type="secondary">
          Bạn đặt câu hỏi → Agent chuyển thành SQL → Agent truy vấn dữ liệu tự động → Tóm tắt kết quả
        </Typography.Text>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Form<{ question: string }> layout="vertical" onFinish={(v) => runM.mutate(v.question)}>
          <Form.Item
            label="Business Question"
            name="question"
            rules={[{ required: true, message: "Nhập câu hỏi" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="VD: Doanh thu theo tháng trong 6 tháng gần nhất? Nhóm khách hàng nào mua nhiều nhất?"
            />
          </Form.Item>

          <Space wrap>
            <Button
              type="primary"
              htmlType="submit"
              loading={runM.isPending}
              style={{ borderRadius: 12 }}
            >
              Run DAG Query
            </Button>
            <Button
              icon={<CodeOutlined />}
              onClick={() =>
                message.info("Tip: hỏi rõ thời gian, metric, và nhóm để SQL generate chuẩn hơn.")
              }
              style={{ borderRadius: 12 }}
            >
              Tips
            </Button>
          </Space>
        </Form>

        {result ? (
          <>
            <Divider />
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              SQL Generated
            </Typography.Title>
            <Card style={{ borderRadius: 12, background: "#0b1220" }}>
              <Typography.Text style={{ color: "#d1e7ff", whiteSpace: "pre-wrap" }}>
                {result.sql_query || "(empty)"}
              </Typography.Text>
            </Card>

            <Divider />
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Query Result
            </Typography.Title>
            <Card style={{ borderRadius: 12 }}>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {typeof result.query_result === "string"
                  ? result.query_result
                  : JSON.stringify(result.query_result, null, 2)}
              </pre>
            </Card>
          </>
        ) : null}
      </Card>
    </div>
  );
}
