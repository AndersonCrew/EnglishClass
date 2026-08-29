import { AppHeader } from "@/components/layout/app-header";
import { requireApprovedTeacher } from "@/features/auth/server/guards";

export default async function TeacherLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireApprovedTeacher();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} sectionLabel="Khu vực giáo viên" />
      {children}
    </div>
  );
}
