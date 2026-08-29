import { requireApprovedTeacher } from "@/features/auth/server/guards";
import { TeacherDashboard } from "@/features/teacher-dashboard/components/teacher-dashboard";
import { getTeacherDashboard } from "@/features/teacher-dashboard/server/queries";

export default async function TeacherPage() {
  const [profile, data] = await Promise.all([requireApprovedTeacher(), getTeacherDashboard()]);
  return <TeacherDashboard profile={profile} data={data} />;
}
