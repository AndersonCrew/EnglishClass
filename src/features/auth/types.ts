import type { AccountStatus, TeacherApprovalStatus, UserRole } from "@/types/database.generated";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: UserRole;
  teacherApprovalStatus: TeacherApprovalStatus | null;
  accountStatus: AccountStatus;
}

export interface LoginState {
  error: string | null;
}

export interface RegisterState {
  error: string | null;
  success: string | null;
}
