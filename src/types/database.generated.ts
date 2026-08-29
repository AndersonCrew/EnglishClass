export type UserRole = "TEACHER" | "STUDENT";
export type StudentGender = "MALE" | "FEMALE" | "OTHER";

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  date_of_birth: string | null;
  gender: StudentGender | null;
  parent_phone: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

type ClassroomRow = {
  id: string;
  teacher_id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

type ClassMemberRow = {
  classroom_id: string;
  student_id: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id" | "role" | "full_name"> & Partial<Omit<ProfileRow, "id" | "role" | "full_name">>;
        Update: Partial<Omit<ProfileRow, "id" | "role" | "created_at">>;
        Relationships: [];
      };
      classrooms: {
        Row: ClassroomRow;
        Insert: Pick<ClassroomRow, "teacher_id" | "name" | "grade_level" | "academic_year"> & Partial<Omit<ClassroomRow, "teacher_id" | "name" | "grade_level" | "academic_year">>;
        Update: Partial<Pick<ClassroomRow, "name" | "grade_level" | "academic_year">>;
        Relationships: [];
      };
      class_members: {
        Row: ClassMemberRow;
        Insert: Pick<ClassMemberRow, "classroom_id" | "student_id"> & Partial<Pick<ClassMemberRow, "created_at">>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      finalize_student_enrollment: {
        Args: {
          target_classroom_id: string;
          target_student_id: string;
          student_full_name: string;
          student_date_of_birth: string | null;
          student_gender_value: StudentGender | null;
          student_parent_phone: string | null;
          student_username: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      student_gender: StudentGender;
      skill_type: "LISTENING" | "SPEAKING" | "READING" | "WRITING";
      assignment_status: "DRAFT" | "PUBLISHED" | "CLOSED";
      submission_status: "DRAFT" | "SUBMITTED";
    };
    CompositeTypes: Record<string, never>;
  };
}
