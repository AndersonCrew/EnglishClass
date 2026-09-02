import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import {
  getCurrentProfile,
  homePathForRole,
} from "@/features/auth/server/auth-service";
import { PublicFooter } from "@/components/layout/public-footer";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(homePathForRole(profile.role));

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_#ccfbf1,_transparent_38%),linear-gradient(to_bottom,_#f8fafc,_#ecfeff)]">
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <section className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(15,118,110,0.35)] sm:p-10">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/">← Về trang chủ</Link>
        <div className="mb-8">
          <div className="mb-5 mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white">
            E
          </div>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-teal-700">
            EnglishClass
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Chào mừng trở lại</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Giáo viên và học sinh đăng nhập bằng tài khoản đã được cấp.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm leading-6 text-slate-500">
          Nếu quên mật khẩu, hãy liên hệ giáo viên hoặc quản trị viên.
        </p>
        <p className="mt-3 text-center text-sm text-slate-600">Chưa có tài khoản giáo viên?{" "}<Link className="font-semibold text-teal-700 hover:text-teal-900" href="/register">Đăng ký</Link></p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
