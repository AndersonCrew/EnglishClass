export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type TeacherApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type AccountStatus = "ACTIVE" | "SUSPENDED";
export type StudentGender = "MALE" | "FEMALE" | "OTHER";
export type ClassMemberStatus = "ACTIVE" | "WITHDRAWN";
export type SkillType = "LISTENING" | "SPEAKING" | "READING" | "WRITING";
export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "MATCHING" | "ORDERING" | "TEXT_INPUT";

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  date_of_birth: string | null;
  gender: StudentGender | null;
  parent_phone: string | null;
  username: string | null;
  created_by_teacher_id: string | null;
  teacher_approval_status: TeacherApprovalStatus | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
}

type ClassroomRow = {
  id: string;
  teacher_id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  ends_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

type ClassMemberRow = {
  classroom_id: string;
  student_id: string;
  status: ClassMemberStatus;
  left_at: string | null;
  created_at: string;
}

type AssignmentRow = { id: string; classroom_id: string; title: string; description: string | null; due_at: string | null; status: AssignmentStatus; show_results_after_submit: boolean; level: 1 | 2 | 3 | 4; sequence_index: number | null; curriculum_code: string | null; published_at: string | null; cover_image_path: string | null; closes_at: string | null; created_at: string; updated_at: string };
type TaskRow = { id: string; assignment_id: string; skill: SkillType; title: string; instruction: string | null; content: Record<string, unknown>; category: string | null; order_index: number; created_at: string; updated_at: string };
type QuestionRow = { id: string; task_id: string; type: QuestionType; prompt: string; instruction: string | null; image_path: string | null; config: Record<string, unknown>; points: number; order_index: number; created_at: string; updated_at: string };
type AnswerKeyRow = { question_id: string; answer_key: Record<string, unknown>; created_at: string; updated_at: string };
type SubmissionRow = { id: string; task_id: string | null; assignment_id: string; student_id: string; answer_text: string | null; answer_file_path: string | null; answer_metadata: Record<string, unknown>; status: "DRAFT" | "SUBMITTED"; submitted_at: string | null; auto_score: number | null; teacher_score: number | null; teacher_feedback: string | null; assessed_at: string | null; assessed_by: string | null; created_at: string; updated_at: string };
type StudentAnswerRow = { id: string; submission_id: string; question_id: string; answer: Record<string, unknown>; auto_score: number | null; is_correct: boolean | null; teacher_score: number | null; teacher_feedback: string | null; created_at: string; updated_at: string };
type AuditLogRow = { id: string; actor_user_id: string | null; actor_role: UserRole; action: string; target_type: string; target_id: string | null; metadata: Record<string, unknown>; created_at: string };

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
        Update: Partial<Pick<ClassroomRow, "name" | "grade_level" | "academic_year" | "ends_at" | "archived_at">>;
        Relationships: [];
      };
      class_members: {
        Row: ClassMemberRow;
        Insert: Pick<ClassMemberRow, "classroom_id" | "student_id"> & Partial<Pick<ClassMemberRow, "created_at" | "status" | "left_at">>;
        Update: Partial<Pick<ClassMemberRow, "status" | "left_at">>;
        Relationships: [];
      };
      audit_logs: { Row: AuditLogRow; Insert: Pick<AuditLogRow, "actor_role" | "action" | "target_type"> & Partial<Omit<AuditLogRow, "actor_role" | "action" | "target_type">>; Update: Record<string, never>; Relationships: [] };
      assignments: { Row: AssignmentRow; Insert: Pick<AssignmentRow, "classroom_id" | "title"> & Partial<Omit<AssignmentRow, "classroom_id" | "title">>; Update: Partial<Pick<AssignmentRow, "title" | "description" | "due_at" | "status" | "show_results_after_submit" | "level" | "sequence_index" | "curriculum_code" | "published_at" | "cover_image_path" | "closes_at">>; Relationships: [] };
      tasks: { Row: TaskRow; Insert: Pick<TaskRow, "assignment_id" | "skill" | "title" | "order_index"> & Partial<Omit<TaskRow, "assignment_id" | "skill" | "title" | "order_index">>; Update: Partial<Pick<TaskRow, "skill" | "title" | "instruction" | "content" | "category" | "order_index">>; Relationships: [] };
      questions: { Row: QuestionRow; Insert: Pick<QuestionRow, "task_id" | "type" | "prompt" | "order_index"> & Partial<Omit<QuestionRow, "task_id" | "type" | "prompt" | "order_index">>; Update: Partial<Pick<QuestionRow, "type" | "prompt" | "instruction" | "image_path" | "config" | "points" | "order_index">>; Relationships: [] };
      question_answer_keys: { Row: AnswerKeyRow; Insert: Pick<AnswerKeyRow, "question_id" | "answer_key"> & Partial<Omit<AnswerKeyRow, "question_id" | "answer_key">>; Update: Pick<AnswerKeyRow, "answer_key">; Relationships: [] };
      submissions: { Row: SubmissionRow; Insert: Partial<SubmissionRow> & Pick<SubmissionRow, "assignment_id" | "student_id">; Update: Partial<SubmissionRow>; Relationships: [] };
      student_answers: { Row: StudentAnswerRow; Insert: Pick<StudentAnswerRow, "submission_id" | "question_id" | "answer"> & Partial<Omit<StudentAnswerRow, "submission_id" | "question_id" | "answer">>; Update: Partial<StudentAnswerRow>; Relationships: [] };
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
      start_assignment_submission: { Args: { target_assignment_id: string }; Returns: string };
      save_student_answer: { Args: { target_submission_id: string; target_question_id: string; answer_value: Record<string, unknown> }; Returns: undefined };
      submit_assignment: { Args: { target_submission_id: string }; Returns: undefined };
      assess_student_answer: { Args: { target_answer_id: string; score_value: number; feedback_value: string }; Returns: undefined };
      set_assignment_publication: { Args: { target_assignment_id: string; target_status: AssignmentStatus }; Returns: undefined };
      student_can_upload_speaking_audio: { Args: { target_submission_id: string; target_question_id: string }; Returns: boolean };
      provision_curriculum_assignment: { Args: { target_classroom_id: string; lesson_code: string; lesson_title: string; lesson_description: string; lesson_level: number; lesson_sequence: number; lesson_tasks: Record<string, unknown>[] }; Returns: string };
      open_assignment_until: { Args: { target_assignment_id: string; close_time: string }; Returns: undefined };
      student_can_work_assignment: { Args: { target_id: string }; Returns: boolean };
      get_teacher_dashboard: { Args: Record<string, never>; Returns: Record<string, unknown> };
    };
    Enums: {
      user_role: UserRole;
      student_gender: StudentGender;
      skill_type: SkillType;
      assignment_status: AssignmentStatus;
      question_type: QuestionType;
      submission_status: "DRAFT" | "SUBMITTED";
    };
    CompositeTypes: Record<string, never>;
  };
}
