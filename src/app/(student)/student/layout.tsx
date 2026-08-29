import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/features/auth/server/guards";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("STUDENT");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata.must_change_password === true) redirect("/change-password");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader profile={profile} sectionLabel="Khu vực học sinh" />
      {children}
    </div>
  );
}
