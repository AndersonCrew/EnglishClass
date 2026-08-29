import { requireRole } from "@/features/auth/server/guards";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export default async function ChangePasswordPage() {
  await requireRole("STUDENT");
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"><p className="text-sm font-bold text-teal-700">BẢO VỆ TÀI KHOẢN</p><h1 className="mt-2 text-3xl font-bold">Tạo mật khẩu riêng</h1><p className="mt-3 text-slate-600">Đây là lần đăng nhập đầu tiên. Em hãy chọn mật khẩu mới có ít nhất 8 ký tự, gồm chữ và số.</p><ChangePasswordForm /></section></main>;
}
