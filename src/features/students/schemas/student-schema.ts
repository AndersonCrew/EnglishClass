import { z } from "zod";

const requiredDate = z
  .string({ error: "Vui lòng chọn ngày sinh." })
  .min(1, "Vui lòng chọn ngày sinh.")
  .pipe(z.iso.date({ error: "Ngày sinh không hợp lệ." }))
  .refine((value) => new Date(`${value}T00:00:00Z`) <= new Date(), "Ngày sinh không hợp lệ.");

const optionalPhone = z.preprocess(
  (value) => value ?? "",
  z.string()
    .trim()
    .transform((value) => value || null)
    .refine((value) => !value || /^\+?[0-9]{8,15}$/.test(value), "Số điện thoại chưa hợp lệ."),
);

export const studentInputSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ và tên.").max(120),
  dateOfBirth: requiredDate,
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { error: "Vui lòng chọn giới tính." }),
  parentPhone: optionalPhone,
});

export const bulkStudentSchema = z.array(studentInputSchema).min(1).max(50);
