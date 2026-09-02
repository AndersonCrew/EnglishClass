"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

export function StudentAssignmentLink({ href, className, loadingLabel = "Đang mở bài tập…", children }: { href: string; className?: string; loadingLabel?: string; children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  return <>
    <Link href={href} aria-disabled={loading} onClick={(event) => { if (loading) { event.preventDefault(); return; } setLoading(true); }} className={`${className ?? ""} ${loading ? "pointer-events-none opacity-80" : ""}`}>{children}</Link>
    {loading && <div className="fixed inset-0 z-[90] grid place-items-center bg-white/70 p-5 backdrop-blur-sm" role="status" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 text-lg font-black text-teal-800 shadow-2xl ring-1 ring-teal-100"><span className="size-6 animate-spin rounded-full border-3 border-teal-100 border-t-teal-600" />{loadingLabel}</div></div>}
  </>;
}
