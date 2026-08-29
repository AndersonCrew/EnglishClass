import { describe, expect, it } from "vitest";

import { bulkStudentSchema, studentInputSchema } from "@/features/students/schemas/student-schema";

describe("student validation", () => {
  it("rejects missing full name", () => expect(studentInputSchema.safeParse({ fullName: "", dateOfBirth: "", gender: "", parentPhone: "" }).success).toBe(false));
  it("rejects invalid date of birth", () => expect(studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "2017-99-99", gender: "", parentPhone: "" }).success).toBe(false));
  it("requires date of birth and gender", () => {
    const parsed = studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "", gender: "", parentPhone: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.flatten().fieldErrors).toMatchObject({ dateOfBirth: ["Vui lòng chọn ngày sinh."], gender: ["Vui lòng chọn giới tính."] });
  });
  it("keeps parent phone optional", () => expect(studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "2017-03-02", gender: "MALE", parentPhone: "" }).success).toBe(true));
  it("accepts null for an omitted parent phone from the form state", () => expect(studentInputSchema.safeParse({ fullName: "An", dateOfBirth: "2017-03-02", gender: "MALE", parentPhone: null }).success).toBe(true));
  it("limits a free-tier batch to 50 students", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({ fullName: `Student ${index}`, dateOfBirth: "2017-03-02", gender: "MALE", parentPhone: "" }));
    expect(bulkStudentSchema.safeParse(rows).success).toBe(false);
  });
});
