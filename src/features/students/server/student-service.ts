import "server-only";

import { randomInt } from "node:crypto";

import { getCurrentProfile } from "@/features/auth/server/auth-service";
import { buildUsernameCandidate } from "@/features/students/utils/account-generator";
import type { StudentCredential, StudentInput, StudentOperationResult, StudentRecord } from "@/features/students/types";
import { createAdminClient } from "@/lib/supabase/admin.server";
import { createClient } from "@/lib/supabase/server";

const internalStudentDomain = "students.englishclass.internal";

async function requireOwnedClassroom(classroomId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "TEACHER") throw new Error("Bạn không có quyền thực hiện thao tác này.");
  const supabase = await createClient();
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, teacher_id")
    .eq("id", classroomId)
    .eq("teacher_id", profile.id)
    .maybeSingle();
  if (!classroom) throw new Error("Không tìm thấy lớp học hoặc bạn không có quyền quản lý lớp này.");
  return classroom;
}

async function requireStudentMembership(classroomId: string, studentId: string) {
  const classroom = await requireOwnedClassroom(classroomId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_members")
    .select("student_id")
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!data) throw new Error("Học sinh không thuộc lớp này.");
  return classroom;
}

async function generateUniqueUsername(fullName: string, classroomName: string) {
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = String(randomInt(10, 100));
    const username = buildUsernameCandidate(fullName, classroomName, suffix);
    const { data } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (!data) return username;
  }
  return buildUsernameCandidate(fullName, classroomName, crypto.randomUUID().slice(0, 6));
}

export async function createStudentAccount(classroomId: string, input: StudentInput): Promise<StudentCredential> {
  const classroom = await requireOwnedClassroom(classroomId);
  const admin = createAdminClient();
  const username = await generateUniqueUsername(input.fullName, classroom.name);
  const temporaryPassword = "123456";
  const email = `${username}@${internalStudentDomain}`;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "STUDENT", created_by: String(classroom.teacher_id) },
    user_metadata: { full_name: input.fullName, username, must_change_password: true },
  });
  if (authError || !authData.user) throw new Error("Không thể tạo tài khoản đăng nhập cho học sinh.");

  const studentId = authData.user.id;
  try {
    const { error: metadataError } = await admin.auth.admin.updateUserById(studentId, {
      app_metadata: {
        ...authData.user.app_metadata,
        role: "STUDENT",
        created_by: String(classroom.teacher_id),
      },
    });
    if (metadataError) throw new Error("Không thể xác nhận giáo viên tạo tài khoản học sinh.");

    const { data: ownedProfile, error: ownershipError } = await admin.from("profiles").update({
      created_by_teacher_id: classroom.teacher_id,
    }).eq("id", studentId).eq("role", "STUDENT").select("id").maybeSingle();
    if (ownershipError || !ownedProfile) {
      throw new Error(`Không thể xác nhận profile STUDENT.${ownershipError ? ` ${ownershipError.message}` : " Trigger tạo profile chưa nhận diện tài khoản học sinh."}`);
    }

    const supabase = await createClient();
    const { error: enrollmentError } = await supabase.rpc("finalize_student_enrollment", {
      target_classroom_id: classroomId,
      target_student_id: studentId,
      student_full_name: input.fullName,
      student_date_of_birth: input.dateOfBirth,
      student_gender_value: input.gender,
      student_parent_phone: input.parentPhone,
      student_username: username,
    });
    if (enrollmentError) {
      const code = enrollmentError.code ? ` [${enrollmentError.code}]` : "";
      throw new Error(`Không thể hoàn tất việc thêm học sinh vào lớp.${code} ${enrollmentError.message}`.trim());
    }
  } catch (error) {
    await admin.auth.admin.deleteUser(studentId);
    throw error instanceof Error ? error : new Error("Không thể hoàn tất việc thêm học sinh vào lớp.");
  }

  return { studentId, fullName: input.fullName, username, temporaryPassword };
}

export async function bulkCreateStudents(classroomId: string, students: StudentInput[]) {
  // Fail the whole batch once when the server-only Admin API is not configured,
  // instead of returning the same configuration error for every spreadsheet row.
  createAdminClient();
  return Promise.all(students.map(async (student): Promise<StudentOperationResult & { fullName: string }> => {
    try {
      const credential = await createStudentAccount(classroomId, student);
      return { success: true, message: "Đã tạo", credential, fullName: student.fullName };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Tạo thất bại", fullName: student.fullName };
    }
  }));
}

export async function updateStudent(classroomId: string, studentId: string, input: StudentInput) {
  await requireStudentMembership(classroomId, studentId);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    full_name: input.fullName,
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    parent_phone: input.parentPhone,
  }).eq("id", studentId);
  if (error) throw new Error("Không thể cập nhật thông tin học sinh.");
}

export async function withdrawStudentFromClass(classroomId: string, studentId: string) {
  await requireStudentMembership(classroomId, studentId);
  const supabase = await createClient();
  const { error } = await supabase.from("class_members").update({ status: "WITHDRAWN", left_at: new Date().toISOString() })
    .eq("classroom_id", classroomId).eq("student_id", studentId);
  if (error) throw new Error("Không thể chuyển học sinh sang trạng thái đã thôi học.");
}

export async function resetStudentPassword(classroomId: string, studentId: string) {
  await requireStudentMembership(classroomId, studentId);
  const password = "123456";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(studentId);
  if (error || !data.user) throw new Error("Không tìm thấy tài khoản học sinh.");
  const { error: updateError } = await admin.auth.admin.updateUserById(studentId, {
    password,
    user_metadata: { ...data.user.user_metadata, must_change_password: true },
  });
  if (updateError) throw new Error("Không thể đặt lại mật khẩu.");
  return password;
}

export async function getClassroomStudents(classroomId: string): Promise<{ classroom: { id: string; name: string; gradeLevel: number; academicYear: string; endsAt: string | null }; students: StudentRecord[] } | null> {
  await requireOwnedClassroom(classroomId);
  const supabase = await createClient();
  const { data: classroom } = await supabase.from("classrooms")
    .select("id, name, grade_level, academic_year, ends_at").eq("id", classroomId).maybeSingle();
  if (!classroom) return null;
  const { data: members } = await supabase.from("class_members").select("student_id, status, left_at").eq("classroom_id", classroomId);
  const ids = (members ?? []).map((member) => member.student_id);
  const classroomData = { id: classroom.id, name: classroom.name, gradeLevel: classroom.grade_level, academicYear: classroom.academic_year, endsAt: classroom.ends_at };
  if (!ids.length) return { classroom: classroomData, students: [] };
  const { data: profiles } = await supabase.from("profiles")
    .select("id, full_name, date_of_birth, gender, parent_phone, username").in("id", ids).order("full_name");
  const membershipByStudent = new Map((members ?? []).map((member) => [member.student_id, member]));
  const isExpired = classroom.ends_at !== null && classroom.ends_at < new Date().toISOString().slice(0, 10);
  const students = (profiles ?? []).flatMap((profile) => profile.username ? (() => {
    const membership = membershipByStudent.get(profile.id);
    if (!membership) return [];
    return [{
    id: profile.id, fullName: profile.full_name, dateOfBirth: profile.date_of_birth,
    gender: profile.gender, parentPhone: profile.parent_phone, username: profile.username,
    membershipStatus: membership.status, leftAt: membership.left_at,
    displayStatus: membership.status === "WITHDRAWN" ? "WITHDRAWN" as const : isExpired ? "EXPIRED" as const : "ACTIVE" as const,
  }];
  })() : []);
  return { classroom: classroomData, students };
}
