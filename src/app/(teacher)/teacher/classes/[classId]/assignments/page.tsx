import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentStatusActions } from "@/features/assignment/components/assignment-status-actions";
import { Grade3PathBootstrap } from "@/features/assignment/components/grade3-path-bootstrap";
import { getTeacherAssignments } from "@/features/assignment/server/queries";

export default async function AssignmentsPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const data = await getTeacherAssignments(classId);
  if (!data) notFound();

  const now = new Date(data.serverNow).getTime();
  const isOpen = (item: { status: string; closes_at: string | null }) =>
    item.status === "PUBLISHED" && Boolean(item.closes_at) && new Date(item.closes_at!).getTime() > now;

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <Link href={`/teacher/classes/${classId}`} className="text-sm font-semibold text-teal-700">← {data.classroom.name}</Link>
        <p className="mt-5 text-xs font-bold tracking-[0.2em] text-teal-700">BÀI TẬP THEO KHỐI</p>
        <h1 className="mt-2 text-3xl font-bold">Bài tập khối {data.classroom.grade_level}</h1>
        <p className="mt-2 text-slate-500">Chọn bài đang khóa để mở cho lớp. Chọn bài đang mở để xem chi tiết.</p>
      </div>
    </div>

    <Grade3PathBootstrap classroomId={classId} enabled={data.classroom.grade_level === 3 && data.assignments.filter((item) => item.curriculum_code?.startsWith("G3-")).length < 12} />

    <div className="mt-7 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 p-5 ring-1 ring-teal-100">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Tổng số bài" value={data.assignments.length} />
        <Metric label="Đang mở" value={data.assignments.filter(isOpen).length} />
        <Metric label="Học sinh trong lớp" value={data.studentCount} />
      </div>
    </div>

    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.assignments.length ? data.assignments.map((assignment, index) => {
        const open = isOpen(assignment);
        const cover = assignment.cover_image_path ?? `/images/grade3/lesson-${String(Math.min(index + 1, 12)).padStart(2, "0")}.webp`;

        return <article key={assignment.id} className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${open ? "ring-teal-200" : "ring-slate-200"}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <Image src={cover} fill sizes="(min-width:1280px) 360px, (min-width:640px) 50vw, 100vw" alt={`Ảnh bìa ${assignment.title}`} className={`object-cover transition duration-300 group-hover:scale-[1.03] ${open ? "" : "scale-[1.02] saturate-[.8]"}`} />
            <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-slate-950/65 via-slate-950/25 to-transparent px-4 pb-12 pt-4 text-white">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/40 bg-white/20 px-3 py-1 text-xs font-black shadow-sm backdrop-blur-md">LEVEL {assignment.level}</span>
                {open && <span className="rounded-full border border-white/30 bg-emerald-500/80 px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md">Đang mở</span>}
              </div>
              <h2 className="mt-3 line-clamp-2 text-lg font-black leading-snug drop-shadow-md">{assignment.title}</h2>
            </div>
            {open && assignment.closes_at && <p className="absolute inset-x-3 bottom-3 z-10 rounded-xl border border-white/30 bg-slate-950/35 px-3 py-2 text-xs font-bold text-white shadow-sm backdrop-blur-md">Tự đóng {new Date(assignment.closes_at).toLocaleString("vi-VN")}</p>}
          </div>

          {open
            ? <Link href={`/teacher/assignments/${assignment.id}/results`} className="absolute inset-0 z-20" aria-label={`Xem chi tiết ${assignment.title}`} />
            : <AssignmentStatusActions assignmentId={assignment.id} classroomId={classId} locked />}
        </article>;
      }) : <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-lg font-bold text-slate-700">Đang chuẩn bị bài tập theo khối…</p>
        <p className="mt-2 text-slate-500">Danh sách sẽ tự xuất hiện, giáo viên không cần tạo thủ công.</p>
      </div>}
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-800">{value}</p></div>;
}
