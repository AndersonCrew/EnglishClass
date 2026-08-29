import { z } from "zod";

const optionalDate = z
  .union([z.literal(""), z.iso.date()])
  .transform((value) => value || null)
  .refine((value) => !value || new Date(`${value}T00:00:00Z`) <= new Date(), "Ngày sinh không hợp lệ.");

const optionalPhone = z
  .string()
  .trim()
  .transform((value) => value || null)
  .refine((value) => !value || /^\+?[0-9]{8,15}$/.test(value), "Số điện thoại chưa hợp lệ.");

export const studentInputSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ và tên.").max(120),
  dateOfBirth: optionalDate,
  gender: z.union([z.literal(""), z.enum(["MALE", "FEMALE", "OTHER"])]).transform((value) => value || null),
  parentPhone: optionalPhone,
});

export const bulkStudentSchema = z.array(studentInputSchema).min(1).max(50);
