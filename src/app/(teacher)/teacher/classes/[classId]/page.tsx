import { notFound } from "next/navigation";
import Link from "next/link";

import { StudentManager } from "@/features/students/components/student-manager";
import { getClassroomStudents } from "@/features/students/server/student-service";

interface Props { params: Promise<{ classId: string }> }

export default async function ClassroomDetailPage({ params }: Props) {
  const { classId } = await params;
  const data = await getClassroomStudents(classId);
  if (!data) notFound();

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-teal-700">LỚP HỌC</p><h1 className="mt-2 text-3xl font-bold">{data.classroom.name}</h1><p className="mt-2 text-slate-500">Khối {data.classroom.gradeLevel} • Năm học {data.classroom.academicYear}</p></div><Link href={`/teacher/classes/${classId}/assignments`} className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white">Quản lý bài tập</Link></div>
    <StudentManager classroomId={data.classroom.id} classroomName={data.classroom.name} initialStudents={data.students} />
  </main>;
}
