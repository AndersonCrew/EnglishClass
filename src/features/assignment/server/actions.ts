"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import { assignmentDraftSchema } from "../schemas/assignment-schema";
import type { ActionResult } from "../types";
import { getGrade3LearningPath } from "../grade3-curriculum";

export async function saveAssignmentAction(payload: unknown, publish: boolean): Promise<ActionResult> {
  await requireRole("TEACHER");
  void payload;
  void publish;
  return { ok: false, message: "Bài tập được chuẩn bị sẵn theo khối. Giáo viên chỉ cần chọn bài và mở cho lớp." };
}

export async function openAssignmentUntilAction(assignmentId: string, classroomId: string, closesAt: string): Promise<ActionResult> {
  await requireRole("TEACHER");
  const closeTime = new Date(closesAt);
  if (!closesAt || Number.isNaN(closeTime.getTime()) || closeTime.getTime() < Date.now() + 24 * 60 * 60 * 1000) return { ok: false, message: "Thời gian kết thúc phải cách thời gian mở bài ít nhất 24 giờ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_assignment_until", { target_assignment_id: assignmentId, close_time: closeTime.toISOString() });
  if (error) return { ok: false, message: `Không thể mở bài [${error.code}]. Hãy kiểm tra bài đã có đủ 4 kỹ năng.` };
  revalidatePath(`/teacher/classes/${classroomId}/assignments`);
  revalidatePath("/student");
  return { ok: true, message: "Đã mở bài. Hệ thống sẽ tự đóng đúng thời gian đã chọn." };
}

export async function provisionGrade3LearningPathAction(classroomId: string): Promise<ActionResult> {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: classroom } = await supabase.from("classrooms").select("id,grade_level").eq("id", classroomId).maybeSingle();
  if (!classroom || classroom.grade_level !== 3) return { ok: false, message: "Lộ trình này chỉ dùng cho lớp khối 3 của bạn." };
  const { data: existing } = await supabase.from("assignments").select("curriculum_code").eq("classroom_id", classroomId).not("curriculum_code", "is", null);
  const existingCodes = new Set((existing ?? []).map((item) => item.curriculum_code));
  const lessons = getGrade3LearningPath(classroomId).filter((lesson) => !existingCodes.has(lesson.code));
  if (!lessons.length) return { ok: true, message: "Lộ trình khối 3 đã có đầy đủ trong lớp." };
  const { data: last } = await supabase.from("assignments").select("sequence_index").eq("classroom_id", classroomId).order("sequence_index", { ascending: false }).limit(1).maybeSingle();
  const sequenceStart = last?.sequence_index ?? 0;
  let created = 0;
  for (let batchStart = 0; batchStart < lessons.length; batchStart += 3) {
    const batch = lessons.slice(batchStart, batchStart + 3);
    const parsedBatch = batch.map((lesson) => ({ lesson, parsed: assignmentDraftSchema.safeParse(lesson) }));
    const invalid = parsedBatch.find((item) => !item.parsed.success);
    if (invalid) return { ok: false, message: `Dữ liệu ${invalid.lesson.title} chưa hợp lệ.` };
    const results = await Promise.all(parsedBatch.map((item, offset) => supabase.rpc("provision_curriculum_assignment", {
      target_classroom_id: classroomId,
      lesson_code: item.lesson.code,
      lesson_title: item.parsed.data!.title,
      lesson_description: item.parsed.data!.description,
      lesson_level: item.parsed.data!.level,
      lesson_sequence: sequenceStart + batchStart + offset + 1,
      lesson_tasks: item.parsed.data!.tasks,
    })));
    created += results.filter((result) => !result.error).length;
    const failed = results.find((result) => result.error);
    if (failed?.error) {
      console.error("[curriculum-provision] rpc", failed.error);
      return { ok: false, message: `Đã tạo ${created}/${lessons.length} bài. [${failed.error.code}] ${failed.error.message}` };
    }
  }
  revalidatePath(`/teacher/classes/${classroomId}/assignments`);
  return { ok: true, message: `Đã tạo ${created} bài khối 3 theo thứ tự dễ đến khó. Các bài đang được khóa.` };
}

export async function uploadQuestionMediaAction(classroomId: string, formData: FormData): Promise<{ ok: boolean; message: string; path?: string; signedUrl?: string }> {
  await requireRole("TEACHER");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Vui lòng chọn một ảnh." };
  const extension = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]).get(file.type);
  if (!extension || file.size <= 0 || file.size > 5 * 1024 * 1024) return { ok: false, message: "Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB." };
  const supabase = await createClient();
  const { data: classroom } = await supabase.from("classrooms").select("id").eq("id", classroomId).maybeSingle();
  if (!classroom) return { ok: false, message: "Bạn không có quyền tải ảnh cho lớp này." };
  const path = `${classroomId}/drafts/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("question-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: "Không tải được ảnh. Hãy kiểm tra migration Storage." };
  const { data } = await supabase.storage.from("question-media").createSignedUrl(path, 60 * 30);
  return { ok: true, message: "Đã tải ảnh.", path, signedUrl: data?.signedUrl };
}

export async function saveStudentAnswerAction(submissionId: string, questionId: string, answer: Record<string, unknown>): Promise<ActionResult> {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_student_answer", {
    target_submission_id: submissionId, target_question_id: questionId, answer_value: answer,
  });
  return error ? { ok: false, message: "Chưa lưu được câu trả lời." } : { ok: true, message: "Đã lưu." };
}

export async function uploadSpeakingAudioAction(submissionId: string, questionId: string, formData: FormData): Promise<{ ok: boolean; message: string; path?: string }> {
  const profile = await requireRole("STUDENT");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Chưa nhận được bản thu âm." };
  const extensions = new Map([
    ["audio/mpeg", "mp3"], ["audio/mp4", "m4a"], ["audio/x-m4a", "m4a"],
    ["audio/wav", "wav"], ["audio/webm", "webm"],
  ]);
  const extension = extensions.get(file.type);
  if (!extension || file.size <= 0 || file.size > 15 * 1024 * 1024) return { ok: false, message: "Bản thu phải là MP3, M4A, WAV hoặc WebM và không quá 15 MB." };
  const supabase = await createClient();
  const { data: submission } = await supabase.from("submissions").select("id,assignment_id,status").eq("id", submissionId).eq("student_id", profile.id).maybeSingle();
  if (!submission || submission.status !== "DRAFT") return { ok: false, message: "Bài này không còn nhận bản thu mới." };
  const { data: assignment } = await supabase.from("assignments").select("classroom_id,status").eq("id", submission.assignment_id).maybeSingle();
  if (!assignment || assignment.status !== "PUBLISHED") return { ok: false, message: "Bài tập đang bị khóa." };
  const path = `${assignment.classroom_id}/${submissionId}/${questionId}/${profile.id}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("speaking-submissions").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, message: "Chưa tải được bản thu. Em hãy thử lại nhé." };
  const { error: saveError } = await supabase.rpc("save_student_answer", {
    target_submission_id: submissionId, target_question_id: questionId, answer_value: { audioPath: path },
  });
  if (saveError) {
    await supabase.storage.from("speaking-submissions").remove([path]);
    return { ok: false, message: "Chưa lưu được bản thu. Em hãy thử lại nhé." };
  }
  return { ok: true, message: "Đã lưu bản thu âm.", path };
}

export async function submitAssignmentAction(submissionId: string): Promise<ActionResult> {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_assignment", { target_submission_id: submissionId });
  if (error) {
    console.error("[assignment-submit]", error);
    const incomplete = error.message.toLowerCase().includes("answer every question");
    return { ok: false, message: incomplete ? "Em còn câu chưa hoàn thành. Hãy kiểm tra lại cả 4 phần nhé." : `Chưa thể nộp bài [${error.code}]. Em hãy thử lại nhé.` };
  }
  revalidatePath("/student");
  return { ok: true, message: "Nộp bài thành công!" };
}

export async function assessAnswerAction(answerId: string, score: number, feedback: string): Promise<ActionResult> {
  await requireRole("TEACHER");
  if (!Number.isFinite(score) || score < 1 || score > 10) return { ok: false, message: "Điểm từng câu Speaking phải từ 1 đến 10." };
  if (feedback.trim().length === 0 || feedback.length > 2000) return { ok: false, message: "Hãy nhập nhận xét cho từng câu Speaking." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assess_student_answer", { target_answer_id: answerId, score_value: score, feedback_value: feedback });
  if (error) return { ok: false, message: `Không thể lưu đánh giá [${error.code}].` };
  revalidatePath("/teacher");
  return { ok: true, message: "Đã lưu điểm từng câu Speaking." };
}

export async function assessSpeakingSubmissionAction(submissionId: string, score: number, feedback: string): Promise<ActionResult> {
  await requireRole("TEACHER");
  if (!Number.isFinite(score) || score < 1 || score > 10) return { ok: false, message: "Điểm Speaking phải từ 1 đến 10." };
  if (feedback.trim().length === 0 || feedback.length > 2000) return { ok: false, message: "Hãy nhập nhận xét ngắn cho học sinh." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assess_speaking_submission", { target_submission_id: submissionId, score_value: score, feedback_value: feedback });
  if (error) return { ok: false, message: `Không thể lưu kết quả [${error.code}].` };
  revalidatePath(`/teacher/submissions/${submissionId}`);
  revalidatePath("/teacher");
  return { ok: true, message: "Đã lưu kết quả Speaking và cập nhật bảng xếp hạng." };
}

export async function retryAssignmentAction(submissionId: string): Promise<ActionResult> {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { error } = await supabase.rpc("retry_assignment", { target_submission_id: submissionId });
  if (error) return { ok: false, message: "Em chỉ được làm tối đa 3 lần và bài phải còn thời gian." };
  revalidatePath("/student");
  return { ok: true, message: "Đã bắt đầu lượt làm mới." };
}
