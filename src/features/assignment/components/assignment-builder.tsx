"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { saveAssignmentAction, uploadQuestionMediaAction } from "../server/actions";
import type { AssignmentDraft, BuilderQuestion, BuilderTask } from "../types";
import type { QuestionType, SkillType } from "@/types/database.generated";

const labels: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Chọn đáp án", TRUE_FALSE: "Đúng / Sai", FILL_BLANK: "Điền vào chỗ trống",
  MATCHING: "Nối cặp", ORDERING: "Sắp xếp", TEXT_INPUT: "Tự luận ngắn",
};
const skills: SkillType[] = ["LISTENING", "SPEAKING", "READING", "WRITING"];
const questionTypes = Object.keys(labels) as QuestionType[];
const id = () => crypto.randomUUID();

function newQuestion(type: QuestionType = "MULTIPLE_CHOICE"): BuilderQuestion {
  if (type === "MULTIPLE_CHOICE") return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: { options: [{ id: "a", label: "" }, { id: "b", label: "" }] }, answerKey: { optionId: "a" } };
  if (type === "TRUE_FALSE") return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: {}, answerKey: { value: true } };
  if (type === "FILL_BLANK") return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: {}, answerKey: { accepted: [""], caseSensitive: false } };
  if (type === "MATCHING") return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: { left: [], right: [] }, answerKey: { pairs: [] } };
  if (type === "ORDERING") return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: { items: [] }, answerKey: { itemIds: [] } };
  return { clientId: id(), type, prompt: "", instruction: "", imagePath: null, points: 1, config: {}, answerKey: {} };
}
function newTask(): BuilderTask { return { clientId: id(), title: "Phần 1", instruction: "", skill: "READING", category: "", questions: [newQuestion()] }; }

export function AssignmentBuilder({ classroomId }: { classroomId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<AssignmentDraft>({ classroomId, title: "", description: "", dueAt: "", showResultsAfterSubmit: false, tasks: [newTask()] });
  const [message, setMessage] = useState(""); const [preview, setPreview] = useState(false); const [pending, startTransition] = useTransition();
  const questionCount = useMemo(() => draft.tasks.reduce((n, task) => n + task.questions.length, 0), [draft.tasks]);
  const patchTask = (taskId: string, patch: Partial<BuilderTask>) => setDraft((current) => ({ ...current, tasks: current.tasks.map((task) => task.clientId === taskId ? { ...task, ...patch } : task) }));
  const patchQuestion = (taskId: string, questionId: string, patch: Partial<BuilderQuestion>) => setDraft((current) => ({ ...current, tasks: current.tasks.map((task) => task.clientId === taskId ? { ...task, questions: task.questions.map((q) => q.clientId === questionId ? { ...q, ...patch } : q) } : task) }));
  const moveQuestion = (taskId: string, index: number, delta: number) => setDraft((current) => ({ ...current, tasks: current.tasks.map((task) => { if (task.clientId !== taskId) return task; const next = [...task.questions]; const target = index + delta; if (target < 0 || target >= next.length) return task; [next[index], next[target]] = [next[target], next[index]]; return { ...task, questions: next }; }) }));
  const save = (publish: boolean) => startTransition(async () => { const result = await saveAssignmentAction(draft, publish); setMessage(result.message); if (result.ok) router.push(`/teacher/classes/${classroomId}/assignments`); });

  return <div className="space-y-6">
    {pending ? <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/70 p-5 backdrop-blur-sm" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-teal-800 shadow-xl ring-1 ring-teal-100"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang lưu bài tập…</div></div> : null}
    <section className="rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100 p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Tên bài tập<input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ví dụ: Unit 2 – Practice" /></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Mô tả<textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <label className="text-sm font-semibold text-slate-700">Hạn nộp<input type="datetime-local" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" value={draft.dueAt} onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })} /></label>
        <label className="flex items-center gap-3 self-end rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold"><input type="checkbox" checked={draft.showResultsAfterSubmit} onChange={(e) => setDraft({ ...draft, showResultsAfterSubmit: e.target.checked })} /> Cho học sinh xem điểm sau khi nộp</label>
      </div>
    </section>

    {draft.tasks.map((task, taskIndex) => <section key={task.clientId} className="rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Phần {taskIndex + 1}</h2>{draft.tasks.length > 1 && <button className="text-sm font-semibold text-rose-600" onClick={() => setDraft({ ...draft, tasks: draft.tasks.filter((t) => t.clientId !== task.clientId) })}>Xóa phần</button>}</div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <input className="rounded-xl border border-slate-300 px-4 py-3" value={task.title} onChange={(e) => patchTask(task.clientId, { title: e.target.value })} placeholder="Tên phần" />
        <select className="rounded-xl border border-slate-300 px-4 py-3" value={task.skill} onChange={(e) => patchTask(task.clientId, { skill: e.target.value as SkillType })}>{skills.map((skill) => <option key={skill}>{skill}</option>)}</select>
        <input className="rounded-xl border border-slate-300 px-4 py-3" value={task.category} onChange={(e) => patchTask(task.clientId, { category: e.target.value })} placeholder="Chủ đề, ví dụ Vocabulary" />
      </div>
      <input className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3" value={task.instruction} onChange={(e) => patchTask(task.clientId, { instruction: e.target.value })} placeholder="Hướng dẫn cho phần này" />

      <div className="mt-5 space-y-4">{task.questions.map((question, questionIndex) => <QuestionEditor key={question.clientId} classroomId={classroomId} question={question} number={questionIndex + 1}
        onPatch={(patch) => patchQuestion(task.clientId, question.clientId, patch)}
        onDelete={() => patchTask(task.clientId, { questions: task.questions.filter((q) => q.clientId !== question.clientId) })}
        onDuplicate={() => patchTask(task.clientId, { questions: [...task.questions.slice(0, questionIndex + 1), { ...question, clientId: id() }, ...task.questions.slice(questionIndex + 1)] })}
        onMove={(delta) => moveQuestion(task.clientId, questionIndex, delta)} />)}</div>
      <button className="mt-4 rounded-xl border border-dashed border-teal-400 px-4 py-3 font-semibold text-teal-700" onClick={() => patchTask(task.clientId, { questions: [...task.questions, newQuestion()] })}>+ Thêm câu hỏi</button>
    </section>)}

    <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold" onClick={() => setDraft({ ...draft, tasks: [...draft.tasks, newTask()] })}>+ Thêm phần bài tập</button>
    {preview && <Preview draft={draft} />}
    {message && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{message}</p>}
    <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/90 shadow-md shadow-teal-100/60 ring-1 ring-teal-100/95 p-4 shadow-lg backdrop-blur">
      <span className="text-sm text-slate-500">{draft.tasks.length} phần • {questionCount} câu</span><div className="flex gap-2"><button className="rounded-xl border border-slate-300 px-4 py-3 font-semibold" onClick={() => setPreview(!preview)}>Xem trước</button><button disabled={pending} className="rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50" onClick={() => save(false)}>{pending ? "Đang lưu…" : "Lưu nháp"}</button><button disabled={pending} className="rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white disabled:opacity-50" onClick={() => save(true)}>{pending ? "Đang giao…" : "Giao bài"}</button></div>
    </div>
  </div>;
}

function QuestionEditor({ classroomId, question, number, onPatch, onDelete, onDuplicate, onMove }: { classroomId: string; question: BuilderQuestion; number: number; onPatch: (patch: Partial<BuilderQuestion>) => void; onDelete: () => void; onDuplicate: () => void; onMove: (delta: number) => void }) {
  const options = (question.config.options as { id: string; label: string }[] | undefined) ?? [];
  const [imageUrl, setImageUrl] = useState<string | null>(null); const [uploading, startUpload] = useTransition();
  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">{number}</span><select className="rounded-lg border border-slate-300 bg-white px-3 py-2" value={question.type} onChange={(e) => onPatch(newQuestion(e.target.value as QuestionType))}>{questionTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}</select><input type="number" min="0.5" step="0.5" className="w-24 rounded-lg border border-slate-300 px-3 py-2" value={question.points} onChange={(e) => onPatch({ points: Number(e.target.value) })} aria-label="Điểm" /><div className="ml-auto flex gap-2 text-sm"><button onClick={() => onMove(-1)}>↑</button><button onClick={() => onMove(1)}>↓</button><button onClick={onDuplicate}>Nhân đôi</button><button className="text-rose-600" onClick={onDelete}>Xóa</button></div></div>
    <textarea className="mt-3 min-h-20 w-full rounded-xl border border-slate-300 bg-white px-4 py-3" value={question.prompt} onChange={(e) => onPatch({ prompt: e.target.value })} placeholder="Nội dung câu hỏi" />
    <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">{uploading ? "Đang tải..." : "Thêm ảnh"}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const formData = new FormData(); formData.set("file", file); startUpload(async () => { const result = await uploadQuestionMediaAction(classroomId, formData); if (result.ok && result.path) { onPatch({ imagePath: result.path }); setImageUrl(result.signedUrl ?? null); } }); }} /></label>{imageUrl && <Image unoptimized src={imageUrl} width={640} height={360} alt="Ảnh câu hỏi" className="mt-3 max-h-48 w-auto rounded-xl object-contain" />}
    {question.type === "MULTIPLE_CHOICE" && <div className="mt-3 space-y-2">{options.map((option, index) => <div key={option.id} className="flex items-center gap-2"><input type="radio" checked={question.answerKey.optionId === option.id} onChange={() => onPatch({ answerKey: { optionId: option.id } })} /><input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={option.label} onChange={(e) => onPatch({ config: { options: options.map((item, i) => i === index ? { ...item, label: e.target.value } : item) } })} placeholder={`Đáp án ${index + 1}`} /></div>)}</div>}
    {question.type === "TRUE_FALSE" && <div className="mt-3 flex gap-4"><label><input type="radio" checked={question.answerKey.value === true} onChange={() => onPatch({ answerKey: { value: true } })} /> Đúng</label><label><input type="radio" checked={question.answerKey.value === false} onChange={() => onPatch({ answerKey: { value: false } })} /> Sai</label></div>}
    {question.type === "FILL_BLANK" && <input className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={((question.answerKey.accepted as string[] | undefined) ?? []).join(", ")} onChange={(e) => onPatch({ answerKey: { accepted: e.target.value.split(",").map((v) => v.trim()), caseSensitive: false } })} placeholder="Đáp án chấp nhận, cách nhau bằng dấu phẩy" />}
    {(question.type === "MATCHING" || question.type === "ORDERING") && <textarea className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" placeholder={question.type === "MATCHING" ? "Mỗi dòng: dog = con chó" : "Mỗi dòng là một mục theo đúng thứ tự"} onChange={(e) => { const lines = e.target.value.split("\n").filter(Boolean); if (question.type === "ORDERING") { const items = lines.map((label, i) => ({ id: String(i), label })); onPatch({ config: { items }, answerKey: { itemIds: items.map((item) => item.id) } }); } else { const pairs = lines.map((line, i) => { const [left, right = ""] = line.split("="); return { left: { id: `l${i}`, label: left.trim() }, right: { id: `r${i}`, label: right.trim() } }; }); onPatch({ config: { left: pairs.map((p) => p.left), right: pairs.map((p) => p.right) }, answerKey: { pairs: pairs.map((p) => ({ leftId: p.left.id, rightId: p.right.id })) } }); } }} />}
    {question.type === "TEXT_INPUT" && <p className="mt-3 text-sm text-slate-500">Câu này giáo viên sẽ chấm thủ công.</p>}
  </article>;
}

function Preview({ draft }: { draft: AssignmentDraft }) { return <section className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-6"><p className="text-xs font-bold text-teal-700">XEM TRƯỚC CHO HỌC SINH</p><h2 className="mt-2 text-2xl font-bold">{draft.title || "Bài tập chưa đặt tên"}</h2>{draft.tasks.map((task) => <div key={task.clientId} className="mt-5"><h3 className="font-bold">{task.title}</h3>{task.questions.map((q, i) => <div key={q.clientId} className="mt-2 rounded-xl bg-white p-4"><b>Câu {i + 1}.</b> {q.prompt || "Chưa nhập câu hỏi"}</div>)}</div>)}</section>; }
