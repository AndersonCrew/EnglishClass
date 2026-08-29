"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import { classroomSchema } from "../schemas/classroom-schema";

export type CreateClassroomState = { message: string; fields?: { name?: string; gradeLevel?: string; academicYear?: string; endsAt?: string } };

export async function createClassroomAction(_state: CreateClassroomState, formData: FormData): Promise<CreateClassroomState> {
  const profile = await requireRole("TEACHER");
  const fields = { name: String(formData.get("name") ?? ""), gradeLevel: String(formData.get("gradeLevel") ?? ""), academicYear: String(formData.get("academicYear") ?? ""), endsAt: String(formData.get("endsAt") ?? "") };
  const parsed = classroomSchema.safeParse(fields);
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Thông tin lớp chưa hợp lệ.", fields };
  const supabase = await createClient();
  const { data, error } = await supabase.from("classrooms").insert({ teacher_id: profile.id, name: parsed.data.name, grade_level: parsed.data.gradeLevel, academic_year: parsed.data.academicYear, ends_at: parsed.data.endsAt }).select("id").single();
  if (error || !data) return { message: "Không thể tạo lớp. Vui lòng thử lại.", fields };
  redirect(`/teacher/classes/${data.id}`);
}
