import type { StudentGender } from "@/types/database.generated";

export interface StudentInput {
  fullName: string;
  dateOfBirth: string | null;
  gender: StudentGender | null;
  parentPhone: string | null;
}

export interface StudentRecord extends StudentInput {
  id: string;
  username: string;
}

export interface StudentCredential {
  studentId: string;
  fullName: string;
  username: string;
  temporaryPassword: string;
}

export interface StudentOperationResult {
  success: boolean;
  message: string;
  credential?: StudentCredential;
}
