import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeakingAssessmentForm } from "@/features/assignment/components/speaking-assessment-form";
import { getTeacherSubmissionResult } from "@/features/assignment/server/queries";

export default async function SubmissionResultPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const data = await getTeacherSubmissionResult(submissionId);
  if (!data) notFound();
  const objective = data.answers.filter((answer) => answer.question.task?.skill !== "SPEAKING");
  const speaking = data.answers.filter((answer) => answer.question.task?.skill === "SPEAKING");
  const autoMax = objective.reduce((sum, answer) => sum + answer.question.points, 0);

  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
    <Link className="text-sm font-semibold text-teal-700" href={`/teacher/assignments/${data.assignment.id}/results`}>← Kết quả lớp</Link>
    <div className="mt-5 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 p-6 ring-1 ring-teal-100"><p className="text-xs font-bold tracking-[0.18em] text-teal-700">BÀI LÀM HỌC SINH</p><h1 className="mt-2 text-3xl font-bold">{data.student.full_name}</h1><p className="mt-2 text-slate-600">{data.assignment.title} · Lần {data.submission.attempt_count}/3 · Điểm tự động: <b>{data.submission.auto_score ?? 0}/{autoMax}</b></p></div>

    <section className="mt-7"><h2 className="text-2xl font-bold">Speaking · Giáo viên chấm</h2><p className="mt-1 text-slate-500">Nghe toàn bộ câu nói rồi lưu một kết quả chung.</p><div className="mt-4 space-y-4">{speaking.map((answer, index) => <article key={answer.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-bold text-violet-700">Câu nói {index + 1}</p><h3 className="mt-2 text-lg font-bold">{answer.question.prompt}</h3>{answer.audio_url ? <audio controls preload="metadata" src={answer.audio_url} className="mt-4 w-full" /> : <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Không tìm thấy bản thu âm.</p>}</article>)}</div><SpeakingAssessmentForm submissionId={submissionId} initialScore={data.submission.teacher_score} initialFeedback={data.submission.teacher_feedback} /></section>

    <section className="mt-7"><h2 className="text-2xl font-bold">Listening, Reading và Writing</h2><p className="mt-1 text-slate-500">Đáp án học sinh, đáp án đúng và điểm từng câu.</p><div className="mt-4 space-y-4">{objective.map((answer, index) => <article key={answer.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-teal-700">{answer.question.task?.skill} · CÂU {index + 1}</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${answer.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{answer.is_correct ? "Đúng" : "Chưa đúng"} · {answer.auto_score ?? 0}/{answer.question.points}</span></div><h3 className="mt-2 font-bold">{answer.question.prompt}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><AnswerBox label="Học sinh trả lời" value={formatAnswer(answer.answer, answer.question.config)} tone="student" /><AnswerBox label="Đáp án đúng" value={formatAnswer(answer.question.answer_key, answer.question.config)} tone="correct" /></div></article>)}</div></section>
  </main>;
}

function AnswerBox({ label, value, tone }: { label: string; value: string; tone: "student" | "correct" }) { return <div className={`rounded-xl p-4 ${tone === "correct" ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-800"}`}><p className="text-xs font-bold opacity-70">{label}</p><p className="mt-1 font-bold">{value || "—"}</p></div>; }

function formatAnswer(value: Record<string, unknown>, config: Record<string, unknown>) {
  const options = (config.options as { id: string; label: string }[] | undefined) ?? [];
  const items = (config.items as { id: string; label: string }[] | undefined) ?? [];
  if (typeof value.text === "string") return value.text;
  if (typeof value.optionId === "string") return options.find((item) => item.id === value.optionId)?.label ?? value.optionId;
  if (typeof value.value === "boolean") return value.value ? "Đúng" : "Sai";
  if (Array.isArray(value.accepted)) return value.accepted.join(" / ");
  if (Array.isArray(value.itemIds)) return value.itemIds.map((id) => items.find((item) => item.id === id)?.label ?? id).join(" ");
  if (Array.isArray(value.pairs)) return value.pairs.map((pair) => JSON.stringify(pair)).join(", ");
  return "—";
}
