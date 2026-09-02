import type { LeaderboardRow } from "@/types/database.generated";

const podiumStyle = {
  1: { medal: "🥇", crown: "♛", card: "from-amber-100 via-yellow-50 to-white ring-amber-300 sm:order-2 sm:-translate-y-3", avatar: "from-amber-400 to-yellow-500", label: "Quán quân" },
  2: { medal: "🥈", crown: "", card: "from-slate-100 via-white to-white ring-slate-300 sm:order-1", avatar: "from-slate-400 to-slate-500", label: "Hạng nhì" },
  3: { medal: "🥉", crown: "", card: "from-orange-100 via-white to-white ring-orange-300 sm:order-3", avatar: "from-orange-400 to-amber-600", label: "Hạng ba" },
} as const;

export function Leaderboard({ title, subtitle, rows, currentStudentId }: { title: string; subtitle: string; rows: LeaderboardRow[]; currentStudentId?: string }) {
  const top = rows.slice(0, 3);
  return <section className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-teal-100/60 ring-1 ring-teal-100">
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-500 px-5 pb-20 pt-7 text-white sm:px-7">
      <div className="absolute -right-12 -top-16 size-48 rounded-full bg-white/10" /><div className="absolute -bottom-24 left-1/4 size-48 rounded-full bg-cyan-200/15" />
      <p className="relative text-xs font-black tracking-[0.2em] text-teal-100">BẢNG XẾP HẠNG</p><h2 className="relative mt-2 text-3xl font-black">{title}</h2><p className="relative mt-2 max-w-2xl text-sm text-teal-50">{subtitle}</p>
    </div>
    {top.length ? <div className="relative -mt-14 grid gap-3 px-5 sm:grid-cols-3 sm:items-end sm:px-7">
      {top.map((row) => {
        const rank = row.rank as 1 | 2 | 3; const style = podiumStyle[rank];
        return <article key={row.student_id} className={`relative rounded-2xl bg-gradient-to-b p-5 text-center shadow-md ring-1 ${style.card} ${row.student_id === currentStudentId ? "ring-2 ring-teal-500" : ""}`}>
          {style.crown && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl text-amber-500 drop-shadow">{style.crown}</span>}
          <div className={`mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br text-2xl font-black text-white shadow-md ${style.avatar}`}>{initials(row.student_name)}</div>
          <div className="mt-2 text-3xl" aria-label={`Hạng ${rank}`}>{style.medal}</div><p className="text-xs font-black uppercase tracking-wider text-slate-500">{style.label}</p>
          <h3 className="mt-1 truncate font-black text-slate-900">{row.student_name}{row.student_id === currentStudentId ? " · Em" : ""}</h3>
          <p className="mt-2 text-2xl font-black text-teal-700">{Number(row.total_score).toFixed(1)}đ</p><p className="mt-1 text-xs font-semibold text-slate-500">{row.completed} bài · {formatDuration(row.total_seconds)}</p>
        </article>;
      })}
    </div> : null}
    <div className="space-y-2 p-5 sm:p-7">{rows.slice(3, 10).map((row) => <div key={row.student_id} className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl px-4 py-3 ${row.student_id === currentStudentId ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`}><span className="grid size-9 place-items-center rounded-xl bg-white font-black text-slate-600 shadow-sm">{row.rank}</span><div className="min-w-0"><p className="truncate font-bold">{row.student_name}{row.student_id === currentStudentId ? " · Em" : ""}</p><p className="text-xs text-slate-500">{row.completed} bài · {formatDuration(row.total_seconds)}</p></div><b className="text-teal-700">{Number(row.total_score).toFixed(1)}đ</b></div>)}{!rows.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Chưa có kết quả đã chấm để xếp hạng.</p>}</div>
  </section>;
}

function initials(name: string) { return name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join(""); }
function formatDuration(seconds: number) { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours}g ${minutes}p` : `${minutes} phút`; }
