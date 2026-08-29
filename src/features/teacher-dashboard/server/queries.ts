import "server-only";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import type { TeacherDashboardData } from "../types";

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_teacher_dashboard");
  if (error || !data) throw new Error("Không thể tải dữ liệu trang chủ giáo viên.");
  return data as unknown as TeacherDashboardData;
}
