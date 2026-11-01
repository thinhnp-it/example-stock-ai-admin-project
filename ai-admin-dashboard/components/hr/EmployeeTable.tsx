"use client";

import React from "react";
import { Table, Tag, Avatar, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { UserOutlined } from "@ant-design/icons";

export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "active" | "inactive";
  joined_at: string;
};

export function EmployeeTable({
  data,
  loading
}: {
  data: Employee[];
  loading?: boolean;
}) {
  const columns: ColumnsType<Employee> = [
    {
      title: "Employee",
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div>{r.name}</div>
            <div className="text-xs opacity-70">{r.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: "Department",
      dataIndex: "department"
    },
    {
      title: "Role",
      dataIndex: "role"
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => (
        <Tag color={v === "active" ? "green" : "red"}>
          {v}
        </Tag>
      )
    },
    {
      title: "Joined",
      dataIndex: "joined_at"
    }
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{ pageSize: 6 }}
    />
  );
}