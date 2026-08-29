import Link from "next/link";

import { getCurrentProfile, homePathForRole } from "@/features/auth/server/auth-service";

const steps = [
  ["01", "Giáo viên giao nhiệm vụ"],
  ["02", "Học sinh thực hiện và nộp bài"],
  ["03", "Giáo viên đánh giá, nhận xét"],
  ["04", "Theo dõi sự tiến bộ"],
];

interface HomePageProps {
  searchParams: Promise<{ registered?: string | string[] }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { registered } = await searchParams;
  const profile = await getCurrentProfile();
  const dashboardPath = profile ? homePathForRole(profile.role) : null;
  const registrationMessage =
    registered === "confirm"
      ? "Tạo tài khoản thành công. Hãy kiểm tra email xác nhận rồi đăng nhập."
      : registered === "success"
        ? "Tạo tài khoản giáo viên thành công. Bạn có thể đăng nhập ngay."
        : null;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="relative isolate">
        <div className="absolute -left-32 top-12 -z-10 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute right-0 top-72 -z-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        {registrationMessage ? (
          <div className="border-b border-teal-300/20 bg-teal-300/10 px-5 py-3 text-center text-sm font-semibold text-teal-100" role="status">
            {registrationMessage}{" "}
            <Link className="underline underline-offset-4 hover:text-white" href="/login">Đăng nhập</Link>
          </div>
        ) : null}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <Link className="text-xl font-bold tracking-tight" href="/">English<span className="text-teal-400">Class</span></Link>
          <nav aria-label="Tài khoản" className="flex items-center gap-2 sm:gap-3">
            {dashboardPath ? (
              <Link className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-50" href={dashboardPath}>Vào trang của tôi</Link>
            ) : (
              <>
                <Link className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10" href="/login">Đăng nhập</Link>
                <Link className="rounded-xl bg-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-teal-300" href="/register">Đăng ký giáo viên</Link>
              </>
            )}
          </nav>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-sm font-semibold text-teal-200">Tiếng Anh tiểu học • Lớp 1 đến lớp 5</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Theo dõi từng bước tiến bộ của học sinh</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Một nơi để giáo viên giao nhiệm vụ nghe, nói, đọc, viết; học sinh hoàn thành bài và nhận phản hồi rõ ràng.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {dashboardPath ? (
                <Link className="rounded-xl bg-teal-400 px-6 py-3.5 text-center font-bold text-slate-950 hover:bg-teal-300" href={dashboardPath}>Vào trang của tôi</Link>
              ) : (
                <>
                  <Link className="rounded-xl bg-teal-400 px-6 py-3.5 text-center font-bold text-slate-950 hover:bg-teal-300" href="/register">Bắt đầu với vai trò giáo viên</Link>
                  <Link className="rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-center font-semibold hover:bg-white/10" href="/login">Tôi đã có tài khoản</Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur sm:p-7">
            <div className="rounded-2xl bg-white p-6 text-slate-950">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-semibold text-teal-700">QUY TRÌNH HỌC TẬP</p><p className="mt-1 text-xl font-bold">Đơn giản và liên tục</p></div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800">4</div>
              </div>
              <ol className="mt-7 space-y-4">
                {steps.map(([number, label]) => (
                  <li className="flex items-center gap-4" key={number}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{number}</span>
                    <span className="font-semibold text-slate-700">{label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>

      <section className="border-t border-white/10 bg-slate-900/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:grid-cols-3 sm:px-8">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-bold text-teal-300">4 kỹ năng</h2><p className="mt-3 leading-7 text-slate-300">Listening, Speaking, Reading và Writing trong cùng một quy trình.</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-bold text-teal-300">Dễ sử dụng</h2><p className="mt-3 leading-7 text-slate-300">Giao diện rõ ràng cho giáo viên và thao tác đơn giản cho học sinh.</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-bold text-teal-300">Đúng trọng tâm</h2><p className="mt-3 leading-7 text-slate-300">Tập trung vào giao bài, nộp bài, đánh giá và theo dõi tiến bộ.</p></article>
        </div>
      </section>
    </main>
  );
}
