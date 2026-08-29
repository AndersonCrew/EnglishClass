import "server-only";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";

export async function getTeacherAssignments(classroomId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const [{ data: classroom }, { data: assignments }] = await Promise.all([
    supabase.from("classrooms").select("id,name,grade_level,academic_year").eq("id", classroomId).maybeSingle(),
    supabase.from("assignments").select("id,title,description,status,due_at,created_at").eq("classroom_id", classroomId).order("created_at", { ascending: false }),
  ]);
  return classroom ? { classroom, assignments: assignments ?? [] } : null;
}

export async function getStudentAssignments() {
  await requireRole("STUDENT");
  const supabase = await createClient();
  const { data } = await supabase.from("assignments").select("id,title,description,due_at,status,classroom_id,created_at").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getStudentAssignment(assignmentId: string) {
  const profile = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id,title,description,due_at,status,show_results_after_submit,classroom_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return null;
  const { data: tasks } = await supabase.from("tasks").select("id,title,instruction,skill,category,order_index").eq("assignment_id", assignmentId).order("order_index");
  const taskIds = (tasks ?? []).map((task) => task.id);
  const { data: rawQuestions } = taskIds.length ? await supabase.from("questions").select("id,task_id,type,prompt,instruction,image_path,config,points,order_index").in("task_id", taskIds).order("order_index") : { data: [] };
  const questions = await Promise.all((rawQuestions ?? []).map(async (question) => {
    if (!question.image_path) return { ...question, image_url: null };
    const { data } = await supabase.storage.from("question-media").createSignedUrl(question.image_path, 60 * 15);
    return { ...question, image_url: data?.signedUrl ?? null };
  }));
  const { data: submission } = await supabase.from("submissions").select("id,status,submitted_at,auto_score,teacher_score,teacher_feedback").eq("assignment_id", assignmentId).eq("student_id", profile.id).maybeSingle();
  let submissionId = submission?.id;
  if (!submissionId) {
    const { data } = await supabase.rpc("start_assignment_submission", { target_assignment_id: assignmentId });
    submissionId = data ?? undefined;
  }
  const { data: answers } = submissionId ? await supabase.from("student_answers").select("id,question_id,answer,auto_score,is_correct,teacher_score,teacher_feedback").eq("submission_id", submissionId) : { data: [] };
  return { assignment, tasks: tasks ?? [], questions, submission: submission ? { ...submission, id: submissionId! } : { id: submissionId!, status: "DRAFT" as const, submitted_at: null, auto_score: null, teacher_score: null, teacher_feedback: null }, answers: answers ?? [] };
}

export async function getTeacherAssignmentResults(assignmentId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id,title,classroom_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return null;
  const { data: submissions } = await supabase.from("submissions").select("id,student_id,status,submitted_at,auto_score,teacher_score,teacher_feedback").eq("assignment_id", assignmentId).order("submitted_at");
  const studentIds = (submissions ?? []).map((s) => s.student_id);
  const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id,full_name").in("id", studentIds) : { data: [] };
  return { assignment, submissions: submissions ?? [], names: new Map((profiles ?? []).map((p) => [p.id, p.full_name])) };
}

export async function getTeacherSubmissionResult(submissionId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: submission } = await supabase.from("submissions").select("id,assignment_id,student_id,status,submitted_at,auto_score").eq("id", submissionId).maybeSingle();
  if (!submission) return null;
  const [{ data: assignment }, { data: student }, { data: answers }] = await Promise.all([
    supabase.from("assignments").select("id,title,classroom_id").eq("id", submission.assignment_id).single(),
    supabase.from("profiles").select("id,full_name").eq("id", submission.student_id).single(),
    supabase.from("student_answers").select("id,question_id,answer,auto_score,is_correct,teacher_score,teacher_feedback").eq("submission_id", submissionId),
  ]);
  if (!assignment || !student) return null;
  const questionIds = (answers ?? []).map((answer) => answer.question_id);
  const { data: questions } = questionIds.length ? await supabase.from("questions").select("id,prompt,type,points").in("id", questionIds) : { data: [] };
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
  return { assignment, student, submission, answers: (answers ?? []).map((answer) => ({ ...answer, question: questionMap.get(answer.question_id) })).filter((answer) => answer.question !== undefined) };
}
