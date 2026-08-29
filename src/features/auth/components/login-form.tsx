"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/features/auth/server/actions";
import type { LoginState } from "@/features/auth/types";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
          Tài khoản
        </label>
        <input
          autoComplete="username"
          autoFocus
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email hoặc username học sinh"
          required
          type="text"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
          Mật khẩu
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nhập mật khẩu"
          required
          type="password"
          value={password}
        />
      </div>

      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-xl bg-teal-700 px-5 font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
