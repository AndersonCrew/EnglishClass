"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export type ClassTab = "overview" | "assignments" | "students" | "add-students" | "ranking";

const tabs: Array<{ key: ClassTab; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "assignments", label: "Bài tập" },
  { key: "students", label: "Danh sách học sinh" },
  { key: "add-students", label: "Thêm học sinh" },
  { key: "ranking", label: "Bảng xếp hạng" },
];

export function ClassDetailTabs({ initialTab, panels, badges }: { initialTab: ClassTab; panels: Record<ClassTab, ReactNode>; badges?: Partial<Record<ClassTab, number>> }) {
  const [active, setActive] = useState<ClassTab>(initialTab);
  const select = (tab: ClassTab) => {
    setActive(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  };

  return <div className="mt-7">
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-2 rounded-2xl border border-teal-100 bg-white/80 p-2 shadow-sm backdrop-blur">
        {tabs.map((tab) => <button key={tab.key} type="button" onClick={() => select(tab.key)} className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${active === tab.key ? "bg-teal-600 text-white shadow-md shadow-teal-200" : "text-slate-600 hover:bg-teal-50 hover:text-teal-800"}`}>
          {tab.label}{typeof badges?.[tab.key] === "number" && <span className={`rounded-full px-2 py-0.5 text-xs ${active === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{badges[tab.key]}</span>}
        </button>)}
      </div>
    </div>
    <div className="mt-5" key={active}>{panels[active]}</div>
  </div>;
}
