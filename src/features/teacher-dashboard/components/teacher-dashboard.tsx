import Link from "next/link";
import type { CurrentProfile } from "@/features/auth/types";
import type { DashboardClassroom, TeacherDashboardData } from "../types";
import { getGreeting } from "../presentation";

const classThemes = [
  { accent: "bg-[#ff8364]", soft: "bg-[#fff1eb]", text: "text-[#b83c25]" },
  { accent: "bg-[#45b8ac]", soft: "bg-[#e9f9f6]", text: "text-[#167a71]" },
  { accent: "bg-[#7b78df]", soft: "bg-[#f0efff]", text: "text-[#4f4bb2]" },
  { accent: "bg-[#efad32]", soft: "bg-[#fff7df]", text: "text-[#98650a]" },
];

export function TeacherDashboard({ profile, data }: { profile: CurrentProfile; data: TeacherDashboardData }) {
  return (
    <main className="relative mx-auto max-w-6xl overflow-hidden px-5 pb-16 pt-7 sm:px-8 sm:pt-10">
      <div className="pointer-events-none absolute -left-32 top-32 size-72 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[32rem] size-80 rounded-full bg-cyan-200/25 blur-3xl" />

      <section className="relative overflow-hidden rounded-[28px] border border-[#d9eee9] bg-[#eaf9f5] px-6 py-7 shadow-[0_16px_45px_-30px_rgba(15,118,110,0.45)] sm:px-9 sm:py-9">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-[#b9eee4]" />
        <div className="absolute -bottom-20 right-24 size-44 rounded-full border-[26px] border-white/55" />
        <div className="relative grid items-center gap-7 md:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#157c70] shadow-sm">
              <SparkleIcon /> Không gian của giáo viên
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.035em] text-[#173f45] sm:text-4xl">
              {getGreeting(new Date().getHours())}, {profile.fullName}!
            </h1>
            <p className="mt-2 max-w-xl text-base font-medium leading-7 text-[#52767a]">Cùng xem hôm nay lớp mình có gì cần quan tâm nhé.</p>
          </div>
          <div className="relative hidden h-32 w-44 md:block" aria-hidden="true">
            <div className="absolute bottom-1 right-3 h-24 w-32 rotate-3 rounded-2xl bg-white shadow-lg shadow-teal-800/10">
              <div className="mx-4 mt-5 h-2 rounded-full bg-[#ffb452]" /><div className="mx-4 mt-3 h-2 w-20 rounded-full bg-[#b7ddd7]" /><div className="mx-4 mt-3 h-2 w-14 rounded-full bg-[#b7ddd7]" />
            </div>
            <div className="absolute bottom-2 left-0 grid size-16 -rotate-6 place-items-center rounded-2xl bg-[#ff8065] text-3xl text-white shadow-lg shadow-orange-800/15">✓</div>
            <span className="absolute right-0 top-0 text-3xl text-[#f4b83f]">✦</span>
          </div>
        </div>
      </section>

      <section className="relative py-8" aria-labelledby="overview-title">
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#169084]">Hôm nay</p><h2 id="overview-title" className="mt-1 text-2xl font-black tracking-tight text-slate-900">Tổng quan nhanh</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard value={data.overview.classroomCount} label="Lớp đang quản lý" variant="coral" icon={<ClassIcon />} />
          <SummaryCard value={data.overview.studentCount} label="Học sinh" variant="teal" icon={<StudentIcon />} />
          <SummaryCard value={data.overview.publishedAssignmentCount} label="Bài đang giao" variant="violet" icon={<BookIcon />} />
        </div>
      </section>

      <section className="relative rounded-[24px] border border-[#f1dfb7] bg-[#fffaf0] p-5 sm:p-6" aria-labelledby="todo-title">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#ffe5a6] text-[#9d6800]"><BellIcon /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a96d00]">Ưu tiên</p><h2 id="todo-title" className="mt-0.5 text-xl font-black text-[#493b20]">Việc cần xử lý</h2></div></div>
          {data.pendingManual.length > 0 && <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#a46600] shadow-sm">{data.pendingManual.length} lớp đang chờ</span>}
        </div>
        <div className="mt-5 space-y-3">
          {data.pendingManual.map((item) => <ActionItem key={`manual-${item.assignment_id}`} count={item.pending_count} title={item.classroom_name} detail={item.title} href={`/teacher/assignments/${item.assignment_id}/results`} />)}
          {!data.pendingManual.length && <EmptyState text="Tuyệt vời! Hiện không có bài nào đang chờ chấm." icon="✓" />}
        </div>
      </section>

      <section id="my-classes" className="relative pt-10" aria-labelledby="classes-title">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#169084]">Không gian giảng dạy</p><h2 id="classes-title" className="mt-1 text-2xl font-black tracking-tight text-slate-900">Lớp học của tôi</h2><p className="mt-1 text-sm font-medium text-slate-500">Chọn một lớp để xem học sinh, bài tập và kết quả.</p></div>
          <Link href="/teacher/classes/new" className="hidden shrink-0 items-center gap-2 rounded-xl bg-[#159c8d] px-4 py-2.5 font-black text-white shadow-[0_7px_16px_-9px_rgba(13,148,136,0.8)] transition hover:-translate-y-0.5 hover:bg-[#0f887b] sm:flex"><span className="text-lg leading-none">+</span> Tạo lớp</Link>
        </div>
        {data.classrooms.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.classrooms.map((classroom, index) => <ClassroomCard key={classroom.id} classroom={classroom} index={index} />)}</div> : <EmptyState text="Bạn chưa có lớp học nào." action="Tạo lớp đầu tiên" href="/teacher/classes/new" icon="✦" />}
        <Link href="/teacher/classes/new" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#159c8d] px-4 py-3 font-black text-white shadow-[0_7px_16px_-9px_rgba(13,148,136,0.8)] sm:hidden"><span className="text-lg">+</span> Tạo lớp</Link>
      </section>
    </main>
  );
}

function SummaryCard({ value, label, variant, icon }: { value: number; label: string; variant: "coral" | "teal" | "violet"; icon: React.ReactNode }) {
  const styles = { coral: "bg-[#fff3ee] text-[#c54a31]", teal: "bg-[#ebfaf7] text-[#168578]", violet: "bg-[#f2f0ff] text-[#5b56bd]" }[variant];
  return <article className="flex items-center gap-4 rounded-[20px] border border-white bg-white p-5 shadow-[0_12px_35px_-26px_rgba(15,23,42,0.55)] ring-1 ring-slate-100"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${styles}`}>{icon}</span><div><p className="text-3xl font-black leading-none tracking-tight text-[#183b42]">{value}</p><p className="mt-1.5 text-sm font-bold text-slate-500">{label}</p></div></article>;
}

function ClassroomCard({ classroom, index }: { classroom: DashboardClassroom; index: number }) {
  const theme = classThemes[index % classThemes.length];
  return <Link href={`/teacher/classes/${classroom.id}`} className="group relative overflow-hidden rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.65)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_-27px_rgba(15,118,110,0.5)]">
    <div className={`absolute inset-x-0 top-0 h-1.5 ${theme.accent}`} />
    <div className="flex items-start justify-between gap-3 pt-1"><div><p className={`text-xs font-black uppercase tracking-[0.14em] ${theme.text}`}>Khối {classroom.gradeLevel}</p><h3 className="mt-1.5 text-2xl font-black tracking-tight text-[#173c43]">{classroom.name}</h3></div><span className={`grid size-11 place-items-center rounded-2xl ${theme.soft} ${theme.text}`}><ClassIcon /></span></div>
    <div className="mt-5 flex gap-5 border-y border-slate-100 py-4"><div><b className="block text-xl font-black text-[#173c43]">{classroom.studentCount}</b><span className="text-xs font-bold text-slate-500">Học sinh</span></div><div className="w-px bg-slate-100" /><div><b className="block text-xl font-black text-[#173c43]">{classroom.activeAssignmentCount}</b><span className="text-xs font-bold text-slate-500">Bài đang giao</span></div></div>
    <span className={`mt-4 flex items-center justify-between text-sm font-black ${theme.text}`}>Mở lớp học <b className={`grid size-8 place-items-center rounded-full ${theme.soft} transition group-hover:translate-x-1`}>→</b></span>
  </Link>;
}

function ActionItem({ count, title, detail, href }: { count: number; title: string; detail: string; href: string }) {
  return <article className="flex flex-col justify-between gap-4 rounded-[18px] border border-[#f2e6c9] bg-white p-4 shadow-sm sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff0d1] text-base font-black text-[#a66800]">{count}</span><div className="min-w-0"><h3 className="font-black text-[#263f43]">{title}</h3><p className="mt-0.5 truncate text-sm font-medium text-slate-500">{detail} · {count} bài chờ chấm</p></div></div><Link className="shrink-0 rounded-xl bg-[#159c8d] px-4 py-2.5 text-center text-sm font-black text-white shadow-[0_7px_15px_-9px_rgba(13,148,136,0.8)] transition hover:bg-[#0f887b]" href={href}>Chấm bài →</Link></article>;
}

function EmptyState({ text, action, href, icon }: { text: string; action?: string; href?: string; icon: string }) {
  return <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/75 p-7 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-[#e9f8f5] font-black text-[#168578]">{icon}</span><p className="mt-3 font-semibold text-slate-500">{text}</p>{action && href && <Link href={href} className="mt-4 inline-block rounded-xl bg-[#159c8d] px-4 py-2.5 font-black text-white">{action}</Link>}</div>;
}

function SparkleIcon() { return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z" /><path d="m19 15 .7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15Z" /></svg>; }
function ClassIcon() { return <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8" /></svg>; }
function StudentIcon() { return <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-3.4 2.2-5 5.5-5s5.1 1.6 5.5 5M16 5.3a3 3 0 0 1 0 5.4M17 14c2.2.5 3.3 2.2 3.5 5" /></svg>; }
function BookIcon() { return <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3V5ZM20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 3V5Z" /></svg>; }
function BellIcon() { return <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></svg>; }
