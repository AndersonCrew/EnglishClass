"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assessAnswerAction } from "../server/actions";

export function AnswerAssessmentForm({ answerId, maxPoints, initialScore, initialFeedback }: { answerId: string; maxPoints: number; initialScore: number | null; initialFeedback: string | null }) {
  const allowedMaximum = Math.min(maxPoints, 10);
  const router = useRouter(); const [score, setScore] = useState(initialScore?.toString() ?? ""); const [feedback, setFeedback] = useState(initialFeedback ?? ""); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  return <div className="mt-4 grid gap-3 rounded-xl bg-amber-50 p-4 sm:grid-cols-[120px_1fr_auto]"><label className="text-sm font-semibold">Điểm / {allowedMaximum}<input type="number" min="0" max={allowedMaximum} step="0.5" className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2" value={score} onChange={(e) => setScore(e.target.value)} /></label><label className="text-sm font-semibold">Nhận xét<input className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2" value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label><button disabled={pending || score === "" || Number(score) < 0 || Number(score) > allowedMaximum} className="flex min-w-32 items-center justify-center gap-2 self-end rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50" onClick={() => startTransition(async () => { const result = await assessAnswerAction(answerId, Number(score), feedback); setMessage(result.message); if (result.ok) router.refresh(); })}>{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang lưu…" : "Lưu đánh giá"}</button>{message && <p className="text-sm font-semibold text-amber-800 sm:col-span-3">{message}</p>}</div>;
}
