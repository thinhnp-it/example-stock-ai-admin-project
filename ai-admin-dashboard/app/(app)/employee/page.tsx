"use client";

import React from "react";
import { Card, Typography, Select } from "antd";
import { EmployeeTable, Employee } from "@/components/hr/EmployeeTable";

const mockEmployees: Employee[] = [
  {
    id: "emp_01",
    name: "Nguyễn Văn An",
    email: "an@company.com",
    department: "Engineering",
    role: "Backend Engineer",
    status: "active",
    joined_at: "2024-02-10"
  },
  {
    id: "emp_02",
    name: "Trần Minh Châu",
    email: "chau@company.com",
    department: "AI Research",
    role: "ML Engineer",
    status: "active",
    joined_at: "2023-11-22"
  },
  {
    id: "emp_03",
    name: "Lê Hoàng Nam",
    email: "nam@company.com",
    department: "Sales",
    role: "Account Manager",
    status: "active",
    joined_at: "2022-09-01"
  },
  {
    id: "emp_04",
    name: "Phạm Thu Hà",
    email: "ha@company.com",
    department: "HR",
    role: "HR Manager",
    status: "inactive",
    joined_at: "2021-06-15"
  },
  {
    id: "emp_05",
    name: "Đỗ Quang Huy",
    email: "huy@company.com",
    department: "Finance",
    role: "Financial Analyst",
    status: "active",
    joined_at: "2023-01-12"
  }
];

export default function HRDashboardPage() {
  const [department, setDepartment] =
    React.useState<string>("all");

  const filtered =
    department === "all"
      ? mockEmployees
      : mockEmployees.filter(
          (e) => e.department === department
        );

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <Typography.Title level={3}>
          Quản lý nhân sự
        </Typography.Title>
        <Typography.Text type="secondary">
          Dữ liệu minh họa; trang này chưa kết nối hệ thống nhân sự.
        </Typography.Text>
      </div>

      {/* FILTER */}
      <Card>
        <div className="flex justify-between flex-wrap gap-3">
          <Typography.Title level={4}>
            Employee List
          </Typography.Title>

          <Select
            value={department}
            onChange={setDepartment}
            style={{ width: 220 }}
            options={[
              { value: "all", label: "All Departments" },
              { value: "Engineering", label: "Engineering" },
              { value: "AI Research", label: "AI Research" },
              { value: "Sales", label: "Sales" },
              { value: "HR", label: "HR" },
              { value: "Finance", label: "Finance" }
            ]}
          />
        </div>

        <EmployeeTable data={filtered} />
      </Card>
    </div>
  );
}
