"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openAssignmentUntilAction } from "../server/actions";

function defaultCloseTime() {
  const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(20, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function AssignmentStatusActions({ assignmentId, classroomId, locked }: { assignmentId: string; classroomId: string; locked: boolean }) {
  const router = useRouter(); const [minimumTime] = useState(() => { const date = new Date(Date.now() + 5 * 60_000); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); });
  const [dialogOpen, setDialogOpen] = useState(false); const [closesAt, setClosesAt] = useState(() => defaultCloseTime()); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  if (!locked) return null;
  const run = () => startTransition(async () => { const result = await openAssignmentUntilAction(assignmentId, classroomId, closesAt); setMessage(result.message); if (result.ok) { setDialogOpen(false); router.refresh(); } });
  return <>
    <button type="button" onClick={() => { setMessage(""); setDialogOpen(true); }} className="group/lock absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950/20 via-cyan-950/20 to-teal-900/30 backdrop-blur-[2px] transition hover:from-slate-950/10 hover:to-teal-900/20" aria-label="Mở bài tập">
      <Image src="/images/grade3/glass-lock.webp" width={112} height={112} alt="Bài tập đang khóa" className="size-24 object-contain drop-shadow-[0_12px_22px_rgba(6,182,212,0.35)] transition duration-300 group-hover/lock:-translate-y-1 group-hover/lock:scale-105" />
      <span className="mt-2 rounded-full border border-white/40 bg-white/20 px-4 py-1.5 text-sm font-black text-white shadow-lg backdrop-blur-md">Chạm để mở bài</span>
    </button>
    {dialogOpen && createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setDialogOpen(false); }}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl">
        <div className="flex items-center gap-4"><div className="grid size-20 shrink-0 place-items-center rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-teal-100/60 shadow-inner"><Image src="/images/grade3/glass-lock.webp" width={72} height={72} alt="Mở khóa bài tập" className="size-16 object-contain" /></div><div><p className="text-xs font-bold tracking-wider text-teal-700">MỞ BÀI TẬP</p><h2 className="mt-1 text-2xl font-bold">Cho học sinh làm bài này?</h2></div></div>
        <p className="mt-4 leading-7 text-slate-600">Bài sẽ mở ngay và tự động khóa khi hết thời gian. Sau khi mở, giáo viên không thể đóng thủ công.</p>
        <label className="mt-5 block text-sm font-bold text-slate-700">Thời gian tự đóng<input type="datetime-local" min={minimumTime} value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
        {message && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={pending} onClick={() => setDialogOpen(false)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold">Huỷ</button><button disabled={pending || !closesAt} onClick={run} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-md shadow-teal-200 disabled:opacity-60">{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang mở…" : "Mở bài ngay"}</button></div>
      </div>
    </div>, document.body)}
  </>;
}
