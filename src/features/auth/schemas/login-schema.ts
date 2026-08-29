import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tài khoản.")
    .refine(
      (value) => z.email().safeParse(value).success || /^[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(value),
      "Tài khoản chưa đúng định dạng.",
    ),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});
