import { z } from "zod";

const recordSchema = z.record(z.string(), z.unknown());
const optionSchema = z.object({ id: z.string().min(1), label: z.string().trim().min(1) });
const pairItemSchema = z.object({ id: z.string().min(1), label: z.string().trim().min(1) });

const questionSchema = z.object({
  clientId: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "MATCHING", "ORDERING", "TEXT_INPUT"]),
  prompt: z.string().trim().min(1, "Câu hỏi không được để trống.").max(2000),
  instruction: z.string().trim().max(1000),
  imagePath: z.string().max(500).nullable(),
  points: z.number().positive().max(1000),
  config: recordSchema,
  answerKey: recordSchema,
}).superRefine((question, context) => {
  const error = (message: string) => context.addIssue({ code: "custom", message });
  if (question.type === "MULTIPLE_CHOICE") {
    const options = z.array(optionSchema).min(2).safeParse(question.config.options);
    if (!options.success || typeof question.answerKey.optionId !== "string" || !options.data.some((item) => item.id === question.answerKey.optionId)) error("Câu chọn đáp án cần ít nhất 2 lựa chọn và một đáp án đúng.");
  } else if (question.type === "TRUE_FALSE" && typeof question.answerKey.value !== "boolean") {
    error("Câu đúng/sai cần đáp án đúng.");
  } else if (question.type === "FILL_BLANK") {
    if (!z.array(z.string().trim().min(1)).min(1).safeParse(question.answerKey.accepted).success) error("Câu điền trống cần ít nhất một đáp án chấp nhận.");
  } else if (question.type === "MATCHING") {
    const left = z.array(pairItemSchema).min(1).safeParse(question.config.left);
    const right = z.array(pairItemSchema).min(1).safeParse(question.config.right);
    const pairs = z.array(z.object({ leftId: z.string(), rightId: z.string() })).min(1).safeParse(question.answerKey.pairs);
    if (!left.success || !right.success || !pairs.success || pairs.data.length !== left.data.length) error("Câu nối cặp chưa có đủ cặp đáp án.");
  } else if (question.type === "ORDERING") {
    const items = z.array(pairItemSchema).min(2).safeParse(question.config.items);
    const itemIds = z.array(z.string()).min(2).safeParse(question.answerKey.itemIds);
    if (!items.success || !itemIds.success || items.data.length !== itemIds.data.length) error("Câu sắp xếp cần ít nhất 2 mục theo đúng thứ tự.");
  }
});

export const assignmentDraftSchema = z.object({
  classroomId: z.uuid(),
  title: z.string().trim().min(1, "Vui lòng nhập tên bài tập.").max(200),
  description: z.string().trim().max(2000),
  dueAt: z.string().max(40),
  showResultsAfterSubmit: z.boolean(),
  tasks: z.array(z.object({
    clientId: z.string().min(1), title: z.string().trim().min(1).max(200),
    instruction: z.string().trim().max(2000),
    skill: z.enum(["LISTENING", "SPEAKING", "READING", "WRITING"]),
    category: z.string().trim().max(60),
    questions: z.array(questionSchema).min(1, "Mỗi phần cần ít nhất một câu hỏi."),
  })).min(1, "Bài tập cần ít nhất một phần."),
});
