import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Leaderboard } from "@/features/assignment/components/leaderboard";
import { getClassLeaderboard, getTeacherAssignments } from "@/features/assignment/server/queries";
import { StudentManager } from "@/features/students/components/student-manager";
import { getClassroomStudents } from "@/features/students/server/student-service";

interface Props { params: Promise<{ classId: string }> }

export default async function ClassroomDetailPage({ params }: Props) {
  const { classId } = await params;
  const [studentData, learningData, leaderboard] = await Promise.all([
    getClassroomStudents(classId),
    getTeacherAssignments(classId),
    getClassLeaderboard(classId),
  ]);
  if (!studentData || !learningData) notFound();

  const now = new Date(learningData.serverNow).getTime();
  const isOpen = (assignment: { status: string; closes_at: string | null }) =>
    assignment.status === "PUBLISHED" && Boolean(assignment.closes_at) && new Date(assignment.closes_at!).getTime() > now;

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-teal-700">LỚP HỌC</p>
        <h1 className="mt-2 text-3xl font-bold">{studentData.classroom.name}</h1>
        <p className="mt-2 text-slate-500">Khối {studentData.classroom.gradeLevel} • Năm học {studentData.classroom.academicYear}</p>
      </div>
      <Link href={`/teacher/classes/${classId}/assignments`} className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white shadow-md shadow-teal-200">Quản lý bài tập</Link>
    </div>

    <details className="group mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-teal-100">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-teal-700">HỌC SINH</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Xem danh sách lớp</h2>
          <p className="mt-1 text-sm text-slate-500">{studentData.students.length} học sinh • thêm, sửa và quản lý tài khoản</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-xl font-bold text-teal-700 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-teal-100 px-1 pb-1 sm:px-2">
        <StudentManager classroomId={studentData.classroom.id} classroomName={studentData.classroom.name} initialStudents={studentData.students} />
      </div>
    </details>

    <div className="mt-8"><Leaderboard title={`Xếp hạng lớp ${studentData.classroom.name}`} subtitle="Ưu tiên tổng điểm; nếu bằng điểm, học sinh làm nhanh hơn xếp trên." rows={leaderboard} /></div>

    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[0.16em] text-amber-700">CẦN CHẤM</p><h2 className="mt-1 text-2xl font-black">Bài học sinh đã nộp</h2></div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">{learningData.pendingSubmissions.length} bài</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {learningData.pendingSubmissions.map((submission) => <Link key={submission.id} href={`/teacher/submissions/${submission.id}`} className="group flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:ring-amber-300">
          <div className="min-w-0"><p className="truncate font-black text-slate-900">{submission.studentName}</p><p className="mt-1 truncate text-sm font-semibold text-slate-600">{submission.assignmentTitle}</p><p className="mt-1 text-xs text-slate-400">{submission.submittedAt ? `Nộp ${new Date(submission.submittedAt).toLocaleString("vi-VN")}` : "Đã nộp bài"}</p></div>
          <span className="shrink-0 font-black text-teal-700">Chấm →</span>
        </Link>)}
        {!learningData.pendingSubmissions.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm font-semibold text-slate-500 sm:col-span-2">Hiện chưa có bài mới cần chấm.</div>}
      </div>
    </section>

    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[0.16em] text-teal-700">ASSIGNMENT</p><h2 className="mt-1 text-2xl font-black">Danh sách bài tập</h2></div>
        <Link href={`/teacher/classes/${classId}/assignments`} className="text-sm font-bold text-teal-700">Xem tất cả →</Link>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {learningData.assignments.map((assignment, index) => {
          const cover = assignment.cover_image_path ?? `/images/grade3/lesson-${String(Math.min(index + 1, 12)).padStart(2, "0")}.webp`;
          const open = isOpen(assignment);
          return <Link key={assignment.id} href={`/teacher/classes/${classId}/assignments`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src={cover} alt={`Ảnh bìa ${assignment.title}`} fill sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
              <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-slate-950/70 to-transparent px-4 pb-10 pt-4 text-white">
                <div className="flex items-center gap-2"><span className="rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[11px] font-black backdrop-blur">LEVEL {assignment.level}</span>{open && <span className="rounded-full bg-emerald-500/85 px-2.5 py-1 text-[11px] font-bold">Đang mở</span>}</div>
                <h3 className="mt-2 line-clamp-2 font-black leading-snug drop-shadow">{assignment.title}</h3>
              </div>
            </div>
          </Link>;
        })}
      </div>
    </section>
  </main>;
}
