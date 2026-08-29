import Link from "next/link";
import { AssignmentBuilder } from "@/features/assignment/components/assignment-builder";
import { getTeacherAssignments } from "@/features/assignment/server/queries";
import { notFound } from "next/navigation";

export default async function NewAssignmentPage({ params }: { params: Promise<{ classId: string }> }) { const { classId } = await params; const data = await getTeacherAssignments(classId); if (!data) notFound(); return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8"><Link href={`/teacher/classes/${classId}/assignments`} className="text-sm font-semibold text-teal-700">← Bài tập lớp {data.classroom.name}</Link><h1 className="mt-3 text-3xl font-bold">Tạo bài tập mới</h1><p className="mt-2 mb-7 text-slate-500">Chia bài thành các phần nhỏ để học sinh dễ làm.</p><AssignmentBuilder classroomId={classId} /></main>; }
