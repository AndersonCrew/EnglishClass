const missingEnvironmentMessage =
  "Thiếu cấu hình Supabase. Vui lòng kiểm tra biến môi trường của ứng dụng.";

export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(missingEnvironmentMessage);
  }

  return { url, publishableKey };
}
