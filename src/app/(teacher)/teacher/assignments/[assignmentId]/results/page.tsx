import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherAssignmentResults } from "@/features/assignment/server/queries";

export default async function ResultsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const data = await getTeacherAssignmentResults(assignmentId);
  if (!data) notFound();
  const submitted = data.submissions.filter((item) => item.status === "SUBMITTED");
  return <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
    <Link className="text-sm font-semibold text-teal-700" href={`/teacher/classes/${data.assignment.classroom_id}/assignments`}>← Danh sách bài tập</Link>
    <h1 className="mt-3 text-3xl font-bold">{data.assignment.title}</h1>
    <p className="mt-2 text-slate-500">Đã nộp: {submitted.length} học sinh</p>
    <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b bg-slate-50 p-4 text-sm font-bold text-slate-600"><span>Học sinh</span><span>Trạng thái</span><span>Bài làm</span></div>
      {data.submissions.map((submission) => <div key={submission.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b p-4 last:border-0"><b>{data.names.get(submission.student_id) ?? "Học sinh"}</b><span>{submission.status === "SUBMITTED" ? "Đã nộp" : "Đang làm"}</span><Link href={`/teacher/submissions/${submission.id}`} className="font-bold text-teal-700">{submission.auto_score ?? "Xem"} →</Link></div>)}
      {!data.submissions.length && <p className="p-8 text-center text-slate-500">Chưa có học sinh bắt đầu làm bài.</p>}
    </div>
  </main>;
}
