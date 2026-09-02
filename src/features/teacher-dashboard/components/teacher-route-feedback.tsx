"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function TeacherRouteFeedback() {
  const pathname = usePathname(); const [targetPath, setTargetPath] = useState<string | null>(null); const loading = targetPath !== null && targetPath !== pathname;
  useEffect(() => { const handle = (event: MouseEvent) => { if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; const target = event.target; if (!(target instanceof Element)) return; const link = target.closest<HTMLAnchorElement>('a[href^="/teacher"]'); if (!link || link.href === window.location.href || link.target === "_blank") return; setTargetPath(new URL(link.href).pathname); }; window.addEventListener("click", handle, true); return () => window.removeEventListener("click", handle, true); }, []);
  useEffect(() => { const timer = window.setTimeout(() => setTargetPath(null), 0); return () => window.clearTimeout(timer); }, [pathname]);
  useEffect(() => { if (!targetPath) return; const safetyTimer = window.setTimeout(() => setTargetPath(null), 8000); return () => window.clearTimeout(safetyTimer); }, [targetPath]);
  if (!loading) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/75 p-5 backdrop-blur-sm" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-teal-800 shadow-xl ring-1 ring-teal-100"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang tải trang…</div></div>;
}
