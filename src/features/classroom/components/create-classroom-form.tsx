"use client";

import { useActionState } from "react";
import { createClassroomAction, type CreateClassroomState } from "../server/actions";

const initialState: CreateClassroomState = { message: "" };

export function CreateClassroomForm() {
  const [state, action, pending] = useActionState(createClassroomAction, initialState);
  return <form action={action} className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <label className="block text-sm font-bold text-slate-700">Tên lớp<input name="name" defaultValue={state.fields?.name} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" placeholder="Ví dụ: 3A1" required /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Khối<select name="gradeLevel" defaultValue={state.fields?.gradeLevel ?? "1"} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">{[1, 2, 3, 4, 5].map((grade) => <option key={grade} value={grade}>Lớp {grade}</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Năm học<input name="academicYear" defaultValue={state.fields?.academicYear} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="2026–2027" required /></label><label className="block text-sm font-bold text-slate-700">Ngày kết thúc lớp<input name="endsAt" defaultValue={state.fields?.endsAt} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" type="date" required /></label></div>
    {state.message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.message}</p>}
    <button disabled={pending} className="w-full rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-50">{pending ? "Đang tạo lớp..." : "Tạo lớp"}</button>
  </form>;
}
