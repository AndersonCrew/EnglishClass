import type { StudentInput, StudentRecord } from "@/features/students/types";

const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

export function isPossibleDuplicate(candidate: StudentInput, existing: StudentRecord[]) {
  if (!candidate.dateOfBirth) return false;
  return existing.some((student) =>
    normalizeName(student.fullName) === normalizeName(candidate.fullName)
    && student.dateOfBirth === candidate.dateOfBirth,
  );
}
