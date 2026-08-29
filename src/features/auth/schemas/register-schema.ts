import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên.").max(120),
    email: z.string().trim().min(1, "Vui lòng nhập email.").email("Email chưa đúng định dạng."),
    password: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
      .regex(/[A-Za-z]/, "Mật khẩu cần có ít nhất một chữ cái.")
      .regex(/[0-9]/, "Mật khẩu cần có ít nhất một chữ số."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu nhập lại chưa khớp.",
    path: ["confirmPassword"],
  });
