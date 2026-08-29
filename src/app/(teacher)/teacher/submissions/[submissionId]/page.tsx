import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerAssessmentForm } from "@/features/assignment/components/answer-assessment-form";
import { getTeacherSubmissionResult } from "@/features/assignment/server/queries";

export default async function SubmissionResultPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params; const data = await getTeacherSubmissionResult(submissionId); if (!data) notFound();
  return <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8"><Link className="text-sm font-semibold text-teal-700" href={`/teacher/assignments/${data.assignment.id}/results`}>← Kết quả lớp</Link><h1 className="mt-3 text-3xl font-bold">{data.student.full_name}</h1><p className="mt-2 text-slate-500">{data.assignment.title} • Điểm tự động: {data.submission.auto_score ?? "—"}</p><div className="mt-7 space-y-4">{data.answers.map((answer, index) => <article key={answer.id} className="rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100 p-5 shadow-sm"><p className="font-bold text-teal-700">Câu {index + 1} • {answer.question!.type}</p><h2 className="mt-2 text-lg font-bold">{answer.question!.prompt}</h2><pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-3 text-sm">{JSON.stringify(answer.answer, null, 2)}</pre>{answer.question!.type === "TEXT_INPUT" ? <AnswerAssessmentForm answerId={answer.id} maxPoints={answer.question!.points} initialScore={answer.teacher_score} initialFeedback={answer.teacher_feedback} /> : <p className="mt-3 text-sm font-semibold">Điểm tự động: {answer.auto_score ?? 0} / {answer.question!.points}</p>}</article>)}</div></main>;
}
