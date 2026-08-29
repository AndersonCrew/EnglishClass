"use client";

import { useMemo, useState, useTransition } from "react";

import { parseWorkbook } from "@/features/student-import/parser";
import type { ParsedStudent, ParsedWorkbook } from "@/features/student-import/types";
import { bulkCreateStudentsAction, createStudentAction, removeStudentAction, resetStudentPasswordAction, updateStudentAction } from "@/features/students/server/actions";
import type { StudentCredential, StudentInput, StudentRecord } from "@/features/students/types";
import { isPossibleDuplicate } from "@/features/students/utils/duplicate-detection";

interface Props { classroomId: string; classroomName: string; initialStudents: StudentRecord[]; }
type Mode = "closed" | "choice" | "manual" | "excel";
type BulkResult = { success: boolean; message: string; fullName: string; credential?: StudentCredential };
const blankStudent: StudentInput = { fullName: "", dateOfBirth: null, gender: null, parentPhone: null };
const inputClass = "min-h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function CredentialCard({ credential }: { credential: StudentCredential }) {
  return <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
    <p className="font-bold text-slate-900">{credential.fullName}</p>
    <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      <p>Username: <strong>{credential.username}</strong></p>
      <p>Password: <strong>{credential.temporaryPassword}</strong></p>
    </div>
    <button className="mt-3 text-sm font-semibold text-teal-800 underline" onClick={() => navigator.clipboard.writeText(`${credential.username}\n${credential.temporaryPassword}`)} type="button">Copy thông tin đăng nhập</button>
  </div>;
}

export function StudentManager({ classroomId, classroomName, initialStudents }: Props) {
  const [mode, setMode] = useState<Mode>("closed");
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState<StudentInput>(blankStudent);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [viewing, setViewing] = useState<StudentRecord | null>(null);
  const [credential, setCredential] = useState<StudentCredential | null>(null);
  const [bulkCredentials, setBulkCredentials] = useState<StudentCredential[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [message, setMessage] = useState("");
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [sheet, setSheet] = useState("");
  const [preview, setPreview] = useState<Array<ParsedStudent & { selected: boolean; possibleDuplicate: boolean }>>([]);
  const [isPending, startTransition] = useTransition();

  const visibleStudents = useMemo(() => initialStudents.filter((student) => student.fullName.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))), [initialStudents, search]);

  const selectSheet = (name: string, parsed = workbook) => {
    setSheet(name);
    const rows = parsed?.studentsBySheet[name] ?? [];
    setPreview(rows.map((row) => ({ ...row, selected: !row.issues.includes("Ngày sinh không hợp lệ"), possibleDuplicate: isPossibleDuplicate(row, initialStudents) })));
  };

  async function loadExcel(file?: File) {
    setMessage("");
    if (!file) return;
    const extensionOk = /\.xlsx?$/i.test(file.name);
    const mimeOk = !file.type || ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"].includes(file.type);
    if (!extensionOk || !mimeOk) return setMessage("Chỉ chấp nhận file .xls hoặc .xlsx.");
    if (file.size > 5 * 1024 * 1024) return setMessage("File Excel không được vượt quá 5 MB.");
    try {
      const parsed = parseWorkbook(await file.arrayBuffer(), classroomName);
      setWorkbook(parsed);
      selectSheet(parsed.suggestedSheet, parsed);
    } catch { setMessage("Không thể đọc file Excel này."); }
  }

  function createManual() {
    setMessage(""); setCredential(null);
    startTransition(async () => {
      const result = await createStudentAction(classroomId, manual);
      if (!result.success) return setMessage(result.message);
      setCredential(result.credential); setManual(blankStudent); setMessage("Đã tạo tài khoản. Mật khẩu chỉ hiển thị trong lần này.");
    });
  }

  function confirmImport() {
    const selected = preview.filter((row) => row.selected && !row.issues.includes("Ngày sinh không hợp lệ"));
    if (!selected.length) return setMessage("Hãy chọn ít nhất một học sinh hợp lệ.");
    setMessage(""); setBulkCredentials([]); setBulkResults([]);
    startTransition(async () => {
      const result = await bulkCreateStudentsAction(classroomId, selected.map(({ fullName, dateOfBirth, gender, parentPhone }) => ({ fullName, dateOfBirth, gender, parentPhone })));
      if (!result.success) return setMessage(result.message);
      const credentials = result.results.flatMap((item) => item.credential ? [item.credential] : []);
      setBulkCredentials(credentials);
      setBulkResults(result.results);
      setMessage(`Đã chọn ${selected.length} • Tạo thành công ${credentials.length} • Thất bại ${selected.length - credentials.length}`);
    });
  }

  function saveEdit() {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateStudentAction(classroomId, editing.id, editing);
      if (!result.success) return setMessage(result.message);
      setEditing(null); setMessage("Đã cập nhật học sinh. Username được giữ nguyên.");
    });
  }

  function removeStudent(student: StudentRecord) {
    if (!window.confirm(`Bạn có chắc muốn xoá ${student.fullName} khỏi lớp ${classroomName}? Tài khoản đăng nhập vẫn được giữ.`)) return;
    startTransition(async () => {
      const result = await removeStudentAction(classroomId, student.id);
      setMessage(result.success ? "Đã xoá học sinh khỏi lớp; tài khoản vẫn tồn tại." : result.message);
    });
  }

  function resetPassword(student: StudentRecord) {
    if (!window.confirm(`Đặt lại mật khẩu cho ${student.fullName}?`)) return;
    startTransition(async () => {
      const result = await resetStudentPasswordAction(classroomId, student.id);
      if (!result.success) return setMessage(result.message);
      setCredential({ studentId: student.id, fullName: student.fullName, username: student.username, temporaryPassword: result.temporaryPassword });
      setMessage("Mật khẩu mới chỉ hiển thị trong lần này.");
    });
  }

  return <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 className="text-2xl font-bold">Học sinh</h2><p className="mt-1 text-slate-500">{initialStudents.length} học sinh</p></div>
      <button className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800" onClick={() => setMode(mode === "closed" ? "choice" : "closed")} type="button">+ Thêm học sinh</button>
    </div>

    {message ? <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700" role="status">{message}</p> : null}
    {credential ? <div className="mt-4"><CredentialCard credential={credential} /></div> : null}

    {mode === "choice" ? <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      <button className="rounded-xl border bg-white p-5 text-left hover:border-teal-500" onClick={() => setMode("manual")} type="button"><strong>+ Thêm thủ công</strong><span className="mt-1 block text-sm text-slate-500">Nhập một học sinh</span></button>
      <button className="rounded-xl border bg-white p-5 text-left hover:border-teal-500" onClick={() => setMode("excel")} type="button"><strong>↑ Import từ Excel</strong><span className="mt-1 block text-sm text-slate-500">Preview trước khi tạo</span></button>
    </div> : null}

    {mode === "manual" ? <div className="mt-5 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">Thêm học sinh thủ công</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Họ và tên *<input className={`${inputClass} mt-2`} value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} /></label>
        <label className="text-sm font-semibold">Ngày sinh<input className={`${inputClass} mt-2`} type="date" value={manual.dateOfBirth ?? ""} onChange={(e) => setManual({ ...manual, dateOfBirth: e.target.value || null })} /></label>
        <label className="text-sm font-semibold">Giới tính<select className={`${inputClass} mt-2`} value={manual.gender ?? ""} onChange={(e) => setManual({ ...manual, gender: (e.target.value || null) as StudentInput["gender"] })}><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
        <label className="text-sm font-semibold">SĐT phụ huynh<input className={`${inputClass} mt-2`} value={manual.parentPhone ?? ""} onChange={(e) => setManual({ ...manual, parentPhone: e.target.value || null })} /></label>
      </div><div className="mt-4 flex gap-3"><button className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={createManual} type="button">{isPending ? "Đang tạo…" : "Tạo tài khoản"}</button><button onClick={() => setMode("choice")} type="button">Quay lại</button></div>
    </div> : null}

    {mode === "excel" ? <div className="mt-5 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">Import từ Excel</h3><p className="mt-1 text-sm text-slate-500">File chỉ được đọc để preview, chưa tạo tài khoản.</p>
      <input accept=".xls,.xlsx" className="mt-4 block w-full text-sm" onChange={(e) => loadExcel(e.target.files?.[0])} type="file" />
      {workbook ? <><label className="mt-4 block text-sm font-semibold">Sheet<select className={`${inputClass} mt-2`} value={sheet} onChange={(e) => selectSheet(e.target.value)}>{workbook.sheetNames.map((name) => <option key={name}>{name}</option>)}</select></label>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Chọn</th><th>STT</th><th>Họ tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Số điện thoại</th><th>Trạng thái</th></tr></thead><tbody>{preview.map((row, index) => <tr className="border-t" key={`${row.rowNumber}-${index}`}><td className="p-3"><input checked={row.selected} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, selected: e.target.checked } : item))} type="checkbox" /></td><td>{row.ordinal}</td><td><input className={inputClass} value={row.fullName} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))} /></td><td><input className={inputClass} type="date" value={row.dateOfBirth ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, dateOfBirth: e.target.value || null, issues: item.issues.filter((issue) => !issue.includes("Ngày sinh")) } : item))} /></td><td><select className={inputClass} value={row.gender ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, gender: (e.target.value || null) as StudentInput["gender"] } : item))}><option value="">—</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></td><td><input className={inputClass} value={row.parentPhone ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, parentPhone: e.target.value || null } : item))} /></td><td className={row.possibleDuplicate || row.issues.length ? "text-amber-700" : "text-teal-700"}>{row.possibleDuplicate ? "Có thể đã tồn tại" : row.issues[0] ?? "Hợp lệ"}</td></tr>)}</tbody></table></div>
        <button className="mt-4 rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={confirmImport} type="button">Tạo tài khoản cho {preview.filter((row) => row.selected).length} học sinh</button>
      </> : null}
      {bulkResults.length ? <div className="mt-5 overflow-hidden rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Học sinh</th><th>Kết quả</th></tr></thead><tbody>{bulkResults.map((item, index) => <tr className="border-t" key={`${item.fullName}-${index}`}><td className="p-3 font-medium">{item.fullName}</td><td className={item.success ? "text-teal-700" : "text-red-700"}>{item.message}</td></tr>)}</tbody></table></div> : null}
      {bulkCredentials.length ? <div className="mt-5 space-y-3">{bulkCredentials.map((item) => <CredentialCard credential={item} key={item.studentId} />)}</div> : null}
    </div> : null}

    <div className="mt-7"><input aria-label="Tìm học sinh" className={`${inputClass} max-w-sm`} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên học sinh…" value={search} />
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Họ tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Username</th><th>Trạng thái</th><th>Actions</th></tr></thead><tbody>{visibleStudents.map((student) => <tr className="border-t" key={student.id}><td className="p-3 font-semibold">{student.fullName}</td><td>{student.dateOfBirth ?? "—"}</td><td>{student.gender === "FEMALE" ? "Nữ" : student.gender === "MALE" ? "Nam" : "—"}</td><td>{student.username}</td><td><span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Đang học</span></td><td><div className="flex gap-2"><button className="text-slate-700" onClick={() => setViewing(student)} type="button">Xem</button><button className="text-teal-700" onClick={() => setEditing(student)} type="button">Sửa</button><button className="text-amber-700" onClick={() => resetPassword(student)} type="button">Reset mật khẩu</button><button className="text-red-700" onClick={() => removeStudent(student)} type="button">Xoá khỏi lớp</button></div></td></tr>)}</tbody></table>{!visibleStudents.length ? <p className="p-6 text-center text-slate-500">Chưa có học sinh.</p> : null}</div>
    </div>

    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">Sửa học sinh</h3><div className="mt-4 grid gap-3"><input className={inputClass} value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /><input className={inputClass} type="date" value={editing.dateOfBirth ?? ""} onChange={(e) => setEditing({ ...editing, dateOfBirth: e.target.value || null })} /><select className={inputClass} value={editing.gender ?? ""} onChange={(e) => setEditing({ ...editing, gender: (e.target.value || null) as StudentInput["gender"] })}><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select><input className={inputClass} placeholder="SĐT phụ huynh" value={editing.parentPhone ?? ""} onChange={(e) => setEditing({ ...editing, parentPhone: e.target.value || null })} /></div><p className="mt-3 text-sm text-slate-500">Username giữ nguyên: {editing.username}</p><div className="mt-5 flex gap-3"><button className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white" onClick={saveEdit} type="button">Lưu</button><button onClick={() => setEditing(null)} type="button">Huỷ</button></div></div></div> : null}
    {viewing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">{viewing.fullName}</h3><dl className="mt-4 grid grid-cols-[130px_1fr] gap-3 text-sm"><dt className="text-slate-500">Ngày sinh</dt><dd>{viewing.dateOfBirth ?? "—"}</dd><dt className="text-slate-500">Giới tính</dt><dd>{viewing.gender === "FEMALE" ? "Nữ" : viewing.gender === "MALE" ? "Nam" : "—"}</dd><dt className="text-slate-500">SĐT phụ huynh</dt><dd>{viewing.parentPhone ?? "—"}</dd><dt className="text-slate-500">Username</dt><dd className="font-semibold">{viewing.username}</dd></dl><button className="mt-5 rounded-lg bg-slate-100 px-4 py-2 font-semibold" onClick={() => setViewing(null)} type="button">Đóng</button></div></div> : null}
  </section>;
}
