import { describe, expect, it } from "vitest";
import { assignmentDraftSchema } from "./assignment-schema";

const base = { classroomId: "00000000-0000-4000-8000-000000000001", title: "Unit 1", description: "", dueAt: "", level: 1, showResultsAfterSubmit: false };
const validQuestion = { clientId: "q", type: "MULTIPLE_CHOICE" as const, prompt: "Choose", instruction: "", imagePath: null, points: 1, config: { options: [{ id: "a", label: "cat" }, { id: "b", label: "dog" }] }, answerKey: { optionId: "a" } };
const tasks = (question = validQuestion) => (["LISTENING", "SPEAKING", "READING", "WRITING"] as const).map((skill, index) => ({ clientId: `t${index}`, title: skill, instruction: "", skill, category: "Vocabulary", questions: [{ ...question, clientId: `q${index}` }] }));

describe("assignment validation", () => {
  it("accepts a valid four-skill assignment", () => expect(assignmentDraftSchema.safeParse({ ...base, tasks: tasks() }).success).toBe(true));
  it("rejects an answer key outside the options", () => expect(assignmentDraftSchema.safeParse({ ...base, tasks: tasks({ ...validQuestion, answerKey: { optionId: "x" } }) }).success).toBe(false));
  it("rejects an assignment missing one of the four skills", () => expect(assignmentDraftSchema.safeParse({ ...base, tasks: tasks().slice(0, 3) }).success).toBe(false));
});
