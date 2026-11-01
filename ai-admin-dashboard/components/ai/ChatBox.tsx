"use client";

import React from "react";
import {
  Button,
  Card,
  Input,
  Space,
  Switch,
  Tag,
  Typography,
  Divider,
  Select,
  Collapse,
  Table,
  Alert,
  Segmented
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  SendOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  ToolOutlined,
  CodeOutlined,
  TableOutlined
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiError } from "@/lib/errors";

type FeatureToggles = {
  rag: boolean;
  dag: boolean;
  tag: boolean;
};

type RagChunk = { source: string; score?: number; text: string };
type ToolCall = { name: string; endpoint?: string; status?: string; output?: string };

type DagStep = { title: string; detail?: string; status?: "ok" | "warn" | "error" };
type DagResultRow = Record<string, unknown>;

type AiResponse = {
  answer: string;

  // RAG
  rag?: { chunks: RagChunk[] };

  // DAG (DB chat)
  dag?: {
    datasource?: string;
    tables_used?: string[];
    sql?: string;
    steps?: DagStep[];
    columns?: { key: string; title: string; dataIndex: string }[];
    rows?: DagResultRow[];
    row_count?: number;
  };

  // TAG
  tag?: { tools: ToolCall[] };
};

/**
 * API suggestions (backend):
 * - GET /dag/datasources -> [{id,label,description?}]
 * - GET /dag/schema?datasource=... -> {tables:[{name, columns:[{name,type}]}]}
 * - POST /ai/query -> { query, toggles, dag: { datasource, return_sql, return_table, return_steps } }
 *   -> AiResponse
 *
 * Fallback: UI vẫn chạy nếu backend chưa có, với mock schema/response.
 */

type Datasource = { id: string; label: string; description?: string };
type SchemaTable = { name: string; columns: { name: string; type: string }[] };
type SchemaResponse = { tables: SchemaTable[] };

const mockDatasources: Datasource[] = [
  { id: "sales_db", label: "Sales DB", description: "Doanh thu, đơn hàng, KPI" },
  { id: "crm_db", label: "CRM DB", description: "Khách hàng, leads, pipeline" },
  { id: "finance_db", label: "Finance DB", description: "Chi phí, lợi nhuận, báo cáo" }
];

const mockSchema: Record<string, SchemaResponse> = {
  sales_db: {
    tables: [
      {
        name: "orders",
        columns: [
          { name: "id", type: "uuid" },
          { name: "created_at", type: "timestamp" },
          { name: "region", type: "text" },
          { name: "amount", type: "numeric" },
          { name: "status", type: "text" }
        ]
      },
      {
        name: "revenue_daily",
        columns: [
          { name: "day", type: "date" },
          { name: "revenue", type: "numeric" },
          { name: "orders_count", type: "int" }
        ]
      }
    ]
  },
  crm_db: {
    tables: [
      {
        name: "customers",
        columns: [
          { name: "id", type: "uuid" },
          { name: "name", type: "text" },
          { name: "segment", type: "text" },
          { name: "owner", type: "text" }
        ]
      },
      {
        name: "deals",
        columns: [
          { name: "id", type: "uuid" },
          { name: "stage", type: "text" },
          { name: "value", type: "numeric" },
          { name: "closed_at", type: "timestamp" }
        ]
      }
    ]
  },
  finance_db: {
    tables: [
      {
        name: "expenses",
        columns: [
          { name: "id", type: "uuid" },
          { name: "category", type: "text" },
          { name: "amount", type: "numeric" },
          { name: "paid_at", type: "date" }
        ]
      }
    ]
  }
};

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${esc})`, "ig");
  return text.split(re).map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-[rgba(250,204,21,0.25)] text-inherit px-1 rounded">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function schemaSummary(schema?: SchemaResponse) {
  if (!schema?.tables?.length) return "No schema loaded";
  const tableCount = schema.tables.length;
  const colCount = schema.tables.reduce((acc, t) => acc + t.columns.length, 0);
  return `${tableCount} tables • ${colCount} columns`;
}

export function ChatBox() {
  const [toggles, setToggles] = React.useState<FeatureToggles>({
    rag: true,
    dag: true,
    tag: true
  });

  // DAG-specific controls
  const [datasource, setDatasource] = React.useState<string>("sales_db");
  const [dagOutput, setDagOutput] = React.useState<"sql" | "table" | "both">("both");

  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<
    { role: "user" | "assistant"; content: React.ReactNode }[]
  >([]);

  // datasources (backend optional)
  const dsQuery = useQuery({
    queryKey: ["dag-datasources"],
    queryFn: async () => {
      const res = await api.get("/dag/datasources");
      return (res.data as Datasource[]) || [];
    },
    placeholderData: mockDatasources
  });

  // schema for selected datasource (backend optional)
  const schemaQuery = useQuery({
    queryKey: ["dag-schema", datasource],
    queryFn: async () => {
      const res = await api.get("/dag/schema", { params: { datasource } });
      return res.data as SchemaResponse;
    },
    placeholderData: mockSchema[datasource] ?? { tables: [] }
  });

  const m = useMutation({
    mutationFn: async (payload: {
      query: string;
      toggles: FeatureToggles;
      dag: { datasource: string; return_sql: boolean; return_table: boolean; return_steps: boolean };
    }) => {
      // Prefer one unified endpoint for AI query:
      // POST /ai/query { query, toggles, dag: {...} }
      // Fallback to existing /rag_query if that's what you have.
      try {
        const res = await api.post("/ai/query", payload);
        return res.data as AiResponse;
      } catch {
        const res = await api.post("/rag_query", {
          query: payload.query,
          rag: payload.toggles.rag,
          dag: payload.toggles.dag,
          tag: payload.toggles.tag,
          datasource: payload.dag.datasource,
          return_sql: payload.dag.return_sql,
          return_table: payload.dag.return_table,
          return_steps: payload.dag.return_steps
        });
        return res.data as AiResponse;
      }
    },
    onError: (err: unknown) => {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: (
            <div className="text-red-300">
              Không gọi được backend. Bạn vẫn có thể test UI. Lỗi:{" "}
              <span className="opacity-80">{apiError(err, "unknown")}</span>
            </div>
          )
        }
      ]);
    }
  });

  const send = async () => {
    const q = input.trim();
    if (!q) return;

    setHistory((h) => [...h, { role: "user", content: q }]);
    setInput("");

    const wantsSql = dagOutput === "sql" || dagOutput === "both";
    const wantsTable = dagOutput === "table" || dagOutput === "both";

    // If DAG enabled but no datasource -> stop early
    if (toggles.dag && !datasource) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          content: <Alert type="warning" showIcon message="Chọn datasource để dùng DAG (chat với database)." />
        }
      ]);
      return;
    }

    try {
      const data = await m.mutateAsync({
        query: q,
        toggles,
        dag: {
          datasource,
          return_sql: wantsSql,
          return_table: wantsTable,
          return_steps: true
        }
      });

      // ---------- DAG table rendering ----------
      const dagColsFromBackend =
        data.dag?.columns?.length
          ? data.dag.columns
          : data.dag?.rows?.length
            ? Object.keys(data.dag.rows[0] ?? {}).map((k) => ({
                key: k,
                title: k,
                dataIndex: k
              }))
            : [];

      const dagColumns: ColumnsType<DagResultRow> = dagColsFromBackend.map((c) => ({
        title: c.title ?? c.key ?? c.dataIndex,
        dataIndex: c.dataIndex ?? c.key,
        key: c.key ?? c.dataIndex
      }));

      const dagRows = (data.dag?.rows ?? []).map((r, idx) => ({ key: idx, ...r }));

      const assistant = (
        <div className="space-y-3">
          <Typography.Paragraph className="!mb-0">{data.answer || "(empty answer)"}</Typography.Paragraph>

          {/* DAG: database context + SQL + table + steps */}
          {toggles.dag ? (
            <>
              <Divider className="!my-2" />
              <div className="flex items-center gap-2">
                <BranchesOutlined className="opacity-80" />
                <Typography.Text strong>DAG — Data Augmented Generation (DB Chat)</Typography.Text>
                <Tag>{data.dag?.datasource ?? datasource}</Tag>
              </div>

              {/* Tables used */}
              {data.dag?.tables_used?.length ? (
                <div className="flex flex-wrap gap-2">
                  <Typography.Text className="opacity-80">Tables used:</Typography.Text>
                  {data.dag.tables_used.slice(0, 12).map((t, idx) => (
                    <Tag key={idx} icon={<DatabaseOutlined />}>
                      {t}
                    </Tag>
                  ))}
                </div>
              ) : null}

              <Collapse
                size="small"
                items={[
                  {
                    key: "dag_steps",
                    label: (
                      <span className="flex items-center gap-2">
                        <DatabaseOutlined />
                        Execution steps
                      </span>
                    ),
                    children: (
                      <div className="space-y-2">
                        {(data.dag?.steps?.length ? data.dag.steps : [
                          { title: "Intent detection", detail: "Xác định câu hỏi thuộc domain dữ liệu" },
                          { title: "Schema mapping", detail: "Map intent → tables/columns" },
                          { title: "SQL generation", detail: "Sinh SQL an toàn" },
                          { title: "Query execution", detail: "Chạy query và lấy kết quả" },
                          { title: "Answer synthesis", detail: "Tóm tắt + giải thích" }
                        ]).map((s, i) => (
                          <Card
                            key={i}
                            size="small"
                            className="!bg-[rgba(255,255,255,0.04)]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Typography.Text strong>{s.title}</Typography.Text>
                              <Tag color={s.status === "error" ? "red" : s.status === "warn" ? "gold" : "green"}>
                                {s.status ?? "ok"}
                              </Tag>
                            </div>
                            {s.detail ? <div className="text-xs opacity-80 mt-1">{s.detail}</div> : null}
                          </Card>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: "dag_sql",
                    label: (
                      <span className="flex items-center gap-2">
                        <CodeOutlined />
                        Generated SQL
                      </span>
                    ),
                    children: data.dag?.sql ? (
                      <pre className="text-xs whitespace-pre-wrap rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.20)] p-3 overflow-auto">
                        {data.dag.sql}
                      </pre>
                    ) : (
                      <div className="opacity-70 text-sm">
                        Backend chưa trả `dag.sql`. Gợi ý: trả về SQL để audit/trace.
                      </div>
                    )
                  },
                  {
                    key: "dag_table",
                    label: (
                      <span className="flex items-center gap-2">
                        <TableOutlined />
                        Result preview
                      </span>
                    ),
                    children: dagRows.length ? (
                      <div className="space-y-2">
                        <div className="text-xs opacity-70">
                          Rows: {data.dag?.row_count ?? dagRows.length}
                        </div>
                        <Table
                          size="small"
                          columns={dagColumns}
                          dataSource={dagRows}
                          pagination={{ pageSize: 5 }}
                          scroll={{ x: true }}
                        />
                      </div>
                    ) : (
                      <div className="opacity-70 text-sm">
                        Backend chưa trả `dag.rows`. Gợi ý: trả về bảng kết quả (limit 50) để UI preview.
                      </div>
                    )
                  }
                ]}
              />
            </>
          ) : null}

          {/* RAG */}
          {toggles.rag && data.rag?.chunks?.length ? (
            <>
              <Divider className="!my-2" />
              <div className="flex items-center gap-2">
                <DatabaseOutlined className="opacity-80" />
                <Typography.Text strong>RAG — Retrieved evidence</Typography.Text>
              </div>
              <div className="space-y-2">
                {data.rag.chunks.slice(0, 5).map((c, idx) => (
                  <Card key={idx} size="small" className="!bg-[rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <Typography.Text className="opacity-80">{c.source}</Typography.Text>
                      {typeof c.score === "number" ? <Tag>{Math.round(c.score * 100)}%</Tag> : null}
                    </div>
                    <Typography.Paragraph className="!mb-0 !mt-2">
                      {highlight(c.text, q)}
                    </Typography.Paragraph>
                  </Card>
                ))}
              </div>
            </>
          ) : null}

          {/* TAG */}
          {toggles.tag && data.tag?.tools?.length ? (
            <>
              <Divider className="!my-2" />
              <div className="flex items-center gap-2">
                <ToolOutlined className="opacity-80" />
                <Typography.Text strong>TAG — Tools used</Typography.Text>
              </div>
              <div className="space-y-2">
                {data.tag.tools.slice(0, 8).map((t, idx) => (
                  <Card key={idx} size="small" className="!bg-[rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <Typography.Text strong>{t.name}</Typography.Text>
                      <Tag>{t.status ?? "ok"}</Tag>
                    </div>
                    {t.endpoint ? <div className="text-xs opacity-80">{t.endpoint}</div> : null}
                    {t.output ? (
                      <Typography.Paragraph className="!mb-0 !mt-2">{t.output}</Typography.Paragraph>
                    ) : null}
                  </Card>
                ))}
              </div>
            </>
          ) : null}
        </div>
      );

      setHistory((h) => [...h, { role: "assistant", content: assistant }]);
    } catch {
      // handled by onError
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Typography.Title level={4} style={{ margin: 0 }}>
              AI Query Console
            </Typography.Title>
            <Typography.Text type="secondary">
              DAG = chat với database/structured data • RAG = docs • TAG = tools
            </Typography.Text>
          </div>

          <Space wrap>
            <span className="text-xs opacity-80">RAG</span>
            <Switch checked={toggles.rag} onChange={(v) => setToggles((s) => ({ ...s, rag: v }))} />
            <span className="text-xs opacity-80">DAG</span>
            <Switch checked={toggles.dag} onChange={(v) => setToggles((s) => ({ ...s, dag: v }))} />
            <span className="text-xs opacity-80">TAG</span>
            <Switch checked={toggles.tag} onChange={(v) => setToggles((s) => ({ ...s, tag: v }))} />
          </Space>
        </div>

        {/* DAG controls */}
        <Card size="small" className="!bg-[rgba(255,255,255,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Space wrap>
              <Typography.Text className="opacity-80">DAG datasource</Typography.Text>
              <Select
                style={{ minWidth: 240 }}
                value={datasource}
                onChange={setDatasource}
                options={(dsQuery.data ?? mockDatasources).map((d) => ({
                  value: d.id,
                  label: `${d.label}${d.description ? ` — ${d.description}` : ""}`
                }))}
                disabled={!toggles.dag}
              />

              <Typography.Text className="opacity-80">DAG output</Typography.Text>
              <Segmented
                value={dagOutput}
                onChange={(v) => setDagOutput(v as "sql" | "table" | "both")}
                options={[
                  { label: "SQL", value: "sql" },
                  { label: "Table", value: "table" },
                  { label: "Both", value: "both" }
                ]}
                disabled={!toggles.dag}
              />
            </Space>

            <div className="text-xs opacity-70">
              Schema: {schemaSummary(schemaQuery.data)}
            </div>
          </div>

          {/* Schema context preview */}
          {toggles.dag ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              {(schemaQuery.data?.tables ?? []).slice(0, 6).map((t) => (
                <div
                  key={t.name}
                  className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.15)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Typography.Text strong>{t.name}</Typography.Text>
                    <Tag>{t.columns.length} cols</Tag>
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {t.columns.slice(0, 6).map((c) => `${c.name}:${c.type}`).join(", ")}
                    {t.columns.length > 6 ? "…" : ""}
                  </div>
                </div>
              ))}
              {(schemaQuery.data?.tables?.length ?? 0) === 0 ? (
                <div className="text-sm opacity-70">
                  Backend chưa có schema endpoint. Bạn có thể implement `GET /dag/schema`.
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Chat history */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] p-3 h-[52vh] overflow-auto">
          {history.length === 0 ? (
            <div className="opacity-70 text-sm">
              Gợi ý DAG: “Doanh thu tháng này theo region?”, “Top 10 khách hàng theo doanh số?”, “Tỷ lệ churn tuần này?”
            </div>
          ) : null}

          <div className="space-y-3">
            {history.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[88%] rounded-2xl px-3 py-2 bg-[rgba(59,130,246,0.25)] border border-[rgba(59,130,246,0.25)]"
                      : "max-w-[88%] rounded-2xl px-3 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)]"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi… (Ctrl/⌘ + Enter để gửi)"
            autoSize={{ minRows: 2, maxRows: 4 }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="primary" icon={<SendOutlined />} loading={m.isPending} onClick={() => void send()}>
            Gửi
          </Button>
        </div>

        <div className="text-xs opacity-70">
          Phím tắt: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> để gửi.
        </div>
      </div>
    </Card>
  );
}
