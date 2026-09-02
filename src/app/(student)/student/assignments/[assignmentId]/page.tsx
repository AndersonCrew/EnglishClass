import { notFound } from "next/navigation";
import { StudentAssignmentRunner } from "@/features/assignment/components/student-assignment-runner";
import { getStudentAssignment } from "@/features/assignment/server/queries";

export default async function StudentAssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) { const { assignmentId } = await params; const data = await getStudentAssignment(assignmentId); if (!data || !data.submission.id) notFound(); const submitted = data.submission.status === "SUBMITTED"; return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8"><StudentAssignmentRunner assignmentId={assignmentId} title={data.assignment.title} tasks={data.tasks} questions={data.questions} submissionId={data.submission.id} initialAnswers={data.answers} submitted={submitted} showResults={submitted} startedAt={data.submission.started_at} attemptCount={data.submission.attempt_count} /></main>; }
