import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentStatusActions } from "@/features/assignment/components/assignment-status-actions";
import { Grade3PathBootstrap } from "@/features/assignment/components/grade3-path-bootstrap";
import { Leaderboard } from "@/features/assignment/components/leaderboard";
import { getClassLeaderboard, getTeacherAssignments } from "@/features/assignment/server/queries";
import { ClassDetailTabs, type ClassTab } from "@/features/classroom/components/class-detail-tabs";
import { StudentManager } from "@/features/students/components/student-manager";
import { getClassroomStudents } from "@/features/students/server/student-service";

const validTabs = new Set<ClassTab>(["overview", "assignments", "students", "add-students", "ranking"]);

interface Props { params: Promise<{ classId: string }>; searchParams: Promise<{ tab?: string }> }

export default async function ClassroomDetailPage({ params, searchParams }: Props) {
  const [{ classId }, query] = await Promise.all([params, searchParams]);
  const [studentData, learningData, leaderboard] = await Promise.all([getClassroomStudents(classId), getTeacherAssignments(classId), getClassLeaderboard(classId)]);
  if (!studentData || !learningData) notFound();

  const initialTab = validTabs.has(query.tab as ClassTab) ? query.tab as ClassTab : "overview";
  const now = new Date(learningData.serverNow).getTime();
  const isOpen = (assignment: { status: string; closes_at: string | null }) => assignment.status === "PUBLISHED" && Boolean(assignment.closes_at) && new Date(assignment.closes_at!).getTime() > now;
  const openCount = learningData.assignments.filter(isOpen).length;

  const overview = <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Học sinh" value={studentData.students.length} accent="teal" />
      <Metric label="Bài tập" value={learningData.assignments.length} accent="cyan" />
      <Metric label="Đang mở" value={openCount} accent="emerald" />
      <Metric label="Chờ chấm" value={learningData.pendingSubmissions.length} accent="amber" />
    </div>
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-7">
      <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-amber-700">CẦN XỬ LÝ</p><h2 className="mt-1 text-2xl font-black">Bài học sinh chờ chấm</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">{learningData.pendingSubmissions.length} bài</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{learningData.pendingSubmissions.map((submission) => <Link key={submission.id} href={`/teacher/submissions/${submission.id}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/50 hover:shadow-md"><div className="min-w-0"><p className="truncate font-black">{submission.studentName}</p><p className="mt-1 truncate text-sm font-semibold text-slate-600">{submission.assignmentTitle}</p><p className="mt-1 text-xs text-slate-400">{submission.submittedAt ? `Nộp ${new Date(submission.submittedAt).toLocaleString("vi-VN")}` : "Đã nộp bài"}</p></div><span className="shrink-0 rounded-xl bg-teal-600 px-3 py-2 text-sm font-black text-white shadow-sm">Chấm →</span></Link>)}{!learningData.pendingSubmissions.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500 sm:col-span-2">Tuyệt! Hiện không có bài nào đang chờ chấm.</div>}</div>
    </section>
  </div>;

  const assignments = <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-teal-100 sm:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[0.18em] text-teal-700">LỘ TRÌNH KHỐI {learningData.classroom.grade_level}</p><h2 className="mt-1 text-2xl font-black">Danh sách bài tập</h2><p className="mt-1 text-sm text-slate-500">Chọn bài đang khóa để mở; chọn bài đang mở để xem kết quả.</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-black text-teal-800">{openCount}/{learningData.assignments.length} đang mở</span></div>
    <Grade3PathBootstrap classroomId={classId} enabled={learningData.classroom.grade_level === 3 && learningData.assignments.filter((item) => item.curriculum_code?.startsWith("G3-")).length < 12} />
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{learningData.assignments.map((assignment, index) => {
      const open = isOpen(assignment); const cover = assignment.cover_image_path ?? `/images/grade3/lesson-${String(Math.min(index + 1, 12)).padStart(2, "0")}.webp`;
      return <article key={assignment.id} className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${open ? "ring-teal-200" : "ring-slate-200"}`}><div className="relative aspect-[4/3] overflow-hidden bg-slate-100"><Image src={cover} fill sizes="(min-width:1280px) 300px, (min-width:640px) 50vw, 100vw" alt={`Ảnh bìa ${assignment.title}`} className={`object-cover transition duration-300 group-hover:scale-[1.03] ${open ? "" : "saturate-[.8]"}`} /><div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/70 via-slate-950/30 to-transparent px-4 pb-12 pt-4 text-white"><div className="flex gap-2"><span className="rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-black backdrop-blur">LEVEL {assignment.level}</span>{open && <span className="rounded-full bg-emerald-500/85 px-2.5 py-1 text-[11px] font-black">Đang mở</span>}</div><h3 className="mt-3 line-clamp-2 font-black leading-snug drop-shadow">{assignment.title}</h3></div>{open && assignment.closes_at && <p className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-white/30 bg-slate-950/40 px-3 py-2 text-xs font-bold text-white backdrop-blur">Tự đóng {new Date(assignment.closes_at).toLocaleString("vi-VN")}</p>}</div>{open ? <Link href={`/teacher/assignments/${assignment.id}/results`} className="absolute inset-0 z-20" aria-label={`Xem kết quả ${assignment.title}`} /> : <AssignmentStatusActions assignmentId={assignment.id} classroomId={classId} locked />}</article>;
    })}{!learningData.assignments.length && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center font-semibold text-slate-500">Đang chuẩn bị bài tập theo khối…</div>}</div>
  </section>;

  return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
    <Link href="/teacher" className="text-sm font-bold text-teal-700">← Trang chủ giáo viên</Link>
    <section className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-500 px-6 py-7 text-white shadow-lg shadow-teal-200/60 sm:px-9 sm:py-9">
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-white/10" /><div className="absolute -bottom-24 left-1/3 size-52 rounded-full bg-cyan-200/15" />
      <div className="relative flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black tracking-[0.22em] text-teal-100">KHÔNG GIAN LỚP HỌC</p><h1 className="mt-2 text-4xl font-black">{studentData.classroom.name}</h1><p className="mt-2 font-semibold text-teal-50">Khối {studentData.classroom.gradeLevel} · Năm học {studentData.classroom.academicYear}</p></div><div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur"><b className="block text-2xl">{studentData.students.length}</b><span className="text-xs font-bold text-teal-50">Học sinh</span></div><div className="rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur"><b className="block text-2xl">{openCount}</b><span className="text-xs font-bold text-teal-50">Bài đang mở</span></div></div></div>
    </section>
    <ClassDetailTabs initialTab={initialTab} badges={{ assignments: learningData.assignments.length, students: studentData.students.length, ranking: leaderboard.length }} panels={{
      overview,
      assignments,
      students: <StudentManager classroomId={studentData.classroom.id} classroomName={studentData.classroom.name} initialStudents={studentData.students} focus="manage" />,
      "add-students": <StudentManager classroomId={studentData.classroom.id} classroomName={studentData.classroom.name} initialStudents={studentData.students} focus="add" />,
      ranking: <Leaderboard title={`Xếp hạng lớp ${studentData.classroom.name}`} subtitle="Tổng điểm cao hơn xếp trước; nếu bằng điểm, học sinh hoàn thành nhanh hơn sẽ đứng trên." rows={leaderboard} />,
    }} />
  </main>;
}

function Metric({ label, value, accent }: { label: string; value: number; accent: "teal" | "cyan" | "emerald" | "amber" }) {
  const colors = { teal: "from-teal-50 to-white text-teal-700 ring-teal-100", cyan: "from-cyan-50 to-white text-cyan-700 ring-cyan-100", emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100", amber: "from-amber-50 to-white text-amber-700 ring-amber-100" };
  return <div className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${colors[accent]}`}><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
