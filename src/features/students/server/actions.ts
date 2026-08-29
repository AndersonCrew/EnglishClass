"use server";

import { revalidatePath } from "next/cache";

import { bulkStudentSchema, studentInputSchema } from "@/features/students/schemas/student-schema";
import { bulkCreateStudents, createStudentAccount, resetStudentPassword, updateStudent, withdrawStudentFromClass } from "@/features/students/server/student-service";
import type { StudentInput } from "@/features/students/types";

const pathFor = (classroomId: string) => `/teacher/classes/${classroomId}`;
const message = (error: unknown) => error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";

export async function createStudentAction(classroomId: string, input: StudentInput) {
  const parsed = studentInputSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };
  try {
    const credential = await createStudentAccount(classroomId, parsed.data);
    revalidatePath(pathFor(classroomId));
    return { success: true as const, credential };
  } catch (error) { return { success: false as const, message: message(error) }; }
}

export async function bulkCreateStudentsAction(classroomId: string, input: StudentInput[]) {
  const parsed = bulkStudentSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Danh sách chưa hợp lệ.", results: [] };
  try {
    const results = await bulkCreateStudents(classroomId, parsed.data);
    revalidatePath(pathFor(classroomId));
    return { success: true as const, results };
  } catch (error) { return { success: false as const, message: message(error), results: [] }; }
}

export async function updateStudentAction(classroomId: string, studentId: string, input: StudentInput) {
  const parsed = studentInputSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };
  try { await updateStudent(classroomId, studentId, parsed.data); revalidatePath(pathFor(classroomId)); return { success: true as const }; }
  catch (error) { return { success: false as const, message: message(error) }; }
}

export async function withdrawStudentAction(classroomId: string, studentId: string) {
  try { await withdrawStudentFromClass(classroomId, studentId); revalidatePath(pathFor(classroomId)); return { success: true as const }; }
  catch (error) { return { success: false as const, message: message(error) }; }
}

export async function resetStudentPasswordAction(classroomId: string, studentId: string) {
  try { return { success: true as const, temporaryPassword: await resetStudentPassword(classroomId, studentId) }; }
  catch (error) { return { success: false as const, message: message(error) }; }
}
