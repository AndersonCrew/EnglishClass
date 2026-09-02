begin;

alter table public.submissions
  add column attempt_count smallint not null default 1 check (attempt_count between 1 and 3),
  add column started_at timestamptz not null default now(),
  add column duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column best_score numeric(8,2) check (best_score is null or best_score >= 0),
  add column best_duration_seconds integer check (best_duration_seconds is null or best_duration_seconds >= 0);

update public.submissions
set started_at = created_at,
    duration_seconds = case when submitted_at is null then null else greatest(0, extract(epoch from submitted_at - created_at)::integer) end,
    best_score = case when assessed_at is null then null else coalesce(auto_score, 0) + coalesce(teacher_score, 0) end,
    best_duration_seconds = case when assessed_at is null or submitted_at is null then null else greatest(0, extract(epoch from submitted_at - created_at)::integer) end;

create or replace function public.track_submission_timing() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'SUBMITTED' and old.status = 'DRAFT' then
    new.duration_seconds := greatest(0, extract(epoch from now() - old.started_at)::integer);
  end if;
  return new;
end;
$$;
create trigger submissions_track_timing before update of status on public.submissions
for each row execute function public.track_submission_timing();
revoke all on function public.track_submission_timing() from public;

create or replace function public.retry_assignment(target_submission_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.submissions s
    where s.id = target_submission_id
      and s.student_id = (select auth.uid())
      and s.status = 'SUBMITTED'
      and s.attempt_count < 3
      and public.student_can_work_assignment(s.assignment_id)
  ) then raise exception 'Assignment cannot be retried'; end if;

  delete from public.student_answers where submission_id = target_submission_id;
  update public.submissions
  set status = 'DRAFT', attempt_count = attempt_count + 1, started_at = now(),
      submitted_at = null, duration_seconds = null, auto_score = null,
      teacher_score = null, teacher_feedback = null, assessed_at = null,
      assessed_by = null, updated_at = now()
  where id = target_submission_id;
end;
$$;
revoke all on function public.retry_assignment(uuid) from public;
grant execute on function public.retry_assignment(uuid) to authenticated;

create or replace function public.assess_speaking_submission(
  target_submission_id uuid, score_value numeric, feedback_value text
) returns void
language plpgsql security definer set search_path = '' as $$
declare total_value numeric; elapsed integer;
begin
  if score_value < 1 or score_value > 10 then raise exception 'Speaking score must be between 1 and 10'; end if;
  if char_length(coalesce(feedback_value, '')) > 2000 then raise exception 'Feedback is too long'; end if;
  if not exists (
    select 1 from public.submissions s
    where s.id = target_submission_id and s.status = 'SUBMITTED'
      and public.teacher_owns_submission(s.id)
  ) then raise exception 'Submission is unavailable'; end if;
  if not exists (
    select 1 from public.student_answers sa
    join public.questions q on q.id = sa.question_id
    join public.tasks t on t.id = q.task_id
    where sa.submission_id = target_submission_id and t.skill = 'SPEAKING'
  ) then raise exception 'Speaking answer is unavailable'; end if;

  update public.student_answers sa
  set teacher_feedback = nullif(btrim(feedback_value), ''), updated_at = now()
  from public.questions q, public.tasks t
  where sa.submission_id = target_submission_id and q.id = sa.question_id
    and t.id = q.task_id and t.skill = 'SPEAKING';

  select coalesce(s.auto_score, 0) + score_value, coalesce(s.duration_seconds, 0)
  into total_value, elapsed from public.submissions s where s.id = target_submission_id;

  update public.submissions
  set teacher_score = score_value, teacher_feedback = nullif(btrim(feedback_value), ''),
      assessed_at = now(), assessed_by = (select auth.uid()),
      best_score = case when best_score is null or total_value > best_score then total_value else best_score end,
      best_duration_seconds = case
        when best_score is null or total_value > best_score then elapsed
        when total_value = best_score and (best_duration_seconds is null or elapsed < best_duration_seconds) then elapsed
        else best_duration_seconds end,
      updated_at = now()
  where id = target_submission_id;
end;
$$;
revoke all on function public.assess_speaking_submission(uuid, numeric, text) from public;
grant execute on function public.assess_speaking_submission(uuid, numeric, text) to authenticated;

create or replace function public.get_class_leaderboard(target_classroom_id uuid)
returns table(rank bigint, student_id uuid, student_name text, completed bigint, total_score numeric, total_seconds bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_classroom_teacher(target_classroom_id) and not exists (
    select 1 from public.class_members cm where cm.classroom_id = target_classroom_id
      and cm.student_id = (select auth.uid()) and cm.status = 'ACTIVE'
  ) then raise exception 'Leaderboard is unavailable'; end if;
  return query
  with scores as (
    select cm.student_id, p.full_name,
      count(s.id) filter (where s.best_score is not null) as completed_count,
      coalesce(sum(s.best_score), 0) as score_sum,
      coalesce(sum(s.best_duration_seconds) filter (where s.best_score is not null), 0)::bigint as seconds_sum
    from public.class_members cm join public.profiles p on p.id = cm.student_id
    left join public.assignments a on a.classroom_id = cm.classroom_id
    left join public.submissions s on s.assignment_id = a.id and s.student_id = cm.student_id
    where cm.classroom_id = target_classroom_id and cm.status = 'ACTIVE'
    group by cm.student_id, p.full_name
  )
  select row_number() over (order by score_sum desc, seconds_sum asc, full_name),
    scores.student_id, scores.full_name, completed_count, score_sum, seconds_sum
  from scores order by score_sum desc, seconds_sum asc, full_name;
end;
$$;
revoke all on function public.get_class_leaderboard(uuid) from public;
grant execute on function public.get_class_leaderboard(uuid) to authenticated;

create or replace function public.get_grade_leaderboard(target_grade smallint)
returns table(rank bigint, student_id uuid, student_name text, completed bigint, total_score numeric, total_seconds bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if target_grade not between 1 and 5 then raise exception 'Invalid grade'; end if;
  if not exists (
    select 1 from public.classrooms c left join public.class_members cm on cm.classroom_id = c.id
    where c.grade_level = target_grade and (
      c.teacher_id = (select auth.uid()) or (cm.student_id = (select auth.uid()) and cm.status = 'ACTIVE')
    )
  ) then raise exception 'Leaderboard is unavailable'; end if;
  return query
  with scores as (
    select p.id, p.full_name, count(s.id) filter (where s.best_score is not null) as completed_count,
      coalesce(sum(s.best_score), 0) as score_sum,
      coalesce(sum(s.best_duration_seconds) filter (where s.best_score is not null), 0)::bigint as seconds_sum
    from public.profiles p
    join public.class_members cm on cm.student_id = p.id and cm.status = 'ACTIVE'
    join public.classrooms c on c.id = cm.classroom_id and c.grade_level = target_grade
    left join public.assignments a on a.classroom_id = c.id
    left join public.submissions s on s.assignment_id = a.id and s.student_id = p.id
    group by p.id, p.full_name
  )
  select row_number() over (order by score_sum desc, seconds_sum asc, full_name),
    scores.id, scores.full_name, completed_count, score_sum, seconds_sum
  from scores order by score_sum desc, seconds_sum asc, full_name limit 50;
end;
$$;
revoke all on function public.get_grade_leaderboard(smallint) from public;
grant execute on function public.get_grade_leaderboard(smallint) to authenticated;

commit;
