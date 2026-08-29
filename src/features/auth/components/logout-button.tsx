import { logoutAction } from "@/features/auth/server/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
        type="submit"
      >
        Đăng xuất
      </button>
    </form>
  );
}
