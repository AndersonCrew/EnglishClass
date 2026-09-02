begin;

create or replace function public.open_assignment_until(
  target_assignment_id uuid,
  close_time timestamptz
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare skill_count integer;
begin
  if not public.teacher_owns_assignment(target_assignment_id) then
    raise exception 'Assignment is unavailable';
  end if;
  if close_time is null or close_time < now() + interval '24 hours' then
    raise exception 'Closing time must be at least 24 hours from now';
  end if;
  select count(distinct t.skill) into skill_count
  from public.tasks t
  where t.assignment_id = target_assignment_id
    and exists (select 1 from public.questions q where q.task_id = t.id);
  if skill_count <> 4 then
    raise exception 'Assignment must contain all four skills';
  end if;
  update public.assignments
  set status = 'PUBLISHED',
      closes_at = close_time,
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = target_assignment_id;
end;
$$;

revoke all on function public.open_assignment_until(uuid, timestamptz) from public;
grant execute on function public.open_assignment_until(uuid, timestamptz) to authenticated;

create or replace function public.assess_student_answer(
  target_answer_id uuid,
  score_value numeric,
  feedback_value text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare max_points numeric; target_submission uuid; manual_total numeric; pending_manual integer;
begin
  select q.points, sa.submission_id into max_points, target_submission
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  join public.submissions s on s.id = sa.submission_id
  where sa.id = target_answer_id
    and q.type = 'TEXT_INPUT'
    and t.skill = 'SPEAKING'
    and s.status = 'SUBMITTED'
    and public.teacher_owns_submission(sa.submission_id);

  if max_points is null then raise exception 'Speaking answer is unavailable'; end if;
  if score_value < 0 or score_value > least(max_points, 10) then
    raise exception 'Score must be between 0 and 10 and cannot exceed question points';
  end if;

  update public.student_answers
  set teacher_score = score_value,
      teacher_feedback = nullif(btrim(feedback_value), ''),
      updated_at = now()
  where id = target_answer_id;

  select coalesce(sum(sa.teacher_score), 0), count(*) filter (where sa.teacher_score is null)
  into manual_total, pending_manual
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  where sa.submission_id = target_submission
    and q.type = 'TEXT_INPUT'
    and t.skill = 'SPEAKING';

  update public.submissions
  set teacher_score = manual_total,
      teacher_feedback = nullif(btrim(feedback_value), ''),
      assessed_at = case when pending_manual = 0 then now() else null end,
      assessed_by = case when pending_manual = 0 then (select auth.uid()) else null end,
      updated_at = now()
  where id = target_submission;
end;
$$;

revoke all on function public.assess_student_answer(uuid, numeric, text) from public;
grant execute on function public.assess_student_answer(uuid, numeric, text) to authenticated;

commit;
