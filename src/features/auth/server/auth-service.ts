import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile } from "@/features/auth/types";
import type { UserRole } from "@/types/database.generated";

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, teacher_approval_status, account_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    teacherApprovalStatus: profile.teacher_approval_status,
    accountStatus: profile.account_status,
  };
});

export function homePathForRole(role: UserRole) {
  return role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/teacher" : "/student";
}
