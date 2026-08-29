import { describe, expect, it } from "vitest";

import { isPossibleDuplicate } from "@/features/students/utils/duplicate-detection";
import type { StudentRecord } from "@/features/students/types";

const existing: StudentRecord[] = [{ id: "1", fullName: "Nguyễn Văn An", dateOfBirth: "2017-03-02", gender: null, parentPhone: null, username: "an.4a1.27", membershipStatus: "ACTIVE", leftAt: null, displayStatus: "ACTIVE" }];

describe("duplicate detection", () => {
  it("does not use full name alone", () => expect(isPossibleDuplicate({ fullName: "Nguyễn Văn An", dateOfBirth: null, gender: null, parentPhone: null }, existing)).toBe(false));
  it("flags same normalized name and date of birth", () => expect(isPossibleDuplicate({ fullName: "  NGUYỄN  VĂN AN ", dateOfBirth: "2017-03-02", gender: null, parentPhone: null }, existing)).toBe(true));
  it("does not flag same name with another birth date", () => expect(isPossibleDuplicate({ fullName: "Nguyễn Văn An", dateOfBirth: "2017-03-03", gender: null, parentPhone: null }, existing)).toBe(false));
});
