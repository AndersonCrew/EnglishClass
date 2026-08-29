"use client";

import { useActionState } from "react";

import { registerTeacherAction } from "@/features/auth/server/actions";
import type { RegisterState } from "@/features/auth/types";

const initialState: RegisterState = { error: null, success: null };
const inputClassName =
  "min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerTeacherAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="fullName">
          Họ và tên giáo viên
        </label>
        <input autoComplete="name" autoFocus className={inputClassName} id="fullName" maxLength={120} name="fullName" placeholder="Nguyễn Minh Anh" required />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
          Email
        </label>
        <input autoComplete="email" className={inputClassName} id="email" name="email" placeholder="giaovien@example.com" required type="email" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="password">Mật khẩu</label>
          <input autoComplete="new-password" className={inputClassName} id="password" minLength={8} name="password" placeholder="Ít nhất 8 ký tự" required type="password" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700" htmlFor="confirmPassword">Nhập lại mật khẩu</label>
          <input autoComplete="new-password" className={inputClassName} id="confirmPassword" minLength={8} name="confirmPassword" placeholder="Nhập lại mật khẩu" required type="password" />
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-500">Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số.</p>
      {state.error ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700" role="alert">{state.error}</p> : null}
      {state.success ? <p aria-live="polite" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-800" role="status">{state.success}</p> : null}
      <button className="min-h-12 w-full rounded-xl bg-teal-700 px-5 font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60" disabled={isPending || Boolean(state.success)} type="submit">
        {isPending ? "Đang tạo tài khoản…" : "Tạo tài khoản giáo viên"}
      </button>
    </form>
  );
}
