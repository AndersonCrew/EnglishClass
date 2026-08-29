import { describe, expect, it } from "vitest";
import { classroomSchema } from "./classroom-schema";

describe("classroom validation", () => {
  it("accepts primary grade levels", () => expect(classroomSchema.safeParse({ name: "3A1", gradeLevel: "3", academicYear: "2026-2027", endsAt: "2027-06-30" }).success).toBe(true));
  it("rejects a grade outside 1-5", () => expect(classroomSchema.safeParse({ name: "6A1", gradeLevel: "6", academicYear: "2026-2027", endsAt: "2027-06-30" }).success).toBe(false));
});
