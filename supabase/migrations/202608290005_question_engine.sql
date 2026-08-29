begin;

create type public.question_type as enum (
  'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK',
  'MATCHING', 'ORDERING', 'TEXT_INPUT'
);

alter table public.assignments
  add column show_results_after_submit boolean not null default false;

alter table public.tasks
  add column category text,
  add constraint tasks_category_length check (
    category is null or char_length(btrim(category)) between 1 and 60
  );

grant insert (show_results_after_submit) on public.assignments to authenticated;
grant update (show_results_after_submit) on public.assignments to authenticated;
grant insert (category) on public.tasks to authenticated;
grant update (category) on public.tasks to authenticated;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  type public.question_type not null,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 2000),
  instruction text,
  image_path text,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  points numeric(6,2) not null default 1 check (points > 0 and points <= 1000),
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, order_index),
  check (image_path is null or char_length(btrim(image_path)) between 1 and 500)
);

-- Deliberately separate from questions: students can read question.config but never this table.
create table public.question_answer_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.submissions
  alter column task_id drop not null,
  add column assignment_id uuid references public.assignments(id) on delete cascade,
  add column auto_score numeric(8,2),
  add column teacher_score numeric(8,2),
  add column teacher_feedback text,
  add column assessed_at timestamptz,
  add column assessed_by uuid references public.profiles(id) on delete restrict;

update public.submissions s
set assignment_id = t.assignment_id
from public.tasks t
where t.id = s.task_id and s.assignment_id is null;

alter table public.submissions alter column assignment_id set not null;
create unique index submissions_assignment_student_unique_idx
  on public.submissions(assignment_id, student_id);

create table public.student_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer jsonb not null default '{}'::jsonb check (jsonb_typeof(answer) = 'object'),
  auto_score numeric(8,2),
  is_correct boolean,
  teacher_score numeric(8,2),
  teacher_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, question_id),
  check (auto_score is null or auto_score >= 0),
  check (teacher_score is null or teacher_score >= 0)
);

create index questions_task_order_idx on public.questions(task_id, order_index);
create index student_answers_submission_idx on public.student_answers(submission_id);
create index submissions_assignment_status_idx on public.submissions(assignment_id, status);

create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();
create trigger question_answer_keys_set_updated_at before update on public.question_answer_keys
for each row execute function public.set_updated_at();
create trigger student_answers_set_updated_at before update on public.student_answers
for each row execute function public.set_updated_at();

drop trigger if exists submissions_validate on public.submissions;

create or replace function public.teacher_owns_submission(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.classrooms c on c.id = a.classroom_id
    where s.id = target_id and c.teacher_id = (select auth.uid())
  );
$$;

create function public.teacher_owns_question(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.questions q
    join public.tasks t on t.id = q.task_id
    where q.id = target_id and public.teacher_owns_assignment(t.assignment_id)
  );
$$;

create function public.student_can_read_question(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.questions q
    join public.tasks t on t.id = q.task_id
    where q.id = target_id and public.student_can_read_assignment(t.assignment_id)
  );
$$;

create function public.student_owns_submission(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.submissions s
    where s.id = target_id and s.student_id = (select auth.uid())
  );
$$;

create function public.start_assignment_submission(target_assignment_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result_id uuid;
begin
  if not exists (
    select 1 from public.assignments a
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where a.id = target_assignment_id and a.status = 'PUBLISHED'
      and cm.student_id = (select auth.uid())
  ) then raise exception 'Assignment is unavailable'; end if;

  insert into public.submissions(assignment_id, student_id, status)
  values (target_assignment_id, (select auth.uid()), 'DRAFT')
  on conflict (assignment_id, student_id) do update set updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;

create function public.save_student_answer(
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
      and s.status = 'DRAFT' and a.status = 'PUBLISHED' and q.id = target_question_id
  ) then raise exception 'Answer cannot be saved'; end if;

  insert into public.student_answers(submission_id, question_id, answer)
  values (target_submission_id, target_question_id, answer_value)
  on conflict (submission_id, question_id) do update
    set answer = excluded.answer, auto_score = null, is_correct = null,
        teacher_score = null, teacher_feedback = null, updated_at = now();
end;
$$;

create function public.submit_assignment(target_submission_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item record; normalized text; accepted jsonb; correct boolean;
begin
  if not exists (
    select 1 from public.submissions s join public.assignments a on a.id = s.assignment_id
    where s.id = target_submission_id and s.student_id = (select auth.uid())
      and s.status = 'DRAFT' and a.status = 'PUBLISHED'
  ) then raise exception 'Submission cannot be submitted'; end if;

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
      if coalesce((item.answer_key->>'caseSensitive')::boolean, false) = false then
        normalized := lower(normalized);
      end if;
      accepted := coalesce(item.answer_key->'accepted', '[]'::jsonb);
      select exists (
        select 1 from jsonb_array_elements_text(accepted) value
        where normalized = case
          when coalesce((item.answer_key->>'caseSensitive')::boolean, false) then btrim(value)
          else lower(btrim(value)) end
      ) into correct;
    end if;

    update public.student_answers set
      is_correct = correct,
      auto_score = case when correct is null then null when correct then item.points else 0 end
    where id = item.id;
  end loop;

  update public.submissions set status = 'SUBMITTED', submitted_at = now(),
    auto_score = (select coalesce(sum(auto_score), 0) from public.student_answers
                  where submission_id = target_submission_id)
  where id = target_submission_id;
end;
$$;

revoke all on function public.teacher_owns_question(uuid) from public;
revoke all on function public.student_can_read_question(uuid) from public;
revoke all on function public.student_owns_submission(uuid) from public;
revoke all on function public.start_assignment_submission(uuid) from public;
revoke all on function public.save_student_answer(uuid, uuid, jsonb) from public;
revoke all on function public.submit_assignment(uuid) from public;
grant execute on function public.teacher_owns_question(uuid) to authenticated;
grant execute on function public.student_can_read_question(uuid) to authenticated;
grant execute on function public.student_owns_submission(uuid) to authenticated;
grant execute on function public.start_assignment_submission(uuid) to authenticated;
grant execute on function public.save_student_answer(uuid, uuid, jsonb) to authenticated;
grant execute on function public.submit_assignment(uuid) to authenticated;

alter table public.questions enable row level security;
alter table public.question_answer_keys enable row level security;
alter table public.student_answers enable row level security;

create policy questions_select_related on public.questions for select to authenticated
using (public.teacher_owns_question(id) or public.student_can_read_question(id));
create policy questions_insert_teacher on public.questions for insert to authenticated
with check (public.teacher_owns_question(id) or exists (
  select 1 from public.tasks t where t.id = task_id and public.teacher_owns_assignment(t.assignment_id)
));
create policy questions_update_teacher on public.questions for update to authenticated
using (public.teacher_owns_question(id)) with check (public.teacher_owns_question(id));
create policy questions_delete_teacher on public.questions for delete to authenticated
using (public.teacher_owns_question(id));

create policy answer_keys_teacher_all on public.question_answer_keys for all to authenticated
using (public.teacher_owns_question(question_id)) with check (public.teacher_owns_question(question_id));

create policy student_answers_select_related on public.student_answers for select to authenticated
using (public.student_owns_submission(submission_id) or public.teacher_owns_submission(submission_id));
revoke all on table public.questions from anon, authenticated;
revoke all on table public.question_answer_keys from anon, authenticated;
revoke all on table public.student_answers from anon, authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.question_answer_keys to authenticated;
grant select on public.student_answers to authenticated;

-- Direct submission/answer mutation is intentionally removed; students use the RPCs above.
revoke insert, update on public.submissions from authenticated;
revoke insert (task_id, student_id, answer_text, answer_file_path, answer_metadata, status) on public.submissions from authenticated;
revoke update (answer_text, answer_file_path, answer_metadata, status) on public.submissions from authenticated;

create function public.assess_student_answer(
  target_answer_id uuid, score_value numeric, feedback_value text
) returns void language plpgsql security definer set search_path = '' as $$
declare max_points numeric;
begin
  select q.points into max_points
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  where sa.id = target_answer_id and public.teacher_owns_submission(sa.submission_id);
  if max_points is null then raise exception 'Answer is unavailable'; end if;
  if score_value < 0 or score_value > max_points then raise exception 'Score is outside question range'; end if;
  update public.student_answers set teacher_score = score_value,
    teacher_feedback = nullif(btrim(feedback_value), ''), updated_at = now()
  where id = target_answer_id;
end;
$$;
revoke all on function public.assess_student_answer(uuid, numeric, text) from public;
grant execute on function public.assess_student_answer(uuid, numeric, text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('question-media', 'question-media', false, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create policy question_media_teacher_insert on storage.objects for insert to authenticated
with check (bucket_id = 'question-media' and public.is_classroom_teacher(((storage.foldername(name))[1])::uuid));
create policy question_media_related_select on storage.objects for select to authenticated
using (bucket_id = 'question-media' and (
  public.is_classroom_teacher(((storage.foldername(name))[1])::uuid)
  or public.is_classroom_member(((storage.foldername(name))[1])::uuid)
));
create policy question_media_teacher_delete on storage.objects for delete to authenticated
using (bucket_id = 'question-media' and public.is_classroom_teacher(((storage.foldername(name))[1])::uuid));

commit;
