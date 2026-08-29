export default function TeacherLoading() {
  return <main className="mx-auto max-w-6xl animate-pulse px-5 py-8 sm:px-8"><div className="h-28 rounded-2xl bg-slate-200" /><div className="mt-8 grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200" />)}</div><div className="mt-8 h-8 w-48 rounded bg-slate-200" /><div className="mt-5 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200" />)}</div></main>;
}
