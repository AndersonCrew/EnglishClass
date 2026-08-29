import type { UserRole } from "@/types/database.generated";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: UserRole;
}

export interface LoginState {
  error: string | null;
}

export interface RegisterState {
  error: string | null;
  success: string | null;
}
