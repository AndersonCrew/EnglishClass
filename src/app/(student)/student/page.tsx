import Link from "next/link";
import { getStudentAssignments } from "@/features/assignment/server/queries";

export default async function StudentPage() {
  const assignments = await getStudentAssignments();
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-bold text-teal-700">BÀI HỌC CỦA EM</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Xin chào!</h1>
        <p className="mt-3 max-w-xl text-lg leading-8 text-slate-600">
          Chọn một nhiệm vụ bên dưới và bắt đầu làm bài nhé.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{assignments.map((assignment) => <Link key={assignment.id} href={`/student/assignments/${assignment.id}`} className="rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm transition hover:border-teal-300"><span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">BÀI TẬP</span><h2 className="mt-3 text-xl font-bold">{assignment.title}</h2><p className="mt-2 text-sm text-slate-500">{assignment.due_at ? `Hạn: ${new Date(assignment.due_at).toLocaleString("vi-VN")}` : "Không giới hạn thời gian"}</p><span className="mt-5 inline-block font-bold text-teal-700">Làm bài →</span></Link>)}{!assignments.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 sm:col-span-2">Em chưa có bài tập mới.</div>}</div>
    </main>
  );
}
