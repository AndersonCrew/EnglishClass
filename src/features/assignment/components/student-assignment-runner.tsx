"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuestionType } from "@/types/database.generated";
import { saveStudentAnswerAction, submitAssignmentAction } from "../server/actions";

type Question = { id: string; task_id: string; type: QuestionType; prompt: string; instruction: string | null; image_url: string | null; config: Record<string, unknown>; points: number };
type Task = { id: string; title: string; instruction: string | null; skill: string; category: string | null };
type SavedAnswer = { question_id: string; answer: Record<string, unknown>; auto_score: number | null; is_correct: boolean | null; teacher_score: number | null; teacher_feedback: string | null };

export function StudentAssignmentRunner({ title, tasks, questions, submissionId, initialAnswers, submitted, showResults }: { title: string; tasks: Task[]; questions: Question[]; submissionId: string; initialAnswers: SavedAnswer[]; submitted: boolean; showResults: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>(() => Object.fromEntries(initialAnswers.map((item) => [item.question_id, item.answer])));
  const [saved, setSaved] = useState<Record<string, boolean>>({}); const [message, setMessage] = useState("");
  const save = (questionId: string) => startTransition(async () => { const result = await saveStudentAnswerAction(submissionId, questionId, answers[questionId] ?? {}); setMessage(result.message); if (result.ok) setSaved((current) => ({ ...current, [questionId]: true })); });
  const submit = () => startTransition(async () => { const result = await submitAssignmentAction(submissionId); setMessage(result.message); if (result.ok) router.refresh(); });
  return <div className="space-y-6">
    <header className="rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-600 p-6 text-white shadow-sm"><p className="text-sm font-bold text-teal-50">BÀI TẬP CỦA EM</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><p className="mt-2 text-teal-50">Làm từng câu rồi bấm “Lưu câu trả lời”.</p></header>
    {tasks.map((task) => <section key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{task.skill}</span><h2 className="mt-3 text-2xl font-bold">{task.title}</h2>{task.instruction && <p className="mt-2 text-slate-600">{task.instruction}</p>}
      <div className="mt-5 space-y-5">{questions.filter((item) => item.task_id === task.id).map((question, index) => <article key={question.id} className="rounded-2xl border-2 border-slate-100 p-5">
        <p className="text-lg font-bold"><span className="mr-2 text-teal-600">Câu {index + 1}</span>{question.prompt}</p>{question.instruction && <p className="mt-1 text-slate-500">{question.instruction}</p>}
        {question.image_url && <Image unoptimized src={question.image_url} width={800} height={450} alt="Minh họa câu hỏi" className="mt-4 max-h-80 w-full rounded-xl object-contain" />}
        <AnswerInput question={question} value={answers[question.id] ?? {}} disabled={submitted} onChange={(value) => { setAnswers({ ...answers, [question.id]: value }); setSaved({ ...saved, [question.id]: false }); }} />
        {!submitted && <button disabled={pending} className="mt-4 min-h-12 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white disabled:opacity-50" onClick={() => save(question.id)}>{saved[question.id] ? "✓ Đã lưu" : "Lưu câu trả lời"}</button>}
        {submitted && showResults && <Result answer={initialAnswers.find((item) => item.question_id === question.id)} />}
      </article>)}</div>
    </section>)}
    {message && <p className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-800">{message}</p>}
    {!submitted ? <button disabled={pending} onClick={submit} className="min-h-14 w-full rounded-2xl bg-amber-500 px-6 py-4 text-xl font-bold text-slate-900 shadow-sm disabled:opacity-50">Nộp bài</button> : <div className="rounded-2xl bg-emerald-50 p-5 text-center text-lg font-bold text-emerald-800">🎉 Em đã nộp bài thành công!</div>}
  </div>;
}

function AnswerInput({ question, value, disabled, onChange }: { question: Question; value: Record<string, unknown>; disabled: boolean; onChange: (value: Record<string, unknown>) => void }) {
  if (question.type === "MULTIPLE_CHOICE") {
    const options = (question.config.options as { id: string; label: string }[] | undefined) ?? [];
    return <div className="mt-4 grid gap-3 sm:grid-cols-2">{options.map((option) => <button disabled={disabled} key={option.id} onClick={() => onChange({ optionId: option.id })} className={`min-h-14 rounded-xl border-2 p-3 text-left font-semibold ${value.optionId === option.id ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>{option.label}</button>)}</div>;
  }
  if (question.type === "TRUE_FALSE") return <div className="mt-4 grid grid-cols-2 gap-3">{[[true, "Đúng"], [false, "Sai"]].map(([option, label]) => <button disabled={disabled} key={String(option)} onClick={() => onChange({ value: option })} className={`min-h-14 rounded-xl border-2 font-bold ${value.value === option ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>{String(label)}</button>)}</div>;
  if (question.type === "FILL_BLANK" || question.type === "TEXT_INPUT") return <textarea disabled={disabled} value={String(value.text ?? "")} onChange={(event) => onChange({ text: event.target.value })} className="mt-4 min-h-24 w-full rounded-xl border-2 border-slate-200 p-4 text-lg" placeholder="Em nhập câu trả lời ở đây" />;
  if (question.type === "MATCHING") return <MatchingInput question={question} value={value} disabled={disabled} onChange={onChange} />;
  return <OrderingInput question={question} value={value} disabled={disabled} onChange={onChange} />;
}

function MatchingInput({ question, value, disabled, onChange }: { question: Question; value: Record<string, unknown>; disabled: boolean; onChange: (value: Record<string, unknown>) => void }) {
  const left = (question.config.left as { id: string; label: string }[] | undefined) ?? []; const right = (question.config.right as { id: string; label: string }[] | undefined) ?? []; const pairs = (value.pairs as { leftId: string; rightId: string }[] | undefined) ?? [];
  return <div className="mt-4 space-y-3">{left.map((item) => <label key={item.id} className="grid items-center gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><b>{item.label}</b><select disabled={disabled} className="rounded-lg border border-slate-300 bg-white p-3" value={pairs.find((pair) => pair.leftId === item.id)?.rightId ?? ""} onChange={(event) => onChange({ pairs: [...pairs.filter((pair) => pair.leftId !== item.id), { leftId: item.id, rightId: event.target.value }].sort((a, b) => a.leftId.localeCompare(b.leftId)) })}><option value="">Chọn để nối</option>{right.map((itemRight) => <option key={itemRight.id} value={itemRight.id}>{itemRight.label}</option>)}</select></label>)}</div>;
}

function OrderingInput({ question, value, disabled, onChange }: { question: Question; value: Record<string, unknown>; disabled: boolean; onChange: (value: Record<string, unknown>) => void }) {
  const items = (question.config.items as { id: string; label: string }[] | undefined) ?? []; const current = (value.itemIds as string[] | undefined) ?? items.map((item) => item.id);
  const move = (index: number, delta: number) => { const next = [...current]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange({ itemIds: next }); };
  return <div className="mt-4 space-y-2">{current.map((itemId, index) => <div key={itemId} className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><b className="text-teal-700">{index + 1}</b><span className="flex-1 font-semibold">{items.find((item) => item.id === itemId)?.label}</span><button disabled={disabled} onClick={() => move(index, -1)}>↑</button><button disabled={disabled} onClick={() => move(index, 1)}>↓</button></div>)}</div>;
}

function Result({ answer }: { answer?: SavedAnswer }) { if (!answer) return null; const score = answer.teacher_score ?? answer.auto_score; return <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold">{score === null ? "Giáo viên sẽ chấm câu này." : `Điểm: ${score}`}{answer.teacher_feedback && <p className="mt-1 font-normal">Nhận xét: {answer.teacher_feedback}</p>}</div>; }
