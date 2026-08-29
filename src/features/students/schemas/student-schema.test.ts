import { describe, expect, it } from "vitest";

import { bulkStudentSchema, studentInputSchema } from "@/features/students/schemas/student-schema";

describe("student validation", () => {
  it("rejects missing full name", () => expect(studentInputSchema.safeParse({ fullName: "", dateOfBirth: "", gender: "", parentPhone: "" }).success).toBe(false));
  it("rejects invalid date of birth", () => expect(studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "2017-99-99", gender: "", parentPhone: "" }).success).toBe(false));
  it("accepts optional student fields", () => expect(studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "", gender: "", parentPhone: "" }).success).toBe(true));
  it("limits a free-tier batch to 50 students", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({ fullName: `Student ${index}`, dateOfBirth: "", gender: "", parentPhone: "" }));
    expect(bulkStudentSchema.safeParse(rows).success).toBe(false);
  });
});
