import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "EnglishClass",
  description: "Quản lý việc học tiếng Anh dành cho giáo viên và học sinh tiểu học.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
