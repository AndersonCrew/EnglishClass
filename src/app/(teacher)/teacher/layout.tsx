import { TeacherHeader } from "@/features/teacher-dashboard/components/teacher-header";
import { TeacherRouteFeedback } from "@/features/teacher-dashboard/components/teacher-route-feedback";
import { requireApprovedTeacher } from "@/features/auth/server/guards";

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireApprovedTeacher();

  return (
    <div className="teacher-shell relative min-h-screen bg-[#f6fbfa]">
      <TeacherHeader profile={profile} />
      {children}
      <TeacherRouteFeedback />
    </div>
  );
}
