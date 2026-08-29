import type { AssignmentStatus } from "@/types/database.generated";

export const statusLabels: Record<AssignmentStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đang giao", CLOSED: "Đã đóng" };

export function getGreeting(hour: number) {
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function progressPercent(submitted: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((submitted / total) * 100));
}

export function formatDueDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Hạn hôm nay";
  return `Hạn ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date)}`;
}
