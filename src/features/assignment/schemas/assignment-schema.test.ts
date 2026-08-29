import { describe, expect, it } from "vitest";
import { assignmentDraftSchema } from "./assignment-schema";

const base = { classroomId: "00000000-0000-4000-8000-000000000001", title: "Unit 1", description: "", dueAt: "", showResultsAfterSubmit: false };
const task = { clientId: "t", title: "Practice", instruction: "", skill: "READING" as const, category: "Vocabulary" };

describe("assignment validation", () => {
  it("accepts a valid multiple choice question", () => expect(assignmentDraftSchema.safeParse({ ...base, tasks: [{ ...task, questions: [{ clientId: "q", type: "MULTIPLE_CHOICE", prompt: "Choose", instruction: "", imagePath: null, points: 1, config: { options: [{ id: "a", label: "cat" }, { id: "b", label: "dog" }] }, answerKey: { optionId: "a" } }] }] }).success).toBe(true));
  it("rejects an answer key outside the options", () => expect(assignmentDraftSchema.safeParse({ ...base, tasks: [{ ...task, questions: [{ clientId: "q", type: "MULTIPLE_CHOICE", prompt: "Choose", instruction: "", imagePath: null, points: 1, config: { options: [{ id: "a", label: "cat" }, { id: "b", label: "dog" }] }, answerKey: { optionId: "x" } }] }] }).success).toBe(false));
});
