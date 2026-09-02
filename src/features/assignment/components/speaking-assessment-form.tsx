"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assessSpeakingSubmissionAction } from "../server/actions";

export function SpeakingAssessmentForm({ submissionId, initialScore, initialFeedback }: { submissionId: string; initialScore: number | null; initialFeedback: string | null }) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore?.toString() ?? "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const valid = Number(score) >= 1 && Number(score) <= 10 && feedback.trim().length > 0;

  return <div className="mt-5 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
    <h3 className="text-lg font-black text-slate-900">Kết quả Speaking chung</h3>
    <p className="mt-1 text-sm text-slate-600">Nghe tất cả bản thu phía trên, sau đó chọn một mức điểm và nhập nhận xét chung.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
      <label className="text-sm font-bold">Điểm Speaking<select value={score} onChange={(event) => setScore(event.target.value)} className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3"><option value="">Chọn điểm</option>{Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label>
      <label className="text-sm font-bold">Nhận xét<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-amber-200 bg-white p-3" placeholder="Ví dụ: Em phát âm rõ, cần chú ý âm cuối…" /></label>
    </div>
    {message && <p className={`mt-3 text-sm font-bold ${message.startsWith("Đã") ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>}
    <button disabled={pending || !valid} onClick={() => startTransition(async () => { const result = await assessSpeakingSubmissionAction(submissionId, Number(score), feedback); setMessage(result.message); if (result.ok) router.refresh(); })} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-black text-white shadow-md shadow-teal-200 disabled:opacity-50">{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang lưu kết quả…" : "Lưu kết quả chung"}</button>
  </div>;
}
