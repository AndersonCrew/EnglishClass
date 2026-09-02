begin;

alter table public.assignments
  add column cover_image_path text,
  add column closes_at timestamptz,
  add constraint assignments_cover_path_length check (
    cover_image_path is null or char_length(btrim(cover_image_path)) between 1 and 500
  );

create or replace function public.set_curriculum_assignment_cover() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.cover_image_path is null and new.curriculum_code ~ '^G3-[0-9]{2}$' then
    new.cover_image_path := '/images/grade3/lesson-' || right(new.curriculum_code, 2) || '.webp';
  end if;
  return new;
end;
$$;
create trigger assignments_set_curriculum_cover before insert or update of curriculum_code on public.assignments
for each row execute function public.set_curriculum_assignment_cover();
revoke all on function public.set_curriculum_assignment_cover() from public;

update public.assignments
set cover_image_path = '/images/grade3/lesson-' || right(curriculum_code, 2) || '.webp'
where curriculum_code ~ '^G3-[0-9]{2}$' and cover_image_path is null;

update public.questions q
set image_path = a.cover_image_path, updated_at = now()
from public.tasks t join public.assignments a on a.id = t.assignment_id
where q.task_id = t.id and a.curriculum_code ~ '^G3-[0-9]{2}$'
  and t.skill in ('READING', 'WRITING', 'SPEAKING') and q.image_path is null;

create or replace function public.student_can_work_assignment(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where a.id = target_id and a.status = 'PUBLISHED'
      and a.closes_at > now()
      and cm.student_id = (select auth.uid()) and cm.status = 'ACTIVE'
      and (c.ends_at is null or c.ends_at >= current_date)
  );
$$;
revoke all on function public.student_can_work_assignment(uuid) from public;
grant execute on function public.student_can_work_assignment(uuid) to authenticated;

create or replace function public.student_can_read_assignment(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.student_can_work_assignment(target_id)
    or exists (
      select 1 from public.submissions s
      where s.assignment_id = target_id and s.student_id = (select auth.uid()) and s.status = 'SUBMITTED'
    );
$$;

drop policy if exists assignments_select_related on public.assignments;
create policy assignments_select_related on public.assignments for select to authenticated using (
  public.is_classroom_teacher(classroom_id) or public.student_can_read_assignment(id)
);

create or replace function public.open_assignment_until(
  target_assignment_id uuid,
  close_time timestamptz
) returns void
language plpgsql security definer set search_path = '' as $$
declare skill_count integer;
begin
  if not public.teacher_owns_assignment(target_assignment_id) then raise exception 'Assignment is unavailable'; end if;
  if close_time is null or close_time <= now() + interval '5 minutes' then
    raise exception 'Closing time must be at least five minutes from now';
  end if;
  select count(distinct t.skill) into skill_count from public.tasks t
  where t.assignment_id = target_assignment_id
    and exists (select 1 from public.questions q where q.task_id = t.id);
  if skill_count <> 4 then raise exception 'Assignment must contain all four skills'; end if;
  update public.assignments set status = 'PUBLISHED', closes_at = close_time,
    published_at = coalesce(published_at, now()), updated_at = now()
  where id = target_assignment_id;
end;
$$;
revoke all on function public.open_assignment_until(uuid, timestamptz) from public;
grant execute on function public.open_assignment_until(uuid, timestamptz) to authenticated;

-- Opening/closing is only possible through the validated RPC above.
revoke execute on function public.set_assignment_publication(uuid, public.assignment_status) from authenticated;
revoke update (status, published_at, closes_at) on public.assignments from authenticated;
grant select on public.assignments to authenticated;

create or replace function public.start_assignment_submission(target_assignment_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not public.student_can_work_assignment(target_assignment_id) then raise exception 'Assignment is unavailable'; end if;
  insert into public.submissions(assignment_id, student_id, status)
  values (target_assignment_id, (select auth.uid()), 'DRAFT')
  on conflict (assignment_id, student_id) do update set updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.save_student_answer(
  target_submission_id uuid, target_question_id uuid, answer_value jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(answer_value) <> 'object' then raise exception 'Invalid answer'; end if;
  if not exists (
    select 1 from public.submissions s
    join public.tasks t on t.assignment_id = s.assignment_id
    join public.questions q on q.task_id = t.id
    where s.id = target_submission_id and s.student_id = (select auth.uid())
      and s.status = 'DRAFT' and q.id = target_question_id
      and public.student_can_work_assignment(s.assignment_id)
  ) then raise exception 'Answer cannot be saved'; end if;
  insert into public.student_answers(submission_id, question_id, answer)
  values (target_submission_id, target_question_id, answer_value)
  on conflict (submission_id, question_id) do update
    set answer = excluded.answer, auto_score = null, is_correct = null,
        teacher_score = null, teacher_feedback = null, updated_at = now();
end;
$$;

create or replace function public.student_can_upload_speaking_audio(
  target_submission_id uuid, target_question_id uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submissions s
    join public.tasks t on t.assignment_id = s.assignment_id and t.skill = 'SPEAKING'
    join public.questions q on q.task_id = t.id and q.type = 'TEXT_INPUT' and q.config->>'responseMode' = 'AUDIO'
    where s.id = target_submission_id and q.id = target_question_id
      and s.student_id = (select auth.uid()) and s.status = 'DRAFT'
      and public.student_can_work_assignment(s.assignment_id)
  );
$$;

commit;
