export default function AdminLoading() {
  return <main className="p-6 lg:p-10" aria-live="polite"><div className="flex items-center gap-3 text-sm font-semibold text-teal-800"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang tải dữ liệu…</div><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-28 animate-pulse rounded-2xl border border-teal-100 bg-white/80" key={index} />)}</div></main>;
}
