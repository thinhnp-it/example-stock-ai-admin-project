"use client";

import React from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

export type StructuredRow = {
  id: string;
  title: string;
  type: "file" | "record";
  created_at: string;
  status: "ready" | "indexing" | "failed";
};

export function DataTable({
  rows,
  loading
}: {
  rows: StructuredRow[];
  loading?: boolean;
}) {
  const columns: ColumnsType<StructuredRow> = [
    { title: "ID", dataIndex: "id", width: 160, ellipsis: true },
    { title: "Title", dataIndex: "title", ellipsis: true },
    { title: "Type", dataIndex: "type", width: 120, render: (v) => <Tag>{v}</Tag> },
    { title: "Created", dataIndex: "created_at", width: 180 },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      render: (v) => {
        const color = v === "ready" ? "green" : v === "indexing" ? "blue" : "red";
        return <Tag color={color}>{v}</Tag>;
      }
    }
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={{ pageSize: 8 }}
    />
  );
}
