import { LogoutButton } from "@/features/auth/components/logout-button";
import { AdminNavigation } from "@/features/admin/components/admin-navigation";
import { AdminRouteFeedback } from "@/features/admin/components/admin-route-feedback";
import { requireRole } from "@/features/auth/server/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("ADMIN");
  return <div className="relative min-h-screen overflow-hidden bg-[#f7f5ff] text-slate-900">
    <div className="pointer-events-none fixed -left-24 -top-28 size-80 rounded-full bg-cyan-200/50 blur-3xl" />
    <div className="pointer-events-none fixed -right-24 top-16 size-96 rounded-full bg-fuchsia-200/45 blur-3xl" />
    <div className="pointer-events-none fixed bottom-0 left-1/3 size-80 rounded-full bg-amber-100/70 blur-3xl" />
    <header className="relative z-20 border-b border-white/70 bg-white/55 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><div className="relative flex size-12 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xl font-black text-white shadow-lg shadow-violet-200"><span className="-rotate-3">E</span><span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-amber-400" /></div><div><p className="text-lg font-black tracking-tight">EnglishClass</p><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Admin studio</p></div></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Xin chào</p><p className="text-sm font-bold">{profile.fullName}</p></div><LogoutButton /></div>
        <div className="order-3 w-full"><AdminNavigation /></div>
      </div>
    </header>
    <div className="relative z-10 mx-auto min-w-0 max-w-[1480px]">{children}</div>
    <AdminRouteFeedback />
  </div>;
}
