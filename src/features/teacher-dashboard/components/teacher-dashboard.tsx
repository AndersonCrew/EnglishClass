import Link from "next/link";
import type { CurrentProfile } from "@/features/auth/types";
import type { TeacherDashboardData } from "../types";
import { getGreeting } from "../presentation";

export function TeacherDashboard({ profile, data }: { profile: CurrentProfile; data: TeacherDashboardData }) {
  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
    <section className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 p-7 text-white shadow-xl shadow-teal-200/70 md:flex-row md:items-end sm:p-8">
      <div className="absolute -right-10 -top-12 size-44 rounded-full border-[28px] border-white/10" /><div className="relative"><p className="text-sm font-bold uppercase tracking-wide text-teal-100">Trang chủ giáo viên</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{getGreeting(new Date().getHours())}, {profile.fullName}</h1><p className="mt-2 text-teal-50">Những việc quan trọng trong lớp học của bạn.</p></div>
    </section>

    <section className="py-8" aria-labelledby="overview-title"><h2 id="overview-title" className="text-xl font-bold">Tổng quan</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><SummaryCard value={data.overview.classroomCount} label="Lớp học" /><SummaryCard value={data.overview.studentCount} label="Học sinh" /><SummaryCard value={data.overview.publishedAssignmentCount} label="Bài đang giao" /></div></section>

    <section className="border-t border-slate-200 py-8" aria-labelledby="todo-title"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-amber-700">ƯU TIÊN</p><h2 id="todo-title" className="mt-1 text-2xl font-bold">Cần xử lý</h2></div></div><div className="mt-5 space-y-3">
      {data.pendingManual.map((item) => <ActionItem key={`manual-${item.assignment_id}`} eyebrow={`${item.pending_count} bài đang chờ chấm`} title={item.classroom_name} detail={item.title} href={`/teacher/assignments/${item.assignment_id}/results`} action="Chấm bài" />)}
      {!data.pendingManual.length && <EmptyState text="Hiện tại không có bài nào đang chờ chấm." />}
    </div></section>

    <section id="my-classes" className="border-t border-slate-200 py-8" aria-labelledby="classes-title"><h2 id="classes-title" className="text-2xl font-bold">Lớp học của tôi</h2>{data.classrooms.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.classrooms.map((classroom) => <Link key={classroom.id} href={`/teacher/classes/${classroom.id}/assignments`} className="rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"><p className="text-sm font-semibold text-slate-500">Khối {classroom.gradeLevel}</p><h3 className="mt-1 text-2xl font-bold">{classroom.name}</h3><div className="mt-5 flex gap-5 text-sm text-slate-600"><span><b className="text-slate-900">{classroom.studentCount}</b> học sinh</span><span><b className="text-slate-900">{classroom.activeAssignmentCount}</b> bài đang giao</span></div><span className="mt-5 inline-block font-bold text-teal-700">Vào lớp →</span></Link>)}</div> : <EmptyState text="Bạn chưa có lớp học nào." action="Tạo lớp đầu tiên" href="/teacher/classes/new" />}</section>

  </main>;
}

function SummaryCard({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100 p-5 shadow-sm"><p className="text-3xl font-bold text-slate-900">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>; }
function ActionItem({ eyebrow, title, detail, href, action }: { eyebrow: string; title: string; detail: string; href: string; action: string }) { return <article className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 bg-white p-5 shadow-sm sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-slate-600">{eyebrow}</p><h3 className="mt-1 text-lg font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{detail}</p></div><Link className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-center font-bold hover:bg-slate-50" href={href}>{action}</Link></article>; }
function EmptyState({ text, action, href }: { text: string; action?: string; href?: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="text-slate-500">{text}</p>{action && href && <Link href={href} className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-2 font-bold text-white">{action}</Link>}</div>; }
