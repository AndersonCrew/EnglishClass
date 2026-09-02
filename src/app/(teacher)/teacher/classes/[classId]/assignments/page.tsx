import { redirect } from "next/navigation";

export default async function AssignmentsPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  redirect(`/teacher/classes/${classId}?tab=assignments`);
}
