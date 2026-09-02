import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFooter } from "./public-footer";

export function LegalPage({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5faf9] text-slate-800">
      <header className="border-b border-teal-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="text-xl font-black tracking-tight text-slate-900" href="/">English<span className="text-teal-600">Class</span></Link>
          <Link className="rounded-xl bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-100" href="/">← Trang chủ</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-6 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">{summary}</p>
          <p className="mt-5 text-sm font-semibold text-slate-500">Cập nhật lần cuối: 02/09/2026</p>
        </section>
        <article className="legal-content mt-7 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sm:p-9">{children}</article>
      </main>
      <PublicFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-slate-100 py-6 first:pt-0 last:border-0 last:pb-0"><h2 className="text-xl font-black text-slate-900">{title}</h2><div className="mt-3 space-y-3 leading-7 text-slate-600">{children}</div></section>;
}
