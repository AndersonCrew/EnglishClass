"use server";

import { redirect } from "next/navigation";

import { homePathForRole } from "@/features/auth/server/auth-service";
import { loginSchema } from "@/features/auth/schemas/login-schema";
import { registerSchema } from "@/features/auth/schemas/register-schema";
import type { LoginState, RegisterState } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

const invalidCredentialsMessage =
  "Tài khoản hoặc mật khẩu chưa đúng. Vui lòng kiểm tra và thử lại.";

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? invalidCredentialsMessage };
  }

  const supabase = await createClient();
  const email = parsed.data.email.includes("@")
    ? parsed.data.email
    : `${parsed.data.email.toLowerCase()}@students.englishclass.internal`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) return { error: invalidCredentialsMessage };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      error: "Tài khoản chưa được thiết lập đầy đủ. Vui lòng liên hệ giáo viên hoặc quản trị viên.",
    };
  }

  redirect(homePathForRole(profile.role));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function registerTeacherAction(
  _previousState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Thông tin đăng ký chưa hợp lệ.",
      success: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error || !data.user) {
    return {
      error: "Chưa thể tạo tài khoản. Email có thể đã được sử dụng hoặc thông tin chưa hợp lệ.",
      success: null,
    };
  }

  const needsEmailConfirmation = !data.session;
  if (data.session) await supabase.auth.signOut({ scope: "local" });

  redirect(needsEmailConfirmation ? "/?registered=confirm" : "/?registered=success");
}
