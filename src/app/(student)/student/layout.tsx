import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/features/auth/server/guards";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("STUDENT");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} sectionLabel="Khu vực học sinh" />
      {children}
    </div>
  );
}
