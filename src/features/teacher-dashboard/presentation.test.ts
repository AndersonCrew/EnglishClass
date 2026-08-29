import { describe, expect, it } from "vitest";
import { getGreeting, progressPercent, statusLabels } from "./presentation";

describe("teacher dashboard presentation", () => {
  it("uses friendly assignment statuses", () => expect(statusLabels).toEqual({ DRAFT: "Bản nháp", PUBLISHED: "Đang giao", CLOSED: "Đã đóng" }));
  it("calculates progress safely", () => { expect(progressPercent(28, 32)).toBe(88); expect(progressPercent(3, 0)).toBe(0); });
  it("selects a simple greeting", () => { expect(getGreeting(8)).toBe("Chào buổi sáng"); expect(getGreeting(14)).toBe("Chào buổi chiều"); expect(getGreeting(20)).toBe("Chào buổi tối"); });
});
