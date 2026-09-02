begin;

alter table public.assignments
  add column level smallint not null default 1 check (level between 1 and 4),
  add column sequence_index integer check (sequence_index is null or sequence_index > 0),
  add column curriculum_code text,
  add column published_at timestamptz;

create unique index assignments_classroom_sequence_unique_idx
  on public.assignments(classroom_id, sequence_index)
  where sequence_index is not null;
create unique index assignments_classroom_curriculum_unique_idx
  on public.assignments(classroom_id, curriculum_code)
  where curriculum_code is not null;

grant insert (level, sequence_index, curriculum_code, published_at) on public.assignments to authenticated;
grant update (level, sequence_index, curriculum_code, published_at) on public.assignments to authenticated;

-- Only active students in a non-expired class can see an open assignment.
create or replace function public.student_can_read_assignment(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where a.id = target_id and a.status = 'PUBLISHED'
      and cm.student_id = (select auth.uid()) and cm.status = 'ACTIVE'
      and (c.ends_at is null or c.ends_at >= current_date)
  );
$$;

create or replace function public.validate_assignment_publication() returns trigger
language plpgsql set search_path = '' as $$
declare skill_count integer;
begin
  if new.status = 'PUBLISHED' and old.status is distinct from 'PUBLISHED' then
    select count(distinct t.skill) into skill_count from public.tasks t
    where t.assignment_id = new.id and exists (select 1 from public.questions q where q.task_id = t.id);
    if skill_count <> 4 then raise exception 'Assignment must contain all four skills'; end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;
create trigger assignments_validate_publication before update of status on public.assignments
for each row execute function public.validate_assignment_publication();
revoke all on function public.validate_assignment_publication() from public;

create or replace function public.set_assignment_publication(
  target_assignment_id uuid,
  target_status public.assignment_status
) returns void
language plpgsql security definer set search_path = '' as $$
declare skill_count integer;
begin
  if target_status not in ('PUBLISHED', 'CLOSED') then
    raise exception 'Unsupported assignment status';
  end if;
  if not public.teacher_owns_assignment(target_assignment_id) then
    raise exception 'Assignment is unavailable';
  end if;

  if target_status = 'PUBLISHED' then
    select count(distinct t.skill) into skill_count
    from public.tasks t
    where t.assignment_id = target_assignment_id
      and exists (select 1 from public.questions q where q.task_id = t.id);
    if skill_count <> 4 then
      raise exception 'Assignment must contain Listening, Speaking, Reading and Writing';
    end if;
  end if;

  update public.assignments
  set status = target_status,
      published_at = case when target_status = 'PUBLISHED' then coalesce(published_at, now()) else published_at end,
      updated_at = now()
  where id = target_assignment_id;
end;
$$;
revoke all on function public.set_assignment_publication(uuid, public.assignment_status) from public;
grant execute on function public.set_assignment_publication(uuid, public.assignment_status) to authenticated;

create or replace function public.student_can_upload_speaking_audio(
  target_submission_id uuid,
  target_question_id uuid
) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.tasks t on t.assignment_id = a.id and t.skill = 'SPEAKING'
    join public.questions q on q.task_id = t.id and q.type = 'TEXT_INPUT' and q.config->>'responseMode' = 'AUDIO'
    where s.id = target_submission_id
      and q.id = target_question_id
      and s.student_id = (select auth.uid())
      and s.status = 'DRAFT'
      and a.status = 'PUBLISHED'
      and public.student_can_read_assignment(a.id)
  );
$$;
revoke all on function public.student_can_upload_speaking_audio(uuid, uuid) from public;
grant execute on function public.student_can_upload_speaking_audio(uuid, uuid) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-submissions', 'speaking-submissions', false, 15728640,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm'])
on conflict (id) do update set public = false, file_size_limit = 15728640,
  allowed_mime_types = array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm'];

create policy speaking_audio_student_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'speaking-submissions'
  and (storage.foldername(name))[4] = (select auth.uid())::text
  and public.student_can_upload_speaking_audio(
    ((storage.foldername(name))[2])::uuid,
    ((storage.foldername(name))[3])::uuid
  )
);
create policy speaking_audio_related_select on storage.objects for select to authenticated
using (
  bucket_id = 'speaking-submissions'
  and (
    public.is_classroom_teacher(((storage.foldername(name))[1])::uuid)
    or (storage.foldername(name))[4] = (select auth.uid())::text
  )
);
create policy speaking_audio_student_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'speaking-submissions'
  and (storage.foldername(name))[4] = (select auth.uid())::text
  and public.student_can_upload_speaking_audio(
    ((storage.foldername(name))[2])::uuid,
    ((storage.foldername(name))[3])::uuid
  )
);

create or replace function public.start_assignment_submission(target_assignment_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not public.student_can_read_assignment(target_assignment_id) then raise exception 'Assignment is unavailable'; end if;
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
    join public.assignments a on a.id = s.assignment_id
    join public.tasks t on t.assignment_id = a.id
    join public.questions q on q.task_id = t.id
    where s.id = target_submission_id and s.student_id = (select auth.uid())
      and s.status = 'DRAFT' and q.id = target_question_id
      and public.student_can_read_assignment(a.id)
  ) then raise exception 'Answer cannot be saved'; end if;
  insert into public.student_answers(submission_id, question_id, answer)
  values (target_submission_id, target_question_id, answer_value)
  on conflict (submission_id, question_id) do update
    set answer = excluded.answer, auto_score = null, is_correct = null,
        teacher_score = null, teacher_feedback = null, updated_at = now();
end;
$$;

-- Submission is complete only when every question has a non-empty saved answer.
create or replace function public.submit_assignment(target_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; normalized text; accepted jsonb; correct boolean;
declare expected_count integer; answered_count integer;
begin
  if not exists (
    select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
    where s.id = target_submission_id and s.student_id = (select auth.uid())
      and s.status = 'DRAFT' and public.student_can_read_assignment(a.id)
  ) then raise exception 'Submission cannot be submitted'; end if;

  select count(*) into expected_count
  from public.questions q join public.tasks t on t.id = q.task_id
  join public.submissions s on s.assignment_id = t.assignment_id
  where s.id = target_submission_id;

  select count(*) into answered_count
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  where sa.submission_id = target_submission_id
    and sa.answer <> '{}'::jsonb
    and (
      (q.config->>'responseMode' = 'AUDIO' and nullif(btrim(sa.answer->>'audioPath'), '') is not null)
      or
      (coalesce(q.config->>'responseMode', '') <> 'AUDIO' and
        coalesce(nullif(btrim(sa.answer->>'text'), ''),
                 nullif(btrim(sa.answer->>'optionId'), ''),
                 nullif(btrim(sa.answer->>'value'), ''),
                 nullif(btrim(sa.answer->>'pairs'), ''),
                 nullif(btrim(sa.answer->>'itemIds'), '')) is not null)
    );

  if expected_count = 0 or answered_count <> expected_count then
    raise exception 'Please answer every question before submitting';
  end if;

  for item in
    select sa.id, sa.answer, q.type, q.points, k.answer_key
    from public.student_answers sa
    join public.questions q on q.id = sa.question_id
    join public.question_answer_keys k on k.question_id = q.id
    where sa.submission_id = target_submission_id
  loop
    correct := null;
    if item.type in ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'ORDERING') then
      correct := item.answer = item.answer_key;
    elsif item.type = 'FILL_BLANK' then
      normalized := btrim(item.answer->>'text');
      if coalesce((item.answer_key->>'caseSensitive')::boolean, false) = false then normalized := lower(normalized); end if;
      accepted := coalesce(item.answer_key->'accepted', '[]'::jsonb);
      select exists (
        select 1 from jsonb_array_elements_text(accepted) value
        where normalized = case when coalesce((item.answer_key->>'caseSensitive')::boolean, false)
          then btrim(value) else lower(btrim(value)) end
      ) into correct;
    end if;
    update public.student_answers set is_correct = correct,
      auto_score = case when correct is null then null when correct then item.points else 0 end
    where id = item.id;
  end loop;

  update public.submissions set status = 'SUBMITTED', submitted_at = now(),
    auto_score = (select coalesce(sum(auto_score), 0) from public.student_answers where submission_id = target_submission_id)
  where id = target_submission_id;
end;
$$;

create or replace function public.assess_student_answer(
  target_answer_id uuid, score_value numeric, feedback_value text
) returns void language plpgsql security definer set search_path = '' as $$
declare max_points numeric; target_submission uuid; manual_total numeric; pending_manual integer;
begin
  select q.points, sa.submission_id into max_points, target_submission
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  join public.submissions s on s.id = sa.submission_id
  where sa.id = target_answer_id
    and q.type = 'TEXT_INPUT' and t.skill = 'SPEAKING'
    and s.status = 'SUBMITTED'
    and public.teacher_owns_submission(sa.submission_id);
  if max_points is null then raise exception 'Speaking answer is unavailable'; end if;
  if score_value < 0 or score_value > max_points then raise exception 'Score is outside question range'; end if;

  update public.student_answers set teacher_score = score_value,
    teacher_feedback = nullif(btrim(feedback_value), ''), updated_at = now()
  where id = target_answer_id;

  select coalesce(sum(sa.teacher_score), 0), count(*) filter (where sa.teacher_score is null)
    into manual_total, pending_manual
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  where sa.submission_id = target_submission and q.type = 'TEXT_INPUT' and t.skill = 'SPEAKING';

  update public.submissions set teacher_score = manual_total,
    teacher_feedback = nullif(btrim(feedback_value), ''),
    assessed_at = case when pending_manual = 0 then now() else null end,
    assessed_by = case when pending_manual = 0 then (select auth.uid()) else null end,
    updated_at = now()
  where id = target_submission;
end;
$$;

commit;
