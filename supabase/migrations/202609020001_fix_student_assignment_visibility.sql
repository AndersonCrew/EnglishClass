begin;

-- An active membership and an explicitly opened, unexpired assignment are the
-- authoritative visibility rules. Classroom ends_at is presentation metadata;
-- a stale value must not silently hide an assignment that a teacher just opened.
create or replace function public.student_can_work_assignment(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where a.id = target_id
      and a.status = 'PUBLISHED'
      and a.closes_at is not null
      and a.closes_at > now()
      and cm.student_id = (select auth.uid())
      and cm.status = 'ACTIVE'
  );
$$;

revoke all on function public.student_can_work_assignment(uuid) from public;
grant execute on function public.student_can_work_assignment(uuid) to authenticated;

create or replace function public.student_can_read_assignment(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.student_can_work_assignment(target_id)
    or exists (
      select 1
      from public.submissions s
      where s.assignment_id = target_id
        and s.student_id = (select auth.uid())
        and s.status = 'SUBMITTED'
    );
$$;

revoke all on function public.student_can_read_assignment(uuid) from public;
grant execute on function public.student_can_read_assignment(uuid) to authenticated;

drop policy if exists assignments_select_related on public.assignments;
create policy assignments_select_related
on public.assignments
for select
to authenticated
using (
  public.is_classroom_teacher(classroom_id)
  or public.student_can_read_assignment(id)
);

commit;
