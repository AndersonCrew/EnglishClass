"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import { assignmentDraftSchema } from "../schemas/assignment-schema";
import type { ActionResult } from "../types";

export async function saveAssignmentAction(payload: unknown, publish: boolean): Promise<ActionResult> {
  await requireRole("TEACHER");
  const parsed = assignmentDraftSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ." };

  const supabase = await createClient();
  const draft = parsed.data;
  const { data: classroom } = await supabase.from("classrooms").select("id").eq("id", draft.classroomId).maybeSingle();
  if (!classroom) return { ok: false, message: "Bạn không có quyền tạo bài cho lớp này." };

  const { data: assignment, error } = await supabase.from("assignments").insert({
    classroom_id: draft.classroomId, title: draft.title, description: draft.description || null,
    due_at: draft.dueAt ? new Date(draft.dueAt).toISOString() : null,
    status: publish ? "PUBLISHED" : "DRAFT", show_results_after_submit: draft.showResultsAfterSubmit,
  }).select("id").single();
  if (error || !assignment) return { ok: false, message: "Không thể lưu bài tập. Vui lòng thử lại." };

  try {
    for (const [taskIndex, task] of draft.tasks.entries()) {
      const { data: createdTask, error: taskError } = await supabase.from("tasks").insert({
        assignment_id: assignment.id, skill: task.skill, title: task.title,
        instruction: task.instruction || null, category: task.category || null,
        content: {}, order_index: taskIndex,
      }).select("id").single();
      if (taskError || !createdTask) throw new Error("task");

      for (const [questionIndex, question] of task.questions.entries()) {
        const { data: createdQuestion, error: questionError } = await supabase.from("questions").insert({
          task_id: createdTask.id, type: question.type, prompt: question.prompt,
          instruction: question.instruction || null, image_path: question.imagePath, config: question.config,
          points: question.points, order_index: questionIndex,
        }).select("id").single();
        if (questionError || !createdQuestion) throw new Error("question");
        const { error: keyError } = await supabase.from("question_answer_keys").insert({
          question_id: createdQuestion.id, answer_key: question.answerKey,
        });
        if (keyError) throw new Error("answer-key");
      }
    }
  } catch {
    await supabase.from("assignments").delete().eq("id", assignment.id);
    return { ok: false, message: "Bài tập chưa được lưu trọn vẹn. Hệ thống đã hoàn tác, vui lòng thử lại." };
  }

  revalidatePath(`/teacher/classes/${draft.classroomId}/assignments`);
  revalidatePath("/student");
  return { ok: true, message: publish ? "Đã giao bài cho học sinh." : "Đã lưu bản nháp.", assignmentId: assignment.id };
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

export async function submitAssignmentAction(submissionId: string): Promise<ActionResult> {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_assignment", { target_submission_id: submissionId });
  if (error) return { ok: false, message: "Chưa thể nộp bài. Em hãy thử lại nhé." };
  revalidatePath("/student");
  return { ok: true, message: "Nộp bài thành công!" };
}

export async function assessAnswerAction(answerId: string, score: number, feedback: string): Promise<ActionResult> {
  await requireRole("TEACHER");
  if (!Number.isFinite(score) || score < 0 || score > 1000 || feedback.length > 2000) return { ok: false, message: "Điểm hoặc nhận xét chưa hợp lệ." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("assess_student_answer", { target_answer_id: answerId, score_value: score, feedback_value: feedback });
  return error ? { ok: false, message: "Không thể lưu đánh giá." } : { ok: true, message: "Đã lưu đánh giá." };
}
