import { redirect } from "next/navigation";

export default async function NewAssignmentPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  redirect(`/teacher/classes/${classId}/assignments`);
}
