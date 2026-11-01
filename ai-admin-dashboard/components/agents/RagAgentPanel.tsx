"use client";

import React, { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Result,
  Space,
  Typography,
  Upload,
  Flex,
  Tag
} from "antd";

import {
  InboxOutlined,
  DatabaseOutlined,
  FileSearchOutlined
} from "@ant-design/icons";

import type { UploadProps } from "antd";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ragApi } from "@/lib/apiClients";
import { apiError } from "@/lib/errors";

/* ================= TYPES ================= */

type RagQueryResponse = {
  response: string;
  data_sources: string[];
};

type FileItem = {
  filename: string;
  url: string;
};

type ListFilesResponse = {
  files: FileItem[];
};

/* ================= COMPONENT ================= */

export default function RagAgentPanel() {
  const { message, modal } = App.useApp();

  const [answer, setAnswer] =
    useState<RagQueryResponse | null>(null);

  const [insertOpen, setInsertOpen] =
    useState(false);

  const [insertResult, setInsertResult] =
    useState<{ message?: string; processed?: string[] } | null>(null);

  /* ================= LIST FILES ================= */

  const filesQ = useQuery({
    queryKey: ["rag-files"],
    queryFn: async () => {
      const res =
        await ragApi.get<ListFilesResponse>(
          "/list_files/"
        );
      return res.data.files;
    }
  });

  /* ================= UPLOAD ================= */

  const uploadProps: UploadProps = useMemo(
    () => ({
      name: "file",
      multiple: true,

      customRequest: async ({
        file,
        onSuccess,
        onError
      }) => {
        try {
          const form = new FormData();
          form.append("file", file as File);

          await ragApi.post(
            "/upload_file/",
            form,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data"
              }
            }
          );

          message.success(
            "Upload thành công 🚀"
          );

          onSuccess?.({});
          filesQ.refetch();
        } catch (error: unknown) {
          message.error(apiError(error, "Upload failed"));
          onError?.(error instanceof Error ? error : new Error("Upload failed"));
        }
      }
    }),
    [filesQ, message]
  );

  /* ================= INSERT VECTOR ================= */

  const insertMutation = useMutation({
    mutationFn: async () => {
      const res =
        await ragApi.post(
          "/insert_file/",
          undefined,
          { timeout: 180_000 }
        );
      return res.data;
    },

    onSuccess: (data) => {
      setInsertResult(data);
      setInsertOpen(true);

      modal.success({
        title: "Vector Database Updated",
        content: (
          <>
            <Typography.Paragraph>
              Embedding hoàn tất ✅
            </Typography.Paragraph>

            <Tag color="gold">
              Processed:
              {" "}
              {data?.processed?.length || 0}
            </Tag>
          </>
        )
      });
    },

    onError: (error: unknown) => message.error(apiError(error, "Insert vector DB failed"))
  });

  /* ================= QUERY ================= */

  const queryMutation = useMutation({
    mutationFn: async (text: string) => {
      const res =
        await ragApi.post<RagQueryResponse>(
          "/rag_query/",
          { text },
          { timeout: 180_000 }
        );
      return res.data;
    },

    onSuccess: (data) =>
      setAnswer(data),
    onError: () => message.error("Không thể truy vấn tài liệu. Vui lòng thử lại.")
  });

  /* ================================================= */
  /* ====================== UI ======================= */
  /* ================================================= */

  return (
    <div
      style={{
        display: "grid",
        gap: 16
      }}
    >
      {/* HEADER */}
      <Card
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(120deg,#fff7cc,#ffffff)"
        }}
      >
        <Flex justify="space-between">
          <div>
            <Typography.Title
              level={4}
              style={{ margin: 0 }}
            >
              Hỏi đáp tài liệu thông tư tài chính
            </Typography.Title>

            <Typography.Text type="secondary">
              Upload → Embed → Retrieve →
              Generate
            </Typography.Text>
          </div>

          <Space>
            <Button
              icon={<DatabaseOutlined />}
              type="primary"
              loading={
                insertMutation.isPending
              }
              onClick={() =>
                insertMutation.mutate()
              }
            >
              Insert Vector DB
            </Button>

            <Button
              icon={<FileSearchOutlined />}
              onClick={() =>
                filesQ.refetch()
              }
            >
              Refresh
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* UPLOAD */}
      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={5}>
          Upload Documents
        </Typography.Title>

        <Upload.Dragger
          {...uploadProps}
          style={{ borderRadius: 12 }}
        >
          <InboxOutlined />
          <p>
            Drag & Drop file hoặc click
            upload
          </p>
        </Upload.Dragger>
      </Card>

      {/* FILE EXPLORER ✅ REPLACED LIST */}
      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={5}>
          Files in S3
        </Typography.Title>

        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 12
          }}
        >
          {(filesQ.data || []).map(
            (file) => (
              <Card
                key={file.filename}
                size="small"
                hoverable
                style={{
                  borderRadius: 12
                }}
              >
                <Flex
                  justify="space-between"
                  align="center"
                >
                  <div>
                    <Typography.Text strong>
                      {file.filename}
                    </Typography.Text>

                    <div>
                      <Typography.Text type="secondary">
                        presigned url
                      </Typography.Text>
                    </div>
                  </div>

                  <Button
                    size="small"
                    onClick={() =>
                      window.open(
                        file.url,
                        "_blank"
                      )
                    }
                  >
                    Open
                  </Button>
                </Flex>
              </Card>
            )
          )}
        </div>
      </Card>

      {/* QUERY */}
      <Card style={{ borderRadius: 16 }}>
        <Typography.Title level={5}>
          Ask RAG
        </Typography.Title>

        <Form<{ text: string }>
          onFinish={(v) =>
            queryMutation.mutate(v.text)
          }
        >
          <Form.Item
            name="text"
            rules={[
              {
                required: true,
                message:
                  "Nhập câu hỏi"
              }
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Ask something..."
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={
              queryMutation.isPending
            }
          >
            Run Query
          </Button>
        </Form>

        {answer && (
          <>
            <Divider />

            <Typography.Title level={5}>
              Answer
            </Typography.Title>

            <Card>
              <Typography.Paragraph>
                {answer.response}
              </Typography.Paragraph>
            </Card>

            <Divider />

            <Space wrap>
              {answer.data_sources?.map(
                (s) => (
                  <Tag key={s}>
                    {s}
                  </Tag>
                )
              )}
            </Space>
          </>
        )}
      </Card>

      {/* SUCCESS MODAL */}
      <Modal
        open={insertOpen}
        onCancel={() =>
          setInsertOpen(false)
        }
        footer={null}
      >
        <Result
          status="success"
          title="Embedding Completed"
          subTitle={
            insertResult?.message
          }
        />
      </Modal>
    </div>
  );
}
