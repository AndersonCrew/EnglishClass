import "server-only";

import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";

export async function getTeacherAssignments(classroomId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const [{ data: classroom }, { data: assignments }] = await Promise.all([
    supabase.from("classrooms").select("id,name,grade_level,academic_year").eq("id", classroomId).maybeSingle(),
    supabase.from("assignments").select("id,title,description,status,due_at,created_at,level,sequence_index,curriculum_code,cover_image_path,closes_at").eq("classroom_id", classroomId).order("level", { ascending: true }).order("sequence_index", { ascending: true, nullsFirst: false }),
  ]);
  if (!classroom) return null;
  const assignmentIds = (assignments ?? []).map((item) => item.id);
  const [{ data: submissions }, { count: studentCount }] = await Promise.all([
    assignmentIds.length ? supabase.from("submissions").select("id,assignment_id,student_id,status,submitted_at,assessed_at").in("assignment_id", assignmentIds) : Promise.resolve({ data: [] }),
    supabase.from("class_members").select("student_id", { count: "exact", head: true }).eq("classroom_id", classroomId).eq("status", "ACTIVE"),
  ]);
  const progress = new Map<string, { started: number; submitted: number; graded: number }>();
  for (const item of submissions ?? []) {
    const value = progress.get(item.assignment_id) ?? { started: 0, submitted: 0, graded: 0 };
    value.started += 1;
    if (item.status === "SUBMITTED") value.submitted += 1;
    if (item.assessed_at) value.graded += 1;
    progress.set(item.assignment_id, value);
  }
  const pending = (submissions ?? []).filter((item) => item.status === "SUBMITTED" && !item.assessed_at);
  const pendingStudentIds = [...new Set(pending.map((item) => item.student_id))];
  const { data: pendingStudents } = pendingStudentIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", pendingStudentIds)
    : { data: [] };
  const studentNames = new Map((pendingStudents ?? []).map((item) => [item.id, item.full_name]));
  const assignmentTitles = new Map((assignments ?? []).map((item) => [item.id, item.title]));
  const pendingSubmissions = pending.map((item) => ({
    id: item.id,
    assignmentId: item.assignment_id,
    assignmentTitle: assignmentTitles.get(item.assignment_id) ?? "Bài tập",
    studentName: studentNames.get(item.student_id) ?? "Học sinh",
    submittedAt: item.submitted_at,
  }));
  return { classroom, assignments: assignments ?? [], progress, pendingSubmissions, studentCount: studentCount ?? 0, serverNow: new Date().toISOString() };
}

export async function getStudentAssignments() {
  const profile = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("class_members")
    .select("classroom_id")
    .eq("student_id", profile.id)
    .eq("status", "ACTIVE");
  if (membershipError) throw new Error(`Không thể tải lớp học [${membershipError.code}].`);
  const classroomIds = (memberships ?? []).map((item) => item.classroom_id);
  if (!classroomIds.length) return [];
  const { data, error: assignmentError } = await supabase.from("assignments")
    .select("id,title,description,due_at,status,classroom_id,created_at,level,sequence_index,cover_image_path,closes_at")
    .in("classroom_id", classroomIds)
    .eq("status", "PUBLISHED")
    .gt("closes_at", new Date().toISOString())
    .order("level", { ascending: true })
    .order("sequence_index", { ascending: true, nullsFirst: false });
  if (assignmentError) throw new Error(`Không thể tải bài tập [${assignmentError.code}].`);
  const ids = (data ?? []).map((item) => item.id);
  const { data: submissions } = ids.length ? await supabase.from("submissions").select("assignment_id,status,assessed_at,auto_score,teacher_score").eq("student_id", profile.id).in("assignment_id", ids) : { data: [] };
  const submissionMap = new Map((submissions ?? []).map((item) => [item.assignment_id, item]));
  return (data ?? []).map((item) => ({ ...item, submission: submissionMap.get(item.id) ?? null }));
}

export async function getStudentAssignment(assignmentId: string) {
  const profile = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id,title,description,due_at,status,show_results_after_submit,classroom_id,cover_image_path,closes_at").eq("id", assignmentId).maybeSingle();
  if (!assignment) return null;
  const { data: tasks } = await supabase.from("tasks").select("id,title,instruction,skill,category,order_index").eq("assignment_id", assignmentId).order("order_index");
  const taskIds = (tasks ?? []).map((task) => task.id);
  const { data: rawQuestions } = taskIds.length ? await supabase.from("questions").select("id,task_id,type,prompt,instruction,image_path,config,points,order_index").in("task_id", taskIds).order("order_index") : { data: [] };
  const questions = await Promise.all((rawQuestions ?? []).map(async (question) => {
    if (!question.image_path) return { ...question, image_url: null };
    if (question.image_path.startsWith("/")) return { ...question, image_url: question.image_path };
    const { data } = await supabase.storage.from("question-media").createSignedUrl(question.image_path, 60 * 15);
    return { ...question, image_url: data?.signedUrl ?? null };
  }));
  const { data: submission } = await supabase.from("submissions").select("id,status,submitted_at,auto_score,teacher_score,teacher_feedback,assessed_at,attempt_count,started_at,duration_seconds,best_score,best_duration_seconds").eq("assignment_id", assignmentId).eq("student_id", profile.id).maybeSingle();
  let submissionId = submission?.id;
  if (!submissionId) {
    const { data } = await supabase.rpc("start_assignment_submission", { target_assignment_id: assignmentId });
    submissionId = data ?? undefined;
  }
  const { data: rawAnswers } = submissionId ? await supabase.from("student_answers").select("id,question_id,answer,auto_score,is_correct,teacher_score,teacher_feedback").eq("submission_id", submissionId) : { data: [] };
  const answers = await Promise.all((rawAnswers ?? []).map(async (answer) => {
    const audioPath = typeof answer.answer.audioPath === "string" ? answer.answer.audioPath : null;
    if (!audioPath) return { ...answer, audio_url: null };
    const { data: signed } = await supabase.storage.from("speaking-submissions").createSignedUrl(audioPath, 60 * 15);
    return { ...answer, audio_url: signed?.signedUrl ?? null };
  }));
  return { assignment, tasks: tasks ?? [], questions, submission: submission ? { ...submission, id: submissionId! } : { id: submissionId!, status: "DRAFT" as const, submitted_at: null, auto_score: null, teacher_score: null, teacher_feedback: null, assessed_at: null, attempt_count: 1, started_at: new Date().toISOString(), duration_seconds: null, best_score: null, best_duration_seconds: null }, answers };
}

export async function getTeacherAssignmentResults(assignmentId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: assignment } = await supabase.from("assignments").select("id,title,classroom_id").eq("id", assignmentId).maybeSingle();
  if (!assignment) return null;
  const [{ data: submissions }, { data: members }] = await Promise.all([
    supabase.from("submissions").select("id,student_id,status,submitted_at,auto_score,teacher_score,teacher_feedback,assessed_at").eq("assignment_id", assignmentId).order("submitted_at"),
    supabase.from("class_members").select("student_id,status").eq("classroom_id", assignment.classroom_id).eq("status", "ACTIVE"),
  ]);
  const studentIds = (members ?? []).map((item) => item.student_id);
  const [{ data: profiles }, { data: tasks }] = await Promise.all([
    studentIds.length ? supabase.from("profiles").select("id,full_name").in("id", studentIds).order("full_name") : Promise.resolve({ data: [] }),
    supabase.from("tasks").select("id,skill").eq("assignment_id", assignmentId),
  ]);
  const taskIds = (tasks ?? []).map((item) => item.id);
  const { data: questions } = taskIds.length ? await supabase.from("questions").select("task_id,points").in("task_id", taskIds) : { data: [] };
  const taskSkill = new Map((tasks ?? []).map((task) => [task.id, task.skill]));
  const objectiveMax = (questions ?? []).filter((question) => taskSkill.get(question.task_id) !== "SPEAKING").reduce((sum, question) => sum + question.points, 0);
  const speakingMax = (tasks ?? []).some((task) => task.skill === "SPEAKING") ? 10 : 0;
  const submissionMap = new Map((submissions ?? []).map((item) => [item.student_id, item]));
  return { assignment, maxScore: objectiveMax + speakingMax, students: (profiles ?? []).map((student) => ({ student, submission: submissionMap.get(student.id) ?? null })) };
}

export async function getTeacherSubmissionResult(submissionId: string) {
  await requireRole("TEACHER");
  const supabase = await createClient();
  const { data: submission } = await supabase.from("submissions").select("id,assignment_id,student_id,status,submitted_at,auto_score,teacher_score,teacher_feedback,assessed_at,attempt_count,duration_seconds,best_score").eq("id", submissionId).maybeSingle();
  if (!submission) return null;
  const [{ data: assignment }, { data: student }, { data: answers }] = await Promise.all([
    supabase.from("assignments").select("id,title,classroom_id").eq("id", submission.assignment_id).single(),
    supabase.from("profiles").select("id,full_name").eq("id", submission.student_id).single(),
    supabase.from("student_answers").select("id,question_id,answer,auto_score,is_correct,teacher_score,teacher_feedback").eq("submission_id", submissionId),
  ]);
  if (!assignment || !student) return null;
  const questionIds = (answers ?? []).map((answer) => answer.question_id);
  const [{ data: questions }, { data: answerKeys }] = questionIds.length ? await Promise.all([
    supabase.from("questions").select("id,task_id,prompt,type,points,config,image_path,order_index").in("id", questionIds),
    supabase.from("question_answer_keys").select("question_id,answer_key").in("question_id", questionIds),
  ]) : [{ data: [] }, { data: [] }];
  const taskIds = [...new Set((questions ?? []).map((item) => item.task_id))];
  const { data: tasks } = taskIds.length ? await supabase.from("tasks").select("id,skill,title,order_index").in("id", taskIds) : { data: [] };
  const taskMap = new Map((tasks ?? []).map((task) => [task.id, task]));
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));
  const answerKeyMap = new Map((answerKeys ?? []).map((item) => [item.question_id, item.answer_key]));
  const enrichedAnswers = await Promise.all((answers ?? []).map(async (answer) => {
    const question = questionMap.get(answer.question_id); if (!question) return null;
    const audioPath = typeof answer.answer.audioPath === "string" ? answer.answer.audioPath : null;
    const [{ data: signedAudio }, { data: signedImage }] = await Promise.all([
      audioPath ? supabase.storage.from("speaking-submissions").createSignedUrl(audioPath, 60 * 30) : Promise.resolve({ data: null }),
      question.image_path && !question.image_path.startsWith("/") ? supabase.storage.from("question-media").createSignedUrl(question.image_path, 60 * 30) : Promise.resolve({ data: null }),
    ]);
    return { ...answer, question: { ...question, task: taskMap.get(question.task_id), answer_key: answerKeyMap.get(question.id) ?? {}, image_url: question.image_path?.startsWith("/") ? question.image_path : signedImage?.signedUrl ?? null }, audio_url: signedAudio?.signedUrl ?? null };
  }));
  const sortedAnswers = enrichedAnswers.filter((answer): answer is NonNullable<typeof answer> => answer !== null).sort((left, right) => (left.question.task?.order_index ?? 0) - (right.question.task?.order_index ?? 0) || left.question.order_index - right.question.order_index);
  return { assignment, student, submission, answers: sortedAnswers };
}

export async function getClassLeaderboard(classroomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_class_leaderboard", { target_classroom_id: classroomId });
  if (error) throw new Error(`Không thể tải bảng xếp hạng lớp [${error.code}].`);
  return data ?? [];
}

export async function getStudentLeaderboards() {
  const profile = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("class_members").select("classroom_id").eq("student_id", profile.id).eq("status", "ACTIVE");
  const classroomIds = (memberships ?? []).map((item) => item.classroom_id);
  if (!classroomIds.length) return { currentStudentId: profile.id, classroom: null, classRows: [], gradeRows: [] };
  const { data: classrooms } = await supabase.from("classrooms").select("id,name,grade_level").in("id", classroomIds).order("name");
  const classroom = classrooms?.[0] ?? null;
  if (!classroom) return { currentStudentId: profile.id, classroom: null, classRows: [], gradeRows: [] };
  const [{ data: classRows }, { data: gradeRows }] = await Promise.all([
    supabase.rpc("get_class_leaderboard", { target_classroom_id: classroom.id }),
    supabase.rpc("get_grade_leaderboard", { target_grade: classroom.grade_level }),
  ]);
  return { currentStudentId: profile.id, classroom, classRows: classRows ?? [], gradeRows: gradeRows ?? [] };
}
