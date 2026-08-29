import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/components/register-form";
import { getCurrentProfile, homePathForRole } from "@/features/auth/server/auth-service";

export default async function RegisterPage() {
  const profile = await getCurrentProfile();
  if (profile) redirect(homePathForRole(profile.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,_#ccfbf1,_transparent_36%),linear-gradient(to_bottom,_#f8fafc,_#ecfeff)] px-5 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-white/80 bg-white/95 p-7 shadow-[0_24px_70px_-30px_rgba(15,118,110,0.35)] sm:p-10">
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" href="/">← Về trang chủ</Link>
        <div className="mb-7 mt-5">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Dành cho giáo viên</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Tạo tài khoản EnglishClass</h1>
          <p className="mt-3 leading-7 text-slate-600">Bắt đầu quản lý lớp và theo dõi quá trình học tiếng Anh của học sinh.</p>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}<Link className="font-semibold text-teal-700 hover:text-teal-900" href="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}
