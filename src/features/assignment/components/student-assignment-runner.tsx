"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuestionType } from "@/types/database.generated";
import { saveStudentAnswerAction, submitAssignmentAction, uploadSpeakingAudioAction } from "../server/actions";

type Question = { id: string; task_id: string; type: QuestionType; prompt: string; instruction: string | null; image_url: string | null; config: Record<string, unknown>; points: number };
type Task = { id: string; title: string; instruction: string | null; skill: string; category: string | null };
type SavedAnswer = { question_id: string; answer: Record<string, unknown>; auto_score: number | null; is_correct: boolean | null; teacher_score: number | null; teacher_feedback: string | null; audio_url?: string | null };

export function StudentAssignmentRunner({ title, tasks, questions, submissionId, initialAnswers, submitted, showResults }: { title: string; tasks: Task[]; questions: Question[]; submissionId: string; initialAnswers: SavedAnswer[]; submitted: boolean; showResults: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>(() => Object.fromEntries(initialAnswers.map((item) => [item.question_id, item.answer])));
  const [saved, setSaved] = useState<Record<string, boolean>>(() => Object.fromEntries(initialAnswers.map((item) => [item.question_id, true]))); const [message, setMessage] = useState(""); const [submitDialog, setSubmitDialog] = useState(false);
  const save = (questionId: string) => startTransition(async () => { const result = await saveStudentAnswerAction(submissionId, questionId, answers[questionId] ?? {}); setMessage(result.message); if (result.ok) setSaved((current) => ({ ...current, [questionId]: true })); });
  const completeCount = questions.filter((question) => isCompleteAnswer(answers[question.id])).length;
  const submit = () => startTransition(async () => {
    if (completeCount !== questions.length) { setMessage(`Em còn ${questions.length - completeCount} câu chưa hoàn thành.`); setSubmitDialog(false); return; }
    const unsaved = questions.filter((question) => !saved[question.id] && question.config.responseMode !== "AUDIO");
    const saveResults = await Promise.all(unsaved.map((question) => saveStudentAnswerAction(submissionId, question.id, answers[question.id] ?? {})));
    if (saveResults.some((result) => !result.ok)) { setMessage("Một số câu chưa lưu được. Em hãy thử lại nhé."); setSubmitDialog(false); return; }
    const result = await submitAssignmentAction(submissionId); setMessage(result.message); setSubmitDialog(false); if (result.ok) router.refresh();
  });
  return <div className="space-y-6">
    {pending && <div className="fixed inset-0 z-[70] grid place-items-center bg-white/60 p-5 backdrop-blur-sm"><div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 font-bold text-teal-800 shadow-xl"><span className="size-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />Đang lưu bài của em…</div></div>}
    <header className="rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-600 p-6 text-white shadow-sm"><p className="text-sm font-bold text-teal-50">BÀI TẬP CỦA EM</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><div className="mt-4 h-3 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${questions.length ? completeCount / questions.length * 100 : 0}%` }} /></div><p className="mt-2 text-sm font-bold text-teal-50">Đã hoàn thành {completeCount}/{questions.length} câu</p></header>
    {tasks.map((task) => <section key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{task.skill}</span><h2 className="mt-3 text-2xl font-bold">{task.title}</h2>{task.instruction && <p className="mt-2 text-slate-600">{task.instruction}</p>}
      <div className="mt-5 space-y-5">{questions.filter((item) => item.task_id === task.id).map((question, index) => <article key={question.id} className="rounded-2xl border-2 border-slate-100 p-5">
        <p className="text-lg font-bold"><span className="mr-2 text-teal-600">Câu {index + 1}</span>{question.prompt}</p>{question.instruction && <p className="mt-1 text-slate-500">{question.instruction}</p>}
        {question.image_url && <Image unoptimized src={question.image_url} width={800} height={450} alt="Minh họa câu hỏi" className="mt-4 max-h-80 w-full rounded-xl object-contain" />}
        {typeof question.config.speakText === "string" && question.config.speakText && <ListenButton text={question.config.speakText} />}
        <AnswerInput question={question} value={answers[question.id] ?? {}} disabled={submitted} submissionId={submissionId} initialAudioUrl={initialAnswers.find((item) => item.question_id === question.id)?.audio_url ?? null} onChange={(value) => { setAnswers({ ...answers, [question.id]: value }); setSaved({ ...saved, [question.id]: question.config.responseMode === "AUDIO" }); }} />
        {!submitted && question.config.responseMode !== "AUDIO" && <button disabled={pending || !isCompleteAnswer(answers[question.id] ?? {})} className="mt-4 min-h-12 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white disabled:opacity-50" onClick={() => save(question.id)}>{saved[question.id] ? "✓ Đã lưu" : "Lưu câu trả lời"}</button>}
        {submitted && showResults && <Result answer={initialAnswers.find((item) => item.question_id === question.id)} />}
      </article>)}</div>
    </section>)}
    {message && <p className="rounded-xl bg-blue-50 p-4 font-semibold text-blue-800">{message}</p>}
    {!submitted ? <button disabled={pending} onClick={() => setSubmitDialog(true)} className="min-h-14 w-full rounded-2xl bg-amber-400 px-6 py-4 text-xl font-bold text-slate-900 shadow-md shadow-amber-200 disabled:opacity-50">Nộp bài ({completeCount}/{questions.length})</button> : <div className="rounded-2xl bg-emerald-50 p-5 text-center text-lg font-bold text-emerald-800">🎉 Em đã nộp bài thành công!</div>}
    {submitDialog && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmitDialog(false); }}><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="text-4xl">📮</div><h2 className="mt-3 text-2xl font-bold">Em muốn nộp bài?</h2><p className="mt-2 leading-7 text-slate-600">Sau khi nộp, em sẽ không sửa câu trả lời được nữa. Em đã hoàn thành {completeCount}/{questions.length} câu.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setSubmitDialog(false)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold">Kiểm tra lại</button><button onClick={submit} className="rounded-xl bg-teal-600 px-4 py-3 font-bold text-white">Nộp bài</button></div></div></div>}
  </div>;
}

function AnswerInput({ question, value, disabled, submissionId, initialAudioUrl, onChange }: { question: Question; value: Record<string, unknown>; disabled: boolean; submissionId: string; initialAudioUrl: string | null; onChange: (value: Record<string, unknown>) => void }) {
  if (question.type === "MULTIPLE_CHOICE") {
    const options = (question.config.options as { id: string; label: string }[] | undefined) ?? [];
    return <div className="mt-4 grid gap-3 sm:grid-cols-2">{options.map((option) => <button disabled={disabled} key={option.id} onClick={() => onChange({ optionId: option.id })} className={`min-h-14 rounded-xl border-2 p-3 text-left font-semibold ${value.optionId === option.id ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>{option.label}</button>)}</div>;
  }
  if (question.type === "TRUE_FALSE") return <div className="mt-4 grid grid-cols-2 gap-3">{[[true, "Đúng"], [false, "Sai"]].map(([option, label]) => <button disabled={disabled} key={String(option)} onClick={() => onChange({ value: option })} className={`min-h-14 rounded-xl border-2 font-bold ${value.value === option ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>{String(label)}</button>)}</div>;
  if (question.type === "TEXT_INPUT" && question.config.responseMode === "AUDIO") return <AudioAnswer submissionId={submissionId} questionId={question.id} disabled={disabled} initialAudioUrl={initialAudioUrl} hasSavedAudio={typeof value.audioPath === "string"} onUploaded={(path) => onChange({ audioPath: path })} />;
  if (question.type === "FILL_BLANK" || question.type === "TEXT_INPUT") return <textarea disabled={disabled} value={String(value.text ?? "")} onChange={(event) => onChange({ text: event.target.value })} className="mt-4 min-h-24 w-full rounded-xl border-2 border-slate-200 p-4 text-lg" placeholder="Em nhập câu trả lời ở đây" />;
  if (question.type === "MATCHING") return <MatchingInput question={question} value={value} disabled={disabled} onChange={onChange} />;
  return <OrderingInput question={question} value={value} disabled={disabled} onChange={onChange} />;
}

function isCompleteAnswer(answer: Record<string, unknown> | undefined) {
  if (!answer) return false;
  return Object.values(answer).some((value) => Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined);
}

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  return <button type="button" onClick={() => { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = 0.78; utterance.onend = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(utterance); }} className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl bg-cyan-50 px-5 py-3 text-lg font-bold text-cyan-800 ring-1 ring-cyan-200"><span className={speaking ? "animate-pulse" : ""}>🔊</span>{speaking ? "Đang phát…" : "Bấm để nghe"}</button>;
}

function AudioAnswer({ submissionId, questionId, disabled, initialAudioUrl, hasSavedAudio, onUploaded }: { submissionId: string; questionId: string; disabled: boolean; initialAudioUrl: string | null; hasSavedAudio: boolean; onUploaded: (path: string) => void }) {
  const recorder = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false); const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl); const [message, setMessage] = useState(hasSavedAudio ? "Đã lưu bản thu âm." : ""); const [pending, startTransition] = useTransition();
  const upload = (file: File) => startTransition(async () => { const formData = new FormData(); formData.set("file", file); const result = await uploadSpeakingAudioAction(submissionId, questionId, formData); setMessage(result.message); if (result.ok && result.path) { setAudioUrl(URL.createObjectURL(file)); onUploaded(result.path); } });
  const start = async () => { try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const mediaRecorder = new MediaRecorder(stream); recorder.current = mediaRecorder; chunks.current = []; mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); }; mediaRecorder.onstop = () => { const type = mediaRecorder.mimeType || "audio/webm"; const blob = new Blob(chunks.current, { type }); stream.getTracks().forEach((track) => track.stop()); upload(new File([blob], `speaking-${questionId}.webm`, { type })); }; mediaRecorder.start(); setRecording(true); setMessage(""); } catch { setMessage("Em hãy cho phép trình duyệt sử dụng micro nhé."); } };
  const stop = () => { recorder.current?.stop(); setRecording(false); };
  return <div className="mt-4 rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100"><div className="flex flex-wrap items-center gap-3">{!disabled && <button type="button" disabled={pending} onClick={recording ? stop : start} className={`min-h-12 rounded-xl px-5 py-3 font-bold text-white ${recording ? "animate-pulse bg-rose-500" : "bg-violet-600"}`}>{recording ? "■ Dừng và lưu" : pending ? "Đang tải bản thu…" : "● Bắt đầu thu âm"}</button>} {!disabled && <label className="cursor-pointer rounded-xl border border-violet-200 bg-white px-4 py-3 font-semibold text-violet-800">Chọn file audio<input disabled={pending} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} /></label>}</div>{audioUrl && <audio controls src={audioUrl} className="mt-4 w-full" />}{message && <p className={`mt-3 text-sm font-semibold ${hasSavedAudio || audioUrl ? "text-violet-800" : "text-rose-600"}`}>{message}</p>}</div>;
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
