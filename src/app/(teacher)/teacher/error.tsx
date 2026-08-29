"use client";

export default function TeacherError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-3xl px-5 py-16 text-center"><div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">Không thể tải trang chủ</h1><p className="mt-3 text-slate-600">Dữ liệu tạm thời chưa tải được. Bạn hãy thử lại.</p><button onClick={reset} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Thử lại</button></div></main>;
}
