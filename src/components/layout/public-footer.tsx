import Link from "next/link";

export function PublicFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={dark ? "border-t border-white/10 bg-slate-950 text-slate-400" : "border-t border-slate-200 bg-white text-slate-500"}>
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-center text-sm sm:flex-row sm:px-8 sm:text-left">
        <p>© {new Date().getFullYear()} EnglishClass. Nền tảng hỗ trợ học Tiếng Anh tiểu học.</p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Thông tin pháp lý">
          <Link className={dark ? "font-semibold text-slate-300 hover:text-teal-300" : "font-semibold text-slate-600 hover:text-teal-700"} href="/privacy">Chính sách quyền riêng tư</Link>
          <Link className={dark ? "font-semibold text-slate-300 hover:text-teal-300" : "font-semibold text-slate-600 hover:text-teal-700"} href="/terms">Điều khoản sử dụng</Link>
        </nav>
      </div>
    </footer>
  );
}
