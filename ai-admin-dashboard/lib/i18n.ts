import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import type { Locale } from "antd/es/locale";

export function getAntdLocale(locale: string): Locale {
  const norm = locale.toLowerCase();
  if (norm.startsWith("vi")) return viVN;
  return enUS;
}

export const t = (key: string) => {
  // Minimal placeholder i18n
  // You can replace with next-intl later.
  const dict: Record<string, string> = {
    "nav.dashboard": "Tổng quan",
    "nav.aiQuery": "AI Query",
    "nav.data": "Quản lý dữ liệu",
    "nav.tools": "Cấu hình Tools (TAG)",
    "nav.employee": "Nhân sự",
    "nav.settings": "Cài đặt"
  };
  return dict[key] ?? key;
};
