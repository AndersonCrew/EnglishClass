"use client";

import { useActionState } from "react";
import { changeStudentPasswordAction } from "../server/change-password-action";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeStudentPasswordAction, { error: "" });
  return <form action={action} className="mt-6 space-y-4"><label className="block text-sm font-bold">Mật khẩu mới<input name="password" type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" required /></label><label className="block text-sm font-bold">Nhập lại mật khẩu<input name="confirmPassword" type="password" autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" required /></label>{state.error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</p>}<button disabled={pending} className="min-h-12 w-full rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-50">{pending ? "Đang lưu..." : "Đổi mật khẩu và tiếp tục"}</button></form>;
}
