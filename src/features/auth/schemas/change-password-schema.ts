import { z } from "zod";

export const changePasswordSchema = z.object({
  password: z.string().min(8, "Mật khẩu mới cần ít nhất 8 ký tự.").regex(/[A-Za-z]/, "Mật khẩu cần có ít nhất một chữ cái.").regex(/[0-9]/, "Mật khẩu cần có ít nhất một chữ số."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu nhập lại chưa khớp." });
