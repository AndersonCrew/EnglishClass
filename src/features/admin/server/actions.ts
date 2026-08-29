"use server";
import { revalidatePath } from "next/cache";
import { archiveClassroom, hardDeleteStudent, removeStudentMembership, resetAccountPassword, setAccountStatus, setTeacherStatus, updateStudentByAdmin } from "./admin-service";
import type { AccountStatus, TeacherApprovalStatus } from "@/types/database.generated";
import { studentInputSchema } from "@/features/students/schemas/student-schema";
const result = async (work: () => Promise<unknown>, path: string) => { try { const value = await work(); revalidatePath(path); return { success: true as const, value }; } catch (error) { return { success: false as const, message: error instanceof Error ? error.message : "Thao tác thất bại." }; } };
export async function updateTeacherStatusAction(id: string, status: TeacherApprovalStatus) { return result(() => setTeacherStatus(id, status), "/admin/teachers"); }
export async function updateAccountStatusAction(id: string, status: AccountStatus) { return result(() => setAccountStatus(id, status), "/admin"); }
export async function resetAccountPasswordAction(id: string) { return result(() => resetAccountPassword(id), "/admin"); }
export async function removeStudentMembershipAction(studentId: string, classroomId: string) { return result(() => removeStudentMembership(studentId, classroomId), "/admin/students"); }
export async function hardDeleteStudentAction(id: string) { return result(() => hardDeleteStudent(id), "/admin/students"); }
export async function updateStudentByAdminAction(id: string, input: unknown) { const parsed = studentInputSchema.safeParse(input); if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." }; return result(() => updateStudentByAdmin(id, parsed.data), `/admin/students/${id}`); }
export async function archiveClassroomAction(id: string) { return result(() => archiveClassroom(id), `/admin/classes/${id}`); }
