import Link from "next/link";
import { CreateClassroomForm } from "@/features/classroom/components/create-classroom-form";

export default function NewClassroomPage() {
  return <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8"><Link href="/teacher" className="text-sm font-bold text-teal-700">← Trang chủ</Link><h1 className="mt-3 text-3xl font-bold">Tạo lớp mới</h1><p className="mt-2 text-slate-500">Nhập thông tin cơ bản. Bạn có thể thêm học sinh sau khi tạo lớp.</p><CreateClassroomForm /></main>;
}
