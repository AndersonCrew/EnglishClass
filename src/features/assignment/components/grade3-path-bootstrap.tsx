"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { provisionGrade3LearningPathAction } from "../server/actions";

export function Grade3PathBootstrap({ classroomId, enabled }: { classroomId: string; enabled: boolean }) {
  const router = useRouter(); const started = useRef(false); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    startTransition(async () => {
      const result = await provisionGrade3LearningPathAction(classroomId);
      if (result.ok) router.refresh(); else setMessage(result.message);
    });
  }, [classroomId, enabled, router]);
  if (!enabled) return null;
  return <div className={`mt-6 flex items-center gap-3 rounded-2xl p-4 font-semibold ${message ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-800"}`} aria-live="polite">{pending && <span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />}<span>{message || "Đang chuẩn bị sẵn các bài tập khối 3 theo thứ tự dễ đến khó…"}</span></div>;
}
