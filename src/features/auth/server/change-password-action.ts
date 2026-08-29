"use server";

import { redirect } from "next/navigation";
import { requireRole } from "./guards";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "../schemas/change-password-schema";

export type ChangePasswordState = { error: string };

export async function changeStudentPasswordAction(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  await requireRole("STUDENT");
  const parsed = changePasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mật khẩu chưa hợp lệ." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập đã hết hạn." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password, data: { ...user.user_metadata, must_change_password: false } });
  if (error) return { error: "Không thể đổi mật khẩu. Em hãy thử lại." };
  redirect("/student");
}
