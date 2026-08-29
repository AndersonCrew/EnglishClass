import { describe, expect, it } from "vitest";
import { gradeExactAnswer, gradeFillBlank, normalizeText } from "./grading";

describe("question grading", () => {
  it("normalizes fill blank answers", () => {
    expect(normalizeText("  Hello   WORLD ")).toBe("hello world");
    expect(gradeFillBlank("Bike", ["bike", "bicycle"])).toBe(true);
  });
  it("compares structured answers without eval", () => {
    expect(gradeExactAnswer({ optionId: "b" }, { optionId: "b" })).toBe(true);
    expect(gradeExactAnswer({ value: false }, { value: true })).toBe(false);
    expect(gradeExactAnswer({ itemIds: ["a", "b"] }, { itemIds: ["a", "b"] })).toBe(true);
  });
});
