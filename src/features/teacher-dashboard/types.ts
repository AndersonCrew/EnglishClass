import type { AssignmentStatus } from "@/types/database.generated";

export type DashboardClassroom = { id: string; name: string; gradeLevel: number; studentCount: number; activeAssignmentCount: number };
export type DashboardAssignment = { id: string; classroomId: string; title: string; classroomName: string; status: AssignmentStatus; dueAt: string | null; totalStudents: number; submittedStudents: number };
export type PendingManualItem = { assignment_id: string; classroom_id: string; title: string; classroom_name: string; pending_count: number };
export type DueWorkItem = { assignment_id: string; classroom_id: string; title: string; classroom_name: string; due_at: string; incomplete_count: number };
export type DraftWorkItem = { assignment_id: string; classroom_id: string; title: string; classroom_name: string };

export type TeacherDashboardData = {
  overview: { classroomCount: number; studentCount: number; publishedAssignmentCount: number };
  classrooms: DashboardClassroom[];
  recentAssignments: DashboardAssignment[];
  pendingManual: PendingManualItem[];
  dueWork: DueWorkItem[];
  draftWork: DraftWorkItem[];
};
