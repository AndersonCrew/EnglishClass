begin;

create type public.user_role as enum ('TEACHER', 'STUDENT');
create type public.skill_type as enum ('LISTENING', 'SPEAKING', 'READING', 'WRITING');
create type public.assignment_status as enum ('DRAFT', 'PUBLISHED', 'CLOSED');
create type public.submission_status as enum ('DRAFT', 'SUBMITTED');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  grade_level smallint not null check (grade_level between 1 and 5),
  academic_year text not null check (char_length(btrim(academic_year)) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.class_members (
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (classroom_id, student_id)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  due_at timestamptz,
  status public.assignment_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  skill public.skill_type not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  instruction text,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, order_index)
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answer_text text,
  answer_file_path text,
  answer_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(answer_metadata) = 'object'),
  status public.submission_status not null default 'DRAFT',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, student_id),
  check (answer_file_path is null or char_length(btrim(answer_file_path)) between 1 and 500),
  check (status = 'DRAFT' or nullif(btrim(answer_text), '') is not null
    or nullif(btrim(answer_file_path), '') is not null or answer_metadata <> '{}'::jsonb)
);
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  feedback text,
  assessed_at timestamptz not null default now(),
  assessed_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classrooms_teacher_id_idx on public.classrooms (teacher_id);
create index class_members_student_id_idx on public.class_members (student_id);
create index assignments_classroom_status_due_idx on public.assignments (classroom_id, status, due_at);
create index submissions_student_status_idx on public.submissions (student_id, status);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger classrooms_set_updated_at before update on public.classrooms for each row execute function public.set_updated_at();
create trigger assignments_set_updated_at before update on public.assignments for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger submissions_set_updated_at before update on public.submissions for each row execute function public.set_updated_at();
create trigger assessments_set_updated_at before update on public.assessments for each row execute function public.set_updated_at();

-- SECURITY DEFINER avoids recursive RLS joins. The actor is always auth.uid().
create function public.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'TEACHER');
$$;
create function public.is_classroom_teacher(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.classrooms c join public.profiles p on p.id = c.teacher_id
    where c.id = target_id and c.teacher_id = (select auth.uid()) and p.role = 'TEACHER');
$$;
create function public.is_classroom_member(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members cm join public.profiles p on p.id = cm.student_id
    where cm.classroom_id = target_id and cm.student_id = (select auth.uid()) and p.role = 'STUDENT');
$$;
create function public.teacher_manages_student(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members cm join public.classrooms c on c.id = cm.classroom_id
    where cm.student_id = target_id and c.teacher_id = (select auth.uid()));
$$;
create function public.teacher_owns_assignment(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assignments a join public.classrooms c on c.id = a.classroom_id
    where a.id = target_id and c.teacher_id = (select auth.uid()));
$$;
create function public.student_can_read_assignment(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.assignments a join public.class_members cm on cm.classroom_id = a.classroom_id
    where a.id = target_id and a.status in ('PUBLISHED', 'CLOSED') and cm.student_id = (select auth.uid()));
$$;
create function public.student_can_submit_task(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tasks t join public.assignments a on a.id = t.assignment_id
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where t.id = target_id and a.status = 'PUBLISHED' and cm.student_id = (select auth.uid()));
$$;
create function public.teacher_owns_submission(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.submissions s join public.tasks t on t.id = s.task_id
    join public.assignments a on a.id = t.assignment_id join public.classrooms c on c.id = a.classroom_id
    where s.id = target_id and c.teacher_id = (select auth.uid()));
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.is_teacher() from public;
revoke all on function public.is_classroom_teacher(uuid) from public;
revoke all on function public.is_classroom_member(uuid) from public;
revoke all on function public.teacher_manages_student(uuid) from public;
revoke all on function public.teacher_owns_assignment(uuid) from public;
revoke all on function public.student_can_read_assignment(uuid) from public;
revoke all on function public.student_can_submit_task(uuid) from public;
revoke all on function public.teacher_owns_submission(uuid) from public;
grant execute on function public.is_teacher() to authenticated;
grant execute on function public.is_classroom_teacher(uuid) to authenticated;
grant execute on function public.is_classroom_member(uuid) to authenticated;
grant execute on function public.teacher_manages_student(uuid) to authenticated;
grant execute on function public.teacher_owns_assignment(uuid) to authenticated;
grant execute on function public.student_can_read_assignment(uuid) to authenticated;
grant execute on function public.student_can_submit_task(uuid) to authenticated;
grant execute on function public.teacher_owns_submission(uuid) to authenticated;

create function public.protect_profile_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id <> old.id or new.role <> old.role then raise exception 'Profile id and role are immutable'; end if;
  return new;
end;
$$;
create trigger profiles_protect_fields before update on public.profiles for each row execute function public.protect_profile_fields();

create function public.validate_classroom_teacher() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.teacher_id and role = 'TEACHER') then
    raise exception 'Classroom owner must have TEACHER role';
  end if;
  return new;
end;
$$;
create trigger classrooms_validate_teacher before insert or update of teacher_id on public.classrooms
for each row execute function public.validate_classroom_teacher();

create function public.validate_class_member() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.student_id and role = 'STUDENT') then
    raise exception 'Class member must have STUDENT role';
  end if;
  return new;
end;
$$;
create trigger class_members_validate_student before insert or update of student_id on public.class_members
for each row execute function public.validate_class_member();

create function public.validate_submission() returns trigger
language plpgsql set search_path = '' as $$
declare actor_id uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and (new.task_id <> old.task_id or new.student_id <> old.student_id) then
    raise exception 'Submission task and student are immutable';
  end if;
  if actor_id is not null then new.student_id := actor_id; end if;
  if not exists (
    select 1 from public.tasks t join public.assignments a on a.id = t.assignment_id
    join public.class_members cm on cm.classroom_id = a.classroom_id
    join public.profiles p on p.id = cm.student_id and p.role = 'STUDENT'
    where t.id = new.task_id and cm.student_id = new.student_id
  ) then raise exception 'Student is not a member of the task classroom'; end if;
  if new.status = 'SUBMITTED' then
    if tg_op = 'INSERT' or old.status <> 'SUBMITTED' then new.submitted_at := now();
    else new.submitted_at := old.submitted_at; end if;
  else new.submitted_at := null; end if;
  return new;
end;
$$;
create trigger submissions_validate before insert or update on public.submissions
for each row execute function public.validate_submission();

create function public.validate_assessment() returns trigger
language plpgsql set search_path = '' as $$
declare actor_id uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and new.submission_id <> old.submission_id then
    raise exception 'Assessment submission is immutable';
  end if;
  if actor_id is not null then new.assessed_by := actor_id; end if;
  if not exists (
    select 1 from public.submissions s join public.tasks t on t.id = s.task_id
    join public.assignments a on a.id = t.assignment_id join public.classrooms c on c.id = a.classroom_id
    join public.profiles p on p.id = new.assessed_by and p.role = 'TEACHER'
    where s.id = new.submission_id and c.teacher_id = new.assessed_by
  ) then raise exception 'Assessor must own the submission classroom'; end if;
  new.assessed_at := now(); return new;
end;
$$;
create trigger assessments_validate before insert or update on public.assessments
for each row execute function public.validate_assessment();

revoke all on function public.protect_profile_fields() from public;
revoke all on function public.validate_classroom_teacher() from public;
revoke all on function public.validate_class_member() from public;
revoke all on function public.validate_submission() from public;
revoke all on function public.validate_assessment() from public;

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.assessments enable row level security;

create policy profiles_select_related on public.profiles for select to authenticated using (
  id = (select auth.uid()) or public.teacher_manages_student(id)
  or (role = 'TEACHER' and exists (select 1 from public.classrooms c
    where c.teacher_id = profiles.id and public.is_classroom_member(c.id)))
);
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy classrooms_select_related on public.classrooms for select to authenticated
using (teacher_id = (select auth.uid()) or public.is_classroom_member(id));
create policy classrooms_insert_teacher on public.classrooms for insert to authenticated
with check (teacher_id = (select auth.uid()) and public.is_teacher());
create policy classrooms_update_teacher on public.classrooms for update to authenticated
using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy classrooms_delete_teacher on public.classrooms for delete to authenticated
using (teacher_id = (select auth.uid()));

create policy class_members_select_related on public.class_members for select to authenticated
using (student_id = (select auth.uid()) or public.is_classroom_teacher(classroom_id));
create policy class_members_delete_teacher on public.class_members for delete to authenticated
using (public.is_classroom_teacher(classroom_id));

create policy assignments_select_related on public.assignments for select to authenticated using (
  public.is_classroom_teacher(classroom_id)
  or (status in ('PUBLISHED', 'CLOSED') and public.is_classroom_member(classroom_id))
);
create policy assignments_insert_teacher on public.assignments for insert to authenticated
with check (public.is_classroom_teacher(classroom_id));
create policy assignments_update_teacher on public.assignments for update to authenticated
using (public.is_classroom_teacher(classroom_id)) with check (public.is_classroom_teacher(classroom_id));
create policy assignments_delete_teacher on public.assignments for delete to authenticated
using (public.is_classroom_teacher(classroom_id));

create policy tasks_select_related on public.tasks for select to authenticated
using (public.teacher_owns_assignment(assignment_id) or public.student_can_read_assignment(assignment_id));
create policy tasks_insert_teacher on public.tasks for insert to authenticated
with check (public.teacher_owns_assignment(assignment_id));
create policy tasks_update_teacher on public.tasks for update to authenticated
using (public.teacher_owns_assignment(assignment_id)) with check (public.teacher_owns_assignment(assignment_id));
create policy tasks_delete_teacher on public.tasks for delete to authenticated
using (public.teacher_owns_assignment(assignment_id));

create policy submissions_select_related on public.submissions for select to authenticated
using (student_id = (select auth.uid()) or public.teacher_owns_submission(id));
create policy submissions_insert_student on public.submissions for insert to authenticated
with check (student_id = (select auth.uid()) and public.student_can_submit_task(task_id));
create policy submissions_update_student on public.submissions for update to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()) and public.student_can_submit_task(task_id));

create policy assessments_select_related on public.assessments for select to authenticated using (
  public.teacher_owns_submission(submission_id)
  or exists (select 1 from public.submissions s
    where s.id = assessments.submission_id and s.student_id = (select auth.uid()))
);
create policy assessments_insert_teacher on public.assessments for insert to authenticated
with check (assessed_by = (select auth.uid()) and public.teacher_owns_submission(submission_id));
create policy assessments_update_teacher on public.assessments for update to authenticated
using (assessed_by = (select auth.uid()) and public.teacher_owns_submission(submission_id))
with check (assessed_by = (select auth.uid()) and public.teacher_owns_submission(submission_id));
create policy assessments_delete_teacher on public.assessments for delete to authenticated
using (assessed_by = (select auth.uid()) and public.teacher_owns_submission(submission_id));

-- SQL grants and RLS both apply. Profile creation/role assignment is admin-only.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.classrooms from anon, authenticated;
revoke all on table public.class_members from anon, authenticated;
revoke all on table public.assignments from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.assessments from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select, delete on table public.classrooms to authenticated;
grant insert (teacher_id, name, grade_level, academic_year) on public.classrooms to authenticated;
grant update (name, grade_level, academic_year) on table public.classrooms to authenticated;
-- Membership creation is reserved for the trusted import/enrolment server flow.
-- Direct client INSERT would let a teacher claim an arbitrary student UUID.
grant select, delete on table public.class_members to authenticated;
grant select, delete on table public.assignments to authenticated;
grant insert (classroom_id, title, description, due_at, status) on public.assignments to authenticated;
grant update (title, description, due_at, status) on table public.assignments to authenticated;
grant select, delete on table public.tasks to authenticated;
grant insert (assignment_id, skill, title, instruction, content, order_index)
  on public.tasks to authenticated;
grant update (skill, title, instruction, content, order_index) on table public.tasks to authenticated;
grant select on table public.submissions to authenticated;
grant insert (task_id, student_id, answer_text, answer_file_path, answer_metadata, status)
  on public.submissions to authenticated;
grant update (answer_text, answer_file_path, answer_metadata, status)
  on public.submissions to authenticated;
grant select, delete on table public.assessments to authenticated;
grant insert (submission_id, score, feedback, assessed_by)
  on public.assessments to authenticated;
grant update (score, feedback) on public.assessments to authenticated;

commit;
