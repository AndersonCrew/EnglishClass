import type { QuestionType, SkillType } from "@/types/database.generated";

export type BuilderQuestion = {
  clientId: string;
  type: QuestionType;
  prompt: string;
  instruction: string;
  imagePath: string | null;
  points: number;
  config: Record<string, unknown>;
  answerKey: Record<string, unknown>;
};

export type BuilderTask = {
  clientId: string;
  title: string;
  instruction: string;
  skill: SkillType;
  category: string;
  questions: BuilderQuestion[];
};

export type AssignmentDraft = {
  classroomId: string;
  title: string;
  description: string;
  dueAt: string;
  showResultsAfterSubmit: boolean;
  tasks: BuilderTask[];
};

export type ActionResult = { ok: boolean; message: string; assignmentId?: string };
