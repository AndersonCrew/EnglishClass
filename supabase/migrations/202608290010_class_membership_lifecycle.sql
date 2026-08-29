-- Preserve class history when a student leaves and support class expiration.
create type public.class_member_status as enum ('ACTIVE', 'WITHDRAWN');

alter table public.classrooms add column ends_at date;
alter table public.class_members
  add column status public.class_member_status not null default 'ACTIVE',
  add column left_at timestamptz;

-- Best-effort backfill for academic years such as 2026-2027 or 2026–2027.
update public.classrooms
set ends_at = make_date((substring(academic_year from '([0-9]{4})$'))::integer, 6, 30)
where academic_year ~ '[0-9]{4}$';

alter table public.class_members add constraint class_members_left_at_matches_status check (
  (status = 'ACTIVE' and left_at is null)
  or (status = 'WITHDRAWN' and left_at is not null)
);

create index class_members_classroom_status_idx
  on public.class_members (classroom_id, status);

create policy class_members_update_teacher on public.class_members for update to authenticated
using (public.is_classroom_teacher(classroom_id))
with check (public.is_classroom_teacher(classroom_id));

grant insert (teacher_id, name, grade_level, academic_year, ends_at) on public.classrooms to authenticated;
grant update (name, grade_level, academic_year, ends_at) on public.classrooms to authenticated;
grant update (status, left_at) on public.class_members to authenticated;

-- Students who left keep read-only history, but cannot submit new work.
create or replace function public.student_can_submit_task(target_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.tasks t
    join public.assignments a on a.id = t.assignment_id
    join public.classrooms c on c.id = a.classroom_id
    join public.class_members cm on cm.classroom_id = a.classroom_id
    where t.id = target_id
      and a.status = 'PUBLISHED'
      and cm.student_id = (select auth.uid())
      and cm.status = 'ACTIVE'
      and (c.ends_at is null or c.ends_at >= current_date)
  );
$$;
