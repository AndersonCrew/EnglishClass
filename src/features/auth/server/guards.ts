import "server-only";

import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  homePathForRole,
} from "@/features/auth/server/auth-service";
import type { UserRole } from "@/types/database.generated";

export async function requireRole(requiredRole: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== requiredRole) redirect(homePathForRole(profile.role));

  return profile;
}
