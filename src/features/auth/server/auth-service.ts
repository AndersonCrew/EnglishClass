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
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  };
});

export function homePathForRole(role: UserRole) {
  return role === "TEACHER" ? "/teacher" : "/student";
}
