begin;

-- Grade every Speaking answer independently on a 1-10 scale. The submission's
-- Speaking score is the average of its question scores, so the section remains
-- worth 10 points regardless of how many Speaking questions it contains.
create or replace function public.assess_student_answer(
  target_answer_id uuid,
  score_value numeric,
  feedback_value text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_submission uuid;
  speaking_average numeric;
  pending_speaking integer;
  total_value numeric;
  elapsed integer;
begin
  select sa.submission_id into target_submission
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  join public.submissions s on s.id = sa.submission_id
  where sa.id = target_answer_id
    and q.type = 'TEXT_INPUT'
    and t.skill = 'SPEAKING'
    and s.status = 'SUBMITTED'
    and public.teacher_owns_submission(sa.submission_id);

  if target_submission is null then raise exception 'Speaking answer is unavailable'; end if;
  if score_value < 1 or score_value > 10 then raise exception 'Speaking score must be between 1 and 10'; end if;
  if char_length(btrim(coalesce(feedback_value, ''))) = 0 then raise exception 'Speaking feedback is required'; end if;
  if char_length(feedback_value) > 2000 then raise exception 'Feedback is too long'; end if;

  update public.student_answers
  set teacher_score = score_value,
      teacher_feedback = btrim(feedback_value),
      updated_at = now()
  where id = target_answer_id;

  select round(avg(sa.teacher_score), 2), count(*) filter (where sa.teacher_score is null)
  into speaking_average, pending_speaking
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  where sa.submission_id = target_submission
    and q.type = 'TEXT_INPUT'
    and t.skill = 'SPEAKING';

  select coalesce(s.auto_score, 0) + coalesce(speaking_average, 0), coalesce(s.duration_seconds, 0)
  into total_value, elapsed
  from public.submissions s
  where s.id = target_submission;

  update public.submissions
  set teacher_score = speaking_average,
      teacher_feedback = null,
      assessed_at = case when pending_speaking = 0 then now() else null end,
      assessed_by = case when pending_speaking = 0 then (select auth.uid()) else null end,
      best_score = case
        when pending_speaking = 0 and (best_score is null or total_value > best_score) then total_value
        else best_score
      end,
      best_duration_seconds = case
        when pending_speaking = 0 and (best_score is null or total_value > best_score) then elapsed
        when pending_speaking = 0 and total_value = best_score and (best_duration_seconds is null or elapsed < best_duration_seconds) then elapsed
        else best_duration_seconds
      end,
      updated_at = now()
  where id = target_submission;
end;
$$;

revoke all on function public.assess_student_answer(uuid, numeric, text) from public;
grant execute on function public.assess_student_answer(uuid, numeric, text) to authenticated;

commit;
