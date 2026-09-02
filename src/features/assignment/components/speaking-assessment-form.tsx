"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assessAnswerAction } from "../server/actions";

type SpeakingAnswer = { id: string; prompt: string; teacherScore: number | null; teacherFeedback: string | null };
type GradeValue = { score: string; feedback: string };

export function SpeakingAssessmentForm({ answers }: { answers: SpeakingAnswer[] }) {
  const router = useRouter();
  const [grades, setGrades] = useState<Record<string, GradeValue>>(() => Object.fromEntries(answers.map((answer) => [answer.id, { score: answer.teacherScore?.toString() ?? "", feedback: answer.teacherFeedback ?? "" }])));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const valid = answers.length > 0 && answers.every((answer) => { const grade = grades[answer.id]; return Number(grade?.score) >= 1 && Number(grade?.score) <= 10 && Boolean(grade?.feedback.trim()); });

  const update = (answerId: string, value: Partial<GradeValue>) => setGrades((current) => ({ ...current, [answerId]: { ...current[answerId], ...value } }));
  const saveAll = () => startTransition(async () => {
    setMessage("");
    for (const answer of answers) {
      const grade = grades[answer.id];
      const result = await assessAnswerAction(answer.id, Number(grade.score), grade.feedback);
      if (!result.ok) { setMessage(result.message); return; }
    }
    setMessage("Đã lưu điểm và nhận xét riêng cho từng câu Speaking.");
    router.refresh();
  });

  return <div className="mt-5 space-y-4">
    {answers.map((answer, index) => {
      const grade = grades[answer.id];
      return <div key={answer.id} className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
        <h3 className="font-black text-slate-900">Chấm câu Speaking {index + 1}</h3>
        <p className="mt-1 text-sm text-slate-600">{answer.prompt}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
          <label className="text-sm font-bold">Điểm câu này<select value={grade.score} onChange={(event) => update(answer.id, { score: event.target.value })} className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3"><option value="">Chọn điểm</option>{Array.from({ length: 10 }, (_, itemIndex) => itemIndex + 1).map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label>
          <label className="text-sm font-bold">Nhận xét riêng<textarea value={grade.feedback} onChange={(event) => update(answer.id, { feedback: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-amber-200 bg-white p-3" placeholder="Ví dụ: Câu này em phát âm rõ, cần chú ý âm cuối…" /></label>
        </div>
      </div>;
    })}
    {message && <p className={`rounded-xl p-4 text-sm font-bold ${message.startsWith("Đã") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message}</p>}
    <button disabled={pending || !valid} onClick={saveAll} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-black text-white shadow-md shadow-teal-200 disabled:opacity-50">{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang lưu từng câu…" : "Lưu kết quả Speaking"}</button>
  </div>;
}
