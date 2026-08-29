"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { label: "Tổng quan", href: "/admin" },
  { label: "Giáo viên", href: "/admin/teachers" },
  { label: "Học sinh", href: "/admin/students" },
  { label: "Lớp học", href: "/admin/classes" },
  { label: "Nhật ký", href: "/admin/audit-log" },
  { label: "Cài đặt", href: "/admin/settings" },
];

export function AdminNavigation() {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const navigating = optimisticPath !== null && optimisticPath !== pathname;
  const activePath = navigating ? optimisticPath : pathname;

  return <><nav data-admin-navigation className="flex gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1.5 shadow-sm ring-1 ring-white/80 backdrop-blur-xl">{links.map((item) => { const active = item.href === "/admin" ? activePath === item.href : activePath.startsWith(item.href); return <Link aria-current={active ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition ${active ? "bg-teal-600 text-white shadow-md shadow-teal-200" : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"}`} href={item.href} key={item.href} onClick={() => { if (!active) setOptimisticPath(item.href); }}>{item.label}</Link>; })}</nav>{navigating ? <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-teal-100"><div className="h-full w-1/2 animate-pulse rounded-r-full bg-teal-600" /></div> : null}</>;
}
