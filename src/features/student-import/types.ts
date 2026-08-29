import type { StudentInput } from "@/features/students/types";

export interface ParsedStudent extends StudentInput {
  rowNumber: number;
  ordinal: number;
  issues: string[];
}

export interface ParsedWorkbook {
  sheetNames: string[];
  suggestedSheet: string;
  studentsBySheet: Record<string, ParsedStudent[]>;
}
