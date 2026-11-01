"use client";

import React from "react";
import { Card, Statistic } from "antd";

export function MetricsCard({
  title,
  value,
  suffix,
  prefix,
  hint
}: {
  title: string;
  value: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="h-full flex flex-col justify-between p-2">
      <div className="flex items-start justify-between gap-3">
        <Statistic title={title} value={value} prefix={prefix} suffix={suffix} />
      </div>
      {hint ? <div className="mt-2 text-xs opacity-70">{hint}</div> : null}
    </Card>
  );
}
