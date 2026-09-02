"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { provisionGrade3LearningPathAction } from "../server/actions";

export function Grade3PathButton({ classroomId }: { classroomId: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState("");
  return <div className="flex flex-col items-end gap-2"><button disabled={pending} onClick={() => startTransition(async () => { const result = await provisionGrade3LearningPathAction(classroomId); setMessage(result.message); if (result.ok) router.refresh(); })} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white shadow-md shadow-teal-200 disabled:opacity-60">{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang tạo lộ trình…" : "Tạo lộ trình khối 3"}</button>{message && <p className={`max-w-md text-right text-sm font-semibold ${message.startsWith("Đã") || message.includes("đầy đủ") ? "text-teal-700" : "text-rose-600"}`}>{message}</p>}</div>;
}
