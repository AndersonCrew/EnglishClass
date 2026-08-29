import { redirect } from "next/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getCurrentProfile, homePathForRole } from "@/features/auth/server/auth-service";

export default async function AccountStatusPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "TEACHER" || (profile.teacherApprovalStatus === "APPROVED" && profile.accountStatus === "ACTIVE")) redirect(homePathForRole(profile.role));
  const message = profile.teacherApprovalStatus === "PENDING" ? "Tài khoản của bạn đang chờ quản trị viên phê duyệt."
    : profile.teacherApprovalStatus === "REJECTED" ? "Tài khoản chưa được phê duyệt."
    : "Tài khoản của bạn đang bị tạm khóa.";
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-700">!</div><h1 className="mt-5 text-2xl font-bold">Trạng thái tài khoản</h1><p className="mt-3 text-slate-600">{message}</p><div className="mt-6"><LogoutButton /></div></section></main>;
}
