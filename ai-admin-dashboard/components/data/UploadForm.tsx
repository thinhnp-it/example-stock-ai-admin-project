"use client";

import React from "react";
import { App, Button, Card, Upload, Space, Typography } from "antd";
import { InboxOutlined, CloudUploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiError } from "@/lib/errors";

const { Dragger } = Upload;

export function UploadForm({ onUploaded }: { onUploaded?: () => void }) {
  // ✅ lấy message từ context
  const { message } = App.useApp();

  const m = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      // backend: POST /upload_file (multipart)
      const res = await api.post("/upload_file", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data as { ok: boolean; id?: string };
    },
    onSuccess: () => {
      message.success("Upload thành công");
      onUploaded?.();
    },
    onError: (error: unknown) => {
      message.error(apiError(error, "Upload thất bại"));
    }
  });

  const props: UploadProps = {
    name: "file",
    multiple: false,
    beforeUpload: async (file) => {
      await m.mutateAsync(file);
      return Upload.LIST_IGNORE; // chặn antd tự upload
    }
  };

  return (
    <Card>
      <Space orientation="vertical" className="w-full" size="middle">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Upload dữ liệu
          </Typography.Title>
          <Typography.Text type="secondary">
            Kéo-thả file vào đây để ingest vào hệ thống RAG/DAG.
          </Typography.Text>
        </div>

        <Dragger {...props} disabled={m.isPending}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click hoặc kéo file vào khu vực này</p>
          <p className="ant-upload-hint">
            Hỗ trợ PDF, DOCX, CSV, TXT… (tùy backend)
          </p>
        </Dragger>

        <div className="flex justify-end">
          <Button
            icon={<CloudUploadOutlined />}
            loading={m.isPending}
            onClick={() =>
              message.info("Tip: kéo-thả file trực tiếp vào box phía trên.")
            }
          >
            Hướng dẫn nhanh
          </Button>
        </div>
      </Space>
    </Card>
  );
}
