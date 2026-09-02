"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/features/auth/server/actions";

export function LogoutButton() {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100" type="button">Đăng xuất</button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-2xl ring-1 ring-slate-200">
        <div className="grid size-12 place-items-center rounded-full bg-teal-50 text-2xl">👋</div>
        <h2 id="logout-title" className="mt-4 text-2xl font-bold text-slate-900">Bạn muốn đăng xuất?</h2>
        <p className="mt-2 leading-7 text-slate-600">Bạn sẽ quay về trang đăng nhập. Những dữ liệu đã lưu vẫn được giữ nguyên.</p>
        <form action={logoutAction} className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">Ở lại</button>
          <LogoutSubmitButton />
        </form>
      </div>
    </div>}
  </>;
}

function LogoutSubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-bold text-white shadow-md shadow-teal-200 disabled:opacity-60">{pending && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{pending ? "Đang đăng xuất…" : "Đăng xuất"}</button>;
}
