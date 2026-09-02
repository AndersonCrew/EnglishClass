begin;

-- The legacy task-level model required answer_text/file/metadata before SUBMITTED.
-- Question Engine stores answers in student_answers, so that check rejects valid submissions.
alter table public.submissions drop constraint if exists submissions_check;

commit;
