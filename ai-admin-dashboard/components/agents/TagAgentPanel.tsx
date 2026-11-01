"use client";

import React, { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  Space,
  Tag,
  Typography
} from "antd";
import { LinkOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { tagApi } from "@/lib/apiClients";
import type { TagQueryResponse, TagSite } from "@/lib/types";
import { apiError } from "@/lib/errors";

export default function TagAgentPanel() {
  const { message } = App.useApp();
  const [resp, setResp] = useState<TagQueryResponse | null>(null);

  // Allowed sites configured in Tools (TAG)
  const sitesQ = useQuery({
    queryKey: ["tag", "sites"],
    queryFn: async () => {
      const res = await tagApi.get<TagSite[]>("/tag/sites");
      return res.data || [];
    }
  });

  const domains = useMemo(
    () => (sitesQ.data || []).map((s) => s.domain),
    [sitesQ.data]
  );

  const runM = useMutation({
    mutationFn: async (question: string) => {
      const res = await tagApi.post<TagQueryResponse>(
        "/tag/query",
        {
          question,
          max_results: 5,
          max_pages_to_read: 3
        },
        { timeout: 180_000 }
      );
      return res.data;
    },
    onSuccess: (data) => setResp(data),
    onError: (error: unknown) => message.error(apiError(error, "TAG query failed"))
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <Card
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(120deg, rgba(170,80,255,0.16), rgba(255,255,255,1))"
        }}
      >
        <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Tìm kiếm thông tin tài chính
            </Typography.Title>
            <Typography.Text type="secondary">
              Web Research Agent: search + read + synthesize (chỉ trong allowed sites).
            </Typography.Text>
          </div>

          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => sitesQ.refetch()}
              loading={sitesQ.isFetching}
              style={{ borderRadius: 12 }}
            >
              Refresh sites
            </Button>
          </Space>
        </Flex>

        <div style={{ marginTop: 10 }}>
          <Space wrap>
            <Tag color="purple">web-search</Tag>
            <Tag color="purple">domain-allowlist</Tag>
            <Tag color="purple">citations</Tag>
          </Space>
        </div>
      </Card>

      {/* Allowed sites */}
      <Card style={{ borderRadius: 16 }}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={10}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Allowed Sites
          </Typography.Title>

          <Typography.Link href="/tools-config">
            Manage in Tools Config →
          </Typography.Link>
        </Flex>

        <Divider style={{ margin: "12px 0" }} />

        {sitesQ.isLoading ? (
          <Typography.Text type="secondary">Loading…</Typography.Text>
        ) : domains.length ? (
          <Flex wrap gap={8}>
            {domains.map((d) => (
              <Tag key={d} color="purple">
                {d}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">
            Chưa có domain nào. Vào trang Tools Config (TAG) để thêm domain trước.
          </Typography.Text>
        )}
      </Card>

      {/* Query */}
      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Ask TAG (Web Search)
        </Typography.Title>

        <Form<{ question: string }> layout="vertical" onFinish={(v) => runM.mutate(v.question)}>
          <Form.Item
            label="Question"
            name="question"
            rules={[{ required: true, message: "Nhập câu hỏi" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="VD: Hôm nay có tin gì mới về Bitcoin ETF? (Agent sẽ search trong allowed domains)"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            icon={<SearchOutlined />}
            loading={runM.isPending}
            disabled={!domains.length}
            style={{ borderRadius: 12 }}
          >
            Run TAG Query
          </Button>

          {!domains.length ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
              Bạn cần cấu hình ít nhất 1 domain trong Tools Config (TAG) trước khi query.
            </Typography.Paragraph>
          ) : null}
        </Form>

        {/* Output */}
        {resp ? (
          <>
            <Divider />

            {/* Answer */}
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Answer
            </Typography.Title>
            <Card style={{ borderRadius: 12 }}>
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                {resp.answer}
              </Typography.Paragraph>
            </Card>

            <Divider />

            {/* Sources */}
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Sources
            </Typography.Title>

            <Flex vertical gap={8}>
              {(resp.sources || []).map((url) => (
                <Card
                  key={url}
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 12
                  }}
                  styles={{
                    body: {
                      padding: "10px 14px"
                    }
                  }}
                >
                  <Flex align="center" justify="space-between" gap={12}>
                    <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                      <LinkOutlined />

                      <Typography.Link
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ wordBreak: "break-all" }}
                      >
                        {url}
                      </Typography.Link>
                    </Flex>

                    <Tag color="purple">source</Tag>
                  </Flex>
                </Card>
              ))}
            </Flex>

            <Divider />

            {/* Used domains */}
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Used Domains
            </Typography.Title>
            <Flex wrap gap={8}>
              {(resp.used_domains || []).map((d) => (
                <Tag key={d} color="geekblue">
                  {d}
                </Tag>
              ))}
            </Flex>
          </>
        ) : null}
      </Card>
    </div>
  );
}
