import "server-only";

import { requireRole } from "@/features/auth/server/guards";
import { createAdminClient } from "@/lib/supabase/admin.server";
import type { AccountStatus, TeacherApprovalStatus, UserRole } from "@/types/database.generated";

async function context() {
  const actor = await requireRole("ADMIN");
  if (actor.accountStatus !== "ACTIVE") throw new Error("Tài khoản quản trị đang bị khóa.");
  return { actor, admin: createAdminClient() };
}

async function audit(actor: { id: string; role: UserRole }, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({ actor_user_id: actor.id, actor_role: actor.role, action, target_type: targetType, target_id: targetId, metadata });
  if (error) throw new Error("Thao tác đã thực hiện nhưng không thể ghi audit log.");
}

async function authEmails(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Không thể tải tài khoản Auth.");
  return new Map(data.users.map((user) => [user.id, user.email ?? "—"]));
}

export async function getAdminDashboard() {
  const { admin } = await context();
  const [{ data: profiles }, { count: classrooms }] = await Promise.all([
    admin.from("profiles").select("role, teacher_approval_status, account_status"),
    admin.from("classrooms").select("id", { count: "exact", head: true }),
  ]);
  return {
    pendingTeachers: profiles?.filter((p) => p.role === "TEACHER" && p.teacher_approval_status === "PENDING").length ?? 0,
    activeTeachers: profiles?.filter((p) => p.role === "TEACHER" && p.teacher_approval_status === "APPROVED" && p.account_status === "ACTIVE").length ?? 0,
    suspendedAccounts: profiles?.filter((p) => p.account_status === "SUSPENDED").length ?? 0,
    students: profiles?.filter((p) => p.role === "STUDENT").length ?? 0,
    classrooms: classrooms ?? 0,
  };
}

export async function listTeachers() {
  const { admin } = await context();
  const [{ data }, emails, { data: classes }] = await Promise.all([
    admin.from("profiles").select("id, full_name, teacher_approval_status, account_status, created_at").eq("role", "TEACHER").order("created_at", { ascending: false }),
    authEmails(admin),
    admin.from("classrooms").select("teacher_id"),
  ]);
  const counts = new Map<string, number>(); for (const row of classes ?? []) counts.set(row.teacher_id, (counts.get(row.teacher_id) ?? 0) + 1);
  return (data ?? []).map((row) => ({ ...row, email: emails.get(row.id) ?? "—", classroomCount: counts.get(row.id) ?? 0 }));
}

export async function getTeacher(id: string) { return (await listTeachers()).find((item) => item.id === id) ?? null; }

export async function setTeacherStatus(id: string, status: TeacherApprovalStatus) {
  const { actor, admin } = await context();
  const { data, error } = await admin.from("profiles").update({ teacher_approval_status: status, account_status: status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE" }).eq("id", id).eq("role", "TEACHER").select("id").maybeSingle();
  if (error || !data) throw new Error("Không tìm thấy giáo viên hoặc không thể cập nhật.");
  await audit(actor, `TEACHER_${status === "APPROVED" ? "APPROVED" : status}`, "TEACHER", id);
}

export async function listStudents() {
  const { admin } = await context();
  const [{ data }, { data: memberships }, { data: classes }] = await Promise.all([
    admin.from("profiles").select("id, full_name, username, date_of_birth, gender, parent_phone, account_status, created_at").eq("role", "STUDENT").order("full_name"),
    admin.from("class_members").select("student_id, classroom_id, status"),
    admin.from("classrooms").select("id, name"),
  ]);
  const classNames = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const membershipsByStudent = new Map<string, Array<{ student_id: string; classroom_id: string; status: "ACTIVE" | "WITHDRAWN"; className: string }>>();
  for (const membership of memberships ?? []) {
    const rows = membershipsByStudent.get(membership.student_id) ?? [];
    rows.push({ ...membership, className: classNames.get(membership.classroom_id) ?? "Lớp không tồn tại" });
    membershipsByStudent.set(membership.student_id, rows);
  }
  return (data ?? []).map((student) => ({ ...student, memberships: membershipsByStudent.get(student.id) ?? [] }));
}

export async function getStudent(id: string) { return (await listStudents()).find((item) => item.id === id) ?? null; }

export async function setAccountStatus(id: string, status: AccountStatus) {
  const { actor, admin } = await context();
  const { data, error } = await admin.from("profiles").update({ account_status: status }).eq("id", id).neq("role", "ADMIN").select("id, role").maybeSingle();
  if (error || !data) throw new Error("Không tìm thấy tài khoản.");
  const { error: authError } = await admin.auth.admin.updateUserById(id, { ban_duration: status === "SUSPENDED" ? "876000h" : "none" });
  if (authError) throw new Error("Không thể cập nhật trạng thái đăng nhập.");
  await audit(actor, `${data.role}_${status === "ACTIVE" ? "REACTIVATED" : "SUSPENDED"}`, data.role, id);
}

export async function resetAccountPassword(id: string) {
  const { actor, admin } = await context(); const password = "123456";
  const { data: existing, error: findError } = await admin.auth.admin.getUserById(id);
  if (findError || !existing.user) throw new Error("Không tìm thấy tài khoản Auth.");
  const { data, error } = await admin.auth.admin.updateUserById(id, { password, user_metadata: { ...existing.user.user_metadata, must_change_password: true } });
  if (error || !data.user) throw new Error("Không thể reset mật khẩu.");
  await audit(actor, `${String(data.user.app_metadata.role ?? "ACCOUNT")}_PASSWORD_RESET`, "ACCOUNT", id);
  return password;
}

export async function updateStudentByAdmin(id: string, input: { fullName: string; dateOfBirth: string | null; gender: "MALE" | "FEMALE" | "OTHER" | null; parentPhone: string | null }) {
  const { actor, admin } = await context();
  const { data, error } = await admin.from("profiles").update({ full_name: input.fullName, date_of_birth: input.dateOfBirth, gender: input.gender, parent_phone: input.parentPhone }).eq("id", id).eq("role", "STUDENT").select("id").maybeSingle();
  if (error || !data) throw new Error("Không thể cập nhật học sinh.");
  await audit(actor, "STUDENT_UPDATED", "STUDENT", id);
}

export async function removeStudentMembership(studentId: string, classroomId: string) {
  const { actor, admin } = await context();
  const { error } = await admin.from("class_members").delete().eq("student_id", studentId).eq("classroom_id", classroomId);
  if (error) throw new Error("Không thể xoá học sinh khỏi lớp.");
  await audit(actor, "STUDENT_REMOVED_FROM_CLASS", "STUDENT", studentId, { classroom_id: classroomId });
}

export async function hardDeleteStudent(id: string) {
  const { actor, admin } = await context();
  const { count } = await admin.from("submissions").select("id", { count: "exact", head: true }).eq("student_id", id);
  if ((count ?? 0) > 0) throw new Error("Không thể xóa vĩnh viễn vì học sinh đã có lịch sử bài làm. Hãy tạm khóa tài khoản.");
  const { data } = await admin.from("profiles").select("id, full_name").eq("id", id).eq("role", "STUDENT").maybeSingle();
  if (!data) throw new Error("Không tìm thấy học sinh.");
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error("Không thể xóa tài khoản Auth.");
  await audit(actor, "STUDENT_HARD_DELETED", "STUDENT", id, { full_name: data.full_name });
}

export async function listClasses() {
  const { admin } = await context();
  const [{ data: classes }, { data: teachers }, { data: members }, { data: assignments }] = await Promise.all([
    admin.from("classrooms").select("id, name, grade_level, academic_year, teacher_id, ends_at, archived_at").order("name"),
    admin.from("profiles").select("id, full_name").eq("role", "TEACHER"), admin.from("class_members").select("classroom_id"),
    admin.from("assignments").select("classroom_id, status").eq("status", "PUBLISHED"),
  ]);
  const names = new Map((teachers ?? []).map((t) => [t.id, t.full_name]));
  const studentCounts = new Map<string, number>(); for (const member of members ?? []) studentCounts.set(member.classroom_id, (studentCounts.get(member.classroom_id) ?? 0) + 1);
  const assignmentCounts = new Map<string, number>(); for (const assignment of assignments ?? []) assignmentCounts.set(assignment.classroom_id, (assignmentCounts.get(assignment.classroom_id) ?? 0) + 1);
  return (classes ?? []).map((c) => ({ ...c, teacherName: names.get(c.teacher_id) ?? "Không xác định", studentCount: studentCounts.get(c.id) ?? 0, activeAssignments: assignmentCounts.get(c.id) ?? 0 }));
}

export async function getAdminClass(id: string) { return (await listClasses()).find((item) => item.id === id) ?? null; }

export async function archiveClassroom(id: string) {
  const { actor, admin } = await context();
  const { data, error } = await admin.from("classrooms").update({ archived_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  if (error || !data) throw new Error("Không tìm thấy lớp học.");
  await audit(actor, "CLASSROOM_ARCHIVED", "CLASSROOM", id);
}

export async function listAuditLogs() {
  const { admin } = await context(); const { data } = await admin.from("audit_logs").select("id, actor_user_id, action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(200);
  const { data: actors } = await admin.from("profiles").select("id, full_name"); const names = new Map((actors ?? []).map((a) => [a.id, a.full_name]));
  return (data ?? []).map((row) => ({ ...row, actorName: row.actor_user_id ? names.get(row.actor_user_id) ?? "Tài khoản đã xóa" : "Hệ thống" }));
}
