import "server-only";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import type { TeacherDashboardData } from "../types";

export async function getTeacherDashboard(): Promise<TeacherDashboardData> {
  const profile = await requireRole("TEACHER");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_teacher_dashboard");
  if (error || !data) throw new Error("Không thể tải dữ liệu trang chủ giáo viên.");
  const dashboard = data as unknown as TeacherDashboardData;
  const { data: classrooms } = await supabase.from("classrooms").select("id").eq("teacher_id", profile.id);
  const classroomIds = (classrooms ?? []).map((classroom) => classroom.id);
  const { data: activeAssignments } = classroomIds.length ? await supabase.from("assignments").select("id,classroom_id").in("classroom_id", classroomIds).eq("status", "PUBLISHED").gt("closes_at", new Date().toISOString()) : { data: [] };
  const activeByClass = new Map<string, number>();
  for (const assignment of activeAssignments ?? []) activeByClass.set(assignment.classroom_id, (activeByClass.get(assignment.classroom_id) ?? 0) + 1);
  return {
    ...dashboard,
    overview: { ...dashboard.overview, publishedAssignmentCount: activeAssignments?.length ?? 0 },
    classrooms: dashboard.classrooms.map((classroom) => ({ ...classroom, activeAssignmentCount: activeByClass.get(classroom.id) ?? 0 })),
  };
}
