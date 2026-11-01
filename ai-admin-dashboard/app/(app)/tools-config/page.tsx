"use client";

import React, { useState } from "react";
import { App, Button, Card, Form, Input, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { TagSite } from "@/lib/types";
import { tagApi } from "@/lib/apiClients";
import { apiError } from "@/lib/errors";

export default function ToolsConfigPage() {
  const { message, modal } = App.useApp(); // ✅ lấy modal từ context
  const [form] = Form.useForm<{ domain: string; label?: string }>();
  const [deleting, setDeleting] = useState<number | null>(null);

  const sitesQ = useQuery({
    queryKey: ["tag", "sites"],
    queryFn: async () => {
      const res = await tagApi.get<TagSite[]>("/tag/sites");
      return res.data || [];
    }
  });

  const addSiteM = useMutation({
    mutationFn: async (payload: { domain: string; label?: string }) => {
      const res = await tagApi.post<TagSite>("/tag/sites", payload);
      return res.data;
    },
    onSuccess: async () => {
      message.success("Added site ✅");
      form.resetFields();
      await sitesQ.refetch();
    },
    onError: (error: unknown) => {
      message.error(apiError(error, "Add site failed"));
    }
  });

  const deleteSiteM = useMutation({
    mutationFn: async (id: number) => {
      await tagApi.delete(`/tag/sites/${id}`);
      return true;
    },
    onSuccess: async () => {
      message.success("Deleted ✅");
      await sitesQ.refetch();
    },
    onError: (error: unknown) => {
      message.error(apiError(error, "Delete failed"));
    },
    onSettled: () => setDeleting(null)
  });

  function confirmDelete(site: TagSite) {
    modal.confirm({
      title: "Delete allowed site?",
      content: (
        <div>
          <Typography.Paragraph style={{ marginBottom: 6 }}>
            Bạn sắp xóa domain:
          </Typography.Paragraph>
          <Tag color="purple">{site.domain}</Tag>
        </div>
      ),
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        setDeleting(site.id);
        deleteSiteM.mutate(site.id);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Tools Config (TAG) — Allowed Websites
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Agent TAG chỉ được phép tìm kiếm trong danh sách website này (domain allowlist).
          Ví dụ: coindesk.com, cointelegraph.com…
        </Typography.Paragraph>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Add Website
        </Typography.Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => addSiteM.mutate(v)}
          style={{ maxWidth: 520 }}
        >
          <Form.Item
            name="domain"
            label="Domain"
            rules={[
              { required: true, message: "Nhập domain" },
              {
                pattern: /^[a-z0-9.-]+\.[a-z]{2,}$/i,
                message: "Domain không hợp lệ (vd: coindesk.com)"
              }
            ]}
          >
            <Input placeholder="coindesk.com" />
          </Form.Item>

          <Form.Item name="label" label="Label (optional)">
            <Input placeholder="CoinDesk" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={addSiteM.isPending}
            style={{ borderRadius: 12 }}
          >
            Add
          </Button>
        </Form>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <Typography.Title level={5} style={{ margin: 0 }}>
            Allowed Sites List
          </Typography.Title>
          <Button
            onClick={() => sitesQ.refetch()}
            loading={sitesQ.isFetching}
            style={{ borderRadius: 12 }}
          >
            Refresh
          </Button>
        </Space>

        <div style={{ marginTop: 12 }}>
          <Table<TagSite>
            rowKey="id"
            loading={sitesQ.isLoading}
            dataSource={sitesQ.data || []}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "Domain",
                dataIndex: "domain",
                render: (v) => <Tag color="purple">{v}</Tag>
              },
              { title: "Label", dataIndex: "label" },
              { title: "Created", dataIndex: "created_at", width: 220 },
              {
                title: "Action",
                width: 140,
                render: (_, r) => (
                  <Button
                    danger
                    onClick={() => confirmDelete(r)}
                    loading={deleting === r.id}
                    style={{ borderRadius: 12 }}
                  >
                    Delete
                  </Button>
                )
              }
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
