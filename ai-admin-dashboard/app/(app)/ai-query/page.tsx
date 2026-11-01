"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Segmented, Space, Switch, Typography } from "antd";
import RagAgentPanel from "@/components/agents/RagAgentPanel";
import DagAgentPanel from "@/components/agents/DagAgentPanel";
import TagAgentPanel from "@/components/agents/TagAgentPanel";

type AgentKey = "RAG" | "DAG" | "TAG";

export default function AiQueryPage() {
  const [enabled, setEnabled] = useState<Record<AgentKey, boolean>>({
    RAG: true,
    DAG: false,
    TAG: false
  });

  const enabledKeys = (Object.keys(enabled) as AgentKey[]).filter((k) => enabled[k]);
  const [active, setActive] = useState<AgentKey>("RAG");

  useEffect(() => {
    if (!enabled[active]) {
      setActive(enabledKeys[0] || "RAG");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled.RAG, enabled.DAG, enabled.TAG]);

  const toggleBar = useMemo(() => {
    const onToggle = (k: AgentKey, v: boolean) => {
      setEnabled((prev) => ({ ...prev, [k]: v }));
      if (v) setActive(k);
    };

    return (
      <Card style={{ borderRadius: 16 }}>
        <Space wrap style={{ justifyContent: "space-between", width: "100%" }} align="center">
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              AI Query
            </Typography.Title>
            <Typography.Text type="secondary">
              Bật agent nào thì UI agent đó sẽ xuất hiện. Chuyển agent bằng tab.
            </Typography.Text>
          </div>

          <Space wrap>
            <Space>
              <Typography.Text strong>Hỏi đáp tài liệu thông tư tài chính</Typography.Text>
              <Switch checked={enabled.RAG} onChange={(v) => onToggle("RAG", v)} />
            </Space>
            <Space>
              <Typography.Text strong>Truy vấn dữ liệu tự động</Typography.Text>
              <Switch checked={enabled.DAG} onChange={(v) => onToggle("DAG", v)} />
            </Space>
            <Space>
              <Typography.Text strong>Tìm kiếm thông tin tài chính</Typography.Text>
              <Switch checked={enabled.TAG} onChange={(v) => onToggle("TAG", v)} />
            </Space>
          </Space>
        </Space>

        <div style={{ marginTop: 12 }}>
          <Segmented<AgentKey>
            options={enabledKeys.length ? enabledKeys : (["RAG"] as AgentKey[])}
            value={active}
            onChange={(v) => setActive(v)}
            block
          />
        </div>
      </Card>
    );
  }, [active, enabled, enabledKeys]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {toggleBar}

      {enabled[active] ? (
        <>
          {active === "RAG" ? <RagAgentPanel /> : null}
          {active === "DAG" ? <DagAgentPanel /> : null}
          {active === "TAG" ? <TagAgentPanel /> : null}
        </>
      ) : (
        <Card style={{ borderRadius: 16 }}>
          <Typography.Text type="secondary">Bạn đang tắt hết agent. Bật RAG/DAG/TAG để bắt đầu.</Typography.Text>
        </Card>
      )}
    </div>
  );
}