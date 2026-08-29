"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { parseWorkbook } from "@/features/student-import/parser";
import type { ParsedStudent, ParsedWorkbook } from "@/features/student-import/types";
import { bulkCreateStudentsAction, createStudentAction, resetStudentPasswordAction, updateStudentAction, withdrawStudentAction } from "@/features/students/server/actions";
import type { StudentCredential, StudentInput, StudentRecord } from "@/features/students/types";
import { isPossibleDuplicate } from "@/features/students/utils/duplicate-detection";
import { studentInputSchema } from "@/features/students/schemas/student-schema";

interface Props { classroomId: string; classroomName: string; initialStudents: StudentRecord[]; }
type Mode = "closed" | "choice" | "manual" | "excel";
type BulkResult = { success: boolean; message: string; fullName: string; credential?: StudentCredential };
type ConfirmDialog = { title: string; description: string; confirmLabel: string; danger?: boolean; onConfirm: () => void };
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
  const [manualErrors, setManualErrors] = useState<string[]>([]);
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [viewing, setViewing] = useState<StudentRecord | null>(null);
  const [openActionsFor, setOpenActionsFor] = useState<string | null>(null);
  const [actionsPosition, setActionsPosition] = useState({ top: 0, left: 0 });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [credential, setCredential] = useState<StudentCredential | null>(null);
  const [bulkCredentials, setBulkCredentials] = useState<StudentCredential[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
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
    const parsed = studentInputSchema.safeParse(manual);
    if (!parsed.success) {
      setManualErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setManualErrors([]);
    if (isPossibleDuplicate(manual, initialStudents)) {
      setConfirmDialog({
        title: "Học sinh có thể đã tồn tại",
        description: "Đã có học sinh trùng họ tên và ngày sinh trong lớp. Bạn vẫn muốn tạo một tài khoản riêng?",
        confirmLabel: "Vẫn tạo tài khoản",
        onConfirm: submitManualStudent,
      });
      return;
    }
    submitManualStudent();
  }

  function submitManualStudent() {
    startTransition(async () => {
      const result = await createStudentAction(classroomId, manual);
      if (!result.success) return setMessage(result.message);
      setCredential(result.credential); setManual(blankStudent); setMessage("Đã tạo tài khoản. Mật khẩu chỉ hiển thị trong lần này.");
    });
  }

  async function confirmImport() {
    const selected = preview.filter((row) => row.selected && !row.issues.includes("Ngày sinh không hợp lệ"));
    if (!selected.length) return setMessage("Hãy chọn ít nhất một học sinh hợp lệ.");
    setMessage(""); setBulkCredentials([]); setBulkResults([]); setImportProgress({ done: 0, total: selected.length });
    const allResults: BulkResult[] = []; const allCredentials: StudentCredential[] = [];
    for (let offset = 0; offset < selected.length; offset += 3) {
      const chunk = selected.slice(offset, offset + 3);
      const result = await bulkCreateStudentsAction(classroomId, chunk.map(({ fullName, dateOfBirth, gender, parentPhone }) => ({ fullName, dateOfBirth, gender, parentPhone })));
      const chunkResults: BulkResult[] = result.success
        ? result.results
        : chunk.map((row) => ({ success: false, message: result.message, fullName: row.fullName }));
      allResults.push(...chunkResults); setBulkResults([...allResults]);
      const credentials = chunkResults.flatMap((item) => item.credential ? [item.credential] : []);
      allCredentials.push(...credentials); setBulkCredentials([...allCredentials]);
      const successfulRows = new Set(chunk.flatMap((row, index) => chunkResults[index]?.success ? [row.rowNumber] : []));
      if (successfulRows.size) setPreview((current) => current.filter((row) => !successfulRows.has(row.rowNumber)));
      const done = Math.min(offset + chunk.length, selected.length); setImportProgress({ done, total: selected.length });
      setMessage(`Đang xử lý ${done}/${selected.length} • Thành công ${allCredentials.length} • Thất bại ${allResults.length - allCredentials.length}`);
    }
    setImportProgress(null);
    setMessage(`Hoàn tất ${selected.length} • Thành công ${allCredentials.length} • Thất bại ${allResults.length - allCredentials.length}`);
  }

  function saveEdit() {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateStudentAction(classroomId, editing.id, editing);
      if (!result.success) return setMessage(result.message);
      setEditing(null); setMessage("Đã cập nhật học sinh. Username được giữ nguyên.");
    });
  }

  function withdrawStudent(student: StudentRecord) {
    setConfirmDialog({
      title: "Cho học sinh thôi học?",
      description: `${student.fullName} sẽ chuyển sang trạng thái Đã thôi học trong lớp ${classroomName}. Hồ sơ, tài khoản và lịch sử học tập vẫn được giữ.`,
      confirmLabel: "Cho thôi học",
      danger: true,
      onConfirm: () => startTransition(async () => {
        const result = await withdrawStudentAction(classroomId, student.id);
        setMessage(result.success ? "Đã chuyển học sinh sang trạng thái Đã thôi học." : result.message);
      }),
    });
  }

  function resetPassword(student: StudentRecord) {
    setConfirmDialog({
      title: "Reset mật khẩu?",
      description: `Mật khẩu của ${student.fullName} sẽ được đặt lại thành 123456. Học sinh phải đổi mật khẩu sau khi đăng nhập.`,
      confirmLabel: "Reset mật khẩu",
      onConfirm: () => startTransition(async () => {
        const result = await resetStudentPasswordAction(classroomId, student.id);
        if (!result.success) return setMessage(result.message);
        setCredential({ studentId: student.id, fullName: student.fullName, username: student.username, temporaryPassword: result.temporaryPassword });
        setMessage("Đã reset mật khẩu về 123456.");
      }),
    });
  }

  return <section className="mt-8 rounded-2xl bg-white/90 p-5 shadow-lg shadow-teal-100/60 ring-1 ring-teal-100 sm:p-7">
    {isPending ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/70 p-5 backdrop-blur-sm" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-teal-800 shadow-xl ring-1 ring-teal-100"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang xử lý…</div></div> : null}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h2 className="text-2xl font-bold">Học sinh</h2><p className="mt-1 text-slate-500">{initialStudents.length} học sinh</p></div>
      <button className="rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700" onClick={() => setMode(mode === "closed" ? "choice" : "closed")} type="button">+ Thêm học sinh</button>
    </div>

    {message ? <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700" role="status">{message}</p> : null}
    {credential ? <div className="mt-4"><CredentialCard credential={credential} /></div> : null}

    {mode === "choice" ? <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      <button className="rounded-xl border bg-white p-5 text-left hover:border-teal-500" onClick={() => setMode("manual")} type="button"><strong>+ Thêm thủ công</strong><span className="mt-1 block text-sm text-slate-500">Nhập một học sinh</span></button>
      <button className="rounded-xl border bg-white p-5 text-left hover:border-teal-500" onClick={() => setMode("excel")} type="button"><strong>↑ Import từ Excel</strong><span className="mt-1 block text-sm text-slate-500">Preview trước khi tạo</span></button>
    </div> : null}

    {mode === "manual" ? <div className="mt-5 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">Thêm học sinh thủ công</h3>
      {manualErrors.length ? <div className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{manualErrors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Họ và tên *<input className={`${inputClass} mt-2`} value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} /></label>
        <label className="text-sm font-semibold">Ngày sinh<input className={`${inputClass} mt-2`} type="date" value={manual.dateOfBirth ?? ""} onChange={(e) => setManual({ ...manual, dateOfBirth: e.target.value || null })} /></label>
        <label className="text-sm font-semibold">Giới tính<select className={`${inputClass} mt-2`} value={manual.gender ?? ""} onChange={(e) => setManual({ ...manual, gender: (e.target.value || null) as StudentInput["gender"] })}><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
        <label className="text-sm font-semibold">SĐT phụ huynh<input className={`${inputClass} mt-2`} value={manual.parentPhone ?? ""} onChange={(e) => setManual({ ...manual, parentPhone: e.target.value || null })} /></label>
      </div><div className="mt-4 flex gap-3"><button className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={createManual} type="button">{isPending ? "Đang tạo…" : "Tạo tài khoản"}</button><button onClick={() => setMode("choice")} type="button">Quay lại</button></div>
    </div> : null}

    {mode === "excel" ? <div className="mt-5 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold">Import từ Excel</h3><p className="mt-1 text-sm text-slate-500">File chỉ được đọc để preview, chưa tạo tài khoản.</p>
      <input accept=".xls,.xlsx" className="mt-4 block w-full text-sm" onChange={(e) => loadExcel(e.target.files?.[0])} type="file" />
      {workbook ? <><label className="mt-4 block text-sm font-semibold">Sheet<select className={`${inputClass} mt-2`} value={sheet} onChange={(e) => selectSheet(e.target.value)}>{workbook.sheetNames.map((name) => <option key={name} value={name}>{name} ({workbook.studentsBySheet[name].length} học sinh)</option>)}</select></label>
        {!preview.length ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Sheet này không có danh sách học sinh hợp lệ. Hãy chọn sheet lớp khác.</p> : null}
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Chọn</th><th>STT</th><th>Họ tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Số điện thoại</th><th>Trạng thái</th></tr></thead><tbody>{preview.map((row, index) => <tr className="border-t" key={`${row.rowNumber}-${index}`}><td className="p-3"><input checked={row.selected} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, selected: e.target.checked } : item))} type="checkbox" /></td><td>{row.ordinal}</td><td><input className={inputClass} value={row.fullName} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, fullName: e.target.value } : item))} /></td><td><input className={inputClass} type="date" value={row.dateOfBirth ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, dateOfBirth: e.target.value || null, issues: item.issues.filter((issue) => !issue.includes("Ngày sinh")) } : item))} /></td><td><select className={inputClass} value={row.gender ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, gender: (e.target.value || null) as StudentInput["gender"] } : item))}><option value="">—</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></td><td><input className={inputClass} value={row.parentPhone ?? ""} onChange={(e) => setPreview(preview.map((item, i) => i === index ? { ...item, parentPhone: e.target.value || null } : item))} /></td><td className={row.possibleDuplicate || row.issues.length ? "text-amber-700" : "text-teal-700"}>{row.possibleDuplicate ? "Có thể đã tồn tại" : row.issues[0] ?? "Hợp lệ"}</td></tr>)}</tbody></table></div>
        {importProgress ? <div className="mt-4 rounded-xl bg-teal-50 p-4"><div className="flex items-center gap-3 text-sm font-bold text-teal-800"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang tạo {importProgress.done}/{importProgress.total} học sinh</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${Math.round(importProgress.done / importProgress.total * 100)}%` }} /></div></div> : null}
        <button className="mt-4 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={isPending || importProgress !== null} onClick={confirmImport} type="button">{importProgress ? "Đang tạo tài khoản…" : `Tạo tài khoản cho ${preview.filter((row) => row.selected).length} học sinh`}</button>
      </> : null}
      {bulkResults.length ? <div className="mt-5 overflow-hidden rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Học sinh</th><th>Kết quả</th></tr></thead><tbody>{bulkResults.map((item, index) => <tr className="border-t" key={`${item.fullName}-${index}`}><td className="p-3 font-medium">{item.fullName}</td><td className={item.success ? "text-teal-700" : "text-red-700"}>{item.message}</td></tr>)}</tbody></table></div> : null}
      {bulkCredentials.length ? <div className="mt-5 space-y-3">{bulkCredentials.map((item) => <CredentialCard credential={item} key={item.studentId} />)}</div> : null}
    </div> : null}

    <div className="mt-7"><input aria-label="Tìm học sinh" className={`${inputClass} max-w-sm`} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên học sinh…" value={search} />
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Họ tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Username</th><th>Trạng thái</th><th>Tuỳ chọn</th></tr></thead><tbody>{visibleStudents.map((student) => <tr className="border-t" key={student.id}><td className="p-3 font-semibold">{student.fullName}</td><td>{student.dateOfBirth ?? "—"}</td><td>{student.gender === "FEMALE" ? "Nữ" : student.gender === "MALE" ? "Nam" : "—"}</td><td>{student.username}</td><td>{student.displayStatus === "ACTIVE" ? <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">Đang học</span> : student.displayStatus === "WITHDRAWN" ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Đã thôi học</span> : <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Đã hết hạn</span>}</td><td className="py-2"><button aria-expanded={openActionsFor === student.id} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700" onClick={(event) => { if (openActionsFor === student.id) return setOpenActionsFor(null); const rect = event.currentTarget.getBoundingClientRect(); setActionsPosition({ top: rect.bottom + 8, left: Math.max(12, Math.min(rect.right - 192, window.innerWidth - 204)) }); setOpenActionsFor(student.id); }} type="button">Tuỳ chọn ▾</button></td></tr>)}</tbody></table>{!visibleStudents.length ? <p className="p-6 text-center text-slate-500">Chưa có học sinh.</p> : null}</div>
    </div>

    {openActionsFor ? createPortal(<div className="fixed inset-0 z-40" onClick={() => setOpenActionsFor(null)} role="presentation"><div className="fixed z-50 grid w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg" onClick={(event) => event.stopPropagation()} style={{ left: actionsPosition.left, top: actionsPosition.top }}>{(() => { const student = visibleStudents.find((item) => item.id === openActionsFor); if (!student) return null; return <><button className="rounded-lg px-3 py-2 text-left hover:bg-slate-100" onClick={() => { setViewing(student); setOpenActionsFor(null); }} type="button">Xem thông tin</button><button className="rounded-lg px-3 py-2 text-left text-teal-700 hover:bg-teal-50" onClick={() => { setEditing(student); setOpenActionsFor(null); }} type="button">Sửa thông tin</button><button className="rounded-lg px-3 py-2 text-left text-amber-700 hover:bg-amber-50" onClick={() => { setOpenActionsFor(null); resetPassword(student); }} type="button">Reset mật khẩu</button>{student.membershipStatus === "ACTIVE" ? <button className="rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50" onClick={() => { setOpenActionsFor(null); withdrawStudent(student); }} type="button">Cho thôi học</button> : null}</>; })()}</div></div>, document.body) : null}

    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">Sửa học sinh</h3><div className="mt-4 grid gap-3"><input className={inputClass} value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} /><input className={inputClass} type="date" value={editing.dateOfBirth ?? ""} onChange={(e) => setEditing({ ...editing, dateOfBirth: e.target.value || null })} /><select className={inputClass} value={editing.gender ?? ""} onChange={(e) => setEditing({ ...editing, gender: (e.target.value || null) as StudentInput["gender"] })}><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select><input className={inputClass} placeholder="SĐT phụ huynh" value={editing.parentPhone ?? ""} onChange={(e) => setEditing({ ...editing, parentPhone: e.target.value || null })} /></div><p className="mt-3 text-sm text-slate-500">Username giữ nguyên: {editing.username}</p><div className="mt-5 flex gap-3"><button className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white" onClick={saveEdit} type="button">Lưu</button><button onClick={() => setEditing(null)} type="button">Huỷ</button></div></div></div> : null}
    {viewing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-xl font-bold">{viewing.fullName}</h3><dl className="mt-4 grid grid-cols-[130px_1fr] gap-3 text-sm"><dt className="text-slate-500">Ngày sinh</dt><dd>{viewing.dateOfBirth ?? "—"}</dd><dt className="text-slate-500">Giới tính</dt><dd>{viewing.gender === "FEMALE" ? "Nữ" : viewing.gender === "MALE" ? "Nam" : "—"}</dd><dt className="text-slate-500">SĐT phụ huynh</dt><dd>{viewing.parentPhone ?? "—"}</dd><dt className="text-slate-500">Username</dt><dd className="font-semibold">{viewing.username}</dd></dl><button className="mt-5 rounded-lg bg-slate-100 px-4 py-2 font-semibold" onClick={() => setViewing(null)} type="button">Đóng</button></div></div> : null}
    {confirmDialog ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setConfirmDialog(null)} role="presentation"><div aria-describedby="confirm-description" aria-labelledby="confirm-title" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()} role="dialog"><div className={`flex size-11 items-center justify-center rounded-full text-xl ${confirmDialog.danger ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{confirmDialog.danger ? "!" : "?"}</div><h3 className="mt-4 text-xl font-bold text-slate-900" id="confirm-title">{confirmDialog.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600" id="confirm-description">{confirmDialog.description}</p><div className="mt-6 flex justify-end gap-3"><button className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200" onClick={() => setConfirmDialog(null)} type="button">Huỷ</button><button className={`rounded-lg px-4 py-2 font-semibold text-white ${confirmDialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-teal-600 hover:bg-teal-700"}`} onClick={() => { const action = confirmDialog.onConfirm; setConfirmDialog(null); action(); }} type="button">{confirmDialog.confirmLabel}</button></div></div></div> : null}
  </section>;
}
