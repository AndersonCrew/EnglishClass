-- This migration is intentionally re-runnable because SQL Editor may have
-- committed an earlier statement before a later statement failed.
alter type public.user_role add value if not exists 'ADMIN';

do $$ begin
  create type public.teacher_approval_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('ACTIVE', 'SUSPENDED');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists teacher_approval_status public.teacher_approval_status;
alter table public.profiles
  add column if not exists account_status public.account_status not null default 'ACTIVE';
alter table public.classrooms add column if not exists archived_at timestamptz;

update public.profiles
set teacher_approval_status = 'APPROVED'
where role::text = 'TEACHER' and teacher_approval_status is null;

alter table public.profiles drop constraint if exists profiles_teacher_approval_consistency;
alter table public.profiles add constraint profiles_teacher_approval_consistency check (
  (role::text = 'TEACHER' and teacher_approval_status is not null)
  or (role::text <> 'TEACHER' and teacher_approval_status is null)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_role public.user_role not null,
  action text not null check (char_length(action) between 1 and 80),
  target_type text not null check (char_length(target_type) between 1 and 40),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_action_created_at_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = 'ADMIN' and account_status = 'ACTIVE'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists classrooms_select_admin on public.classrooms;
drop policy if exists class_members_select_admin on public.class_members;
drop policy if exists assignments_select_admin on public.assignments;
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_admin());
create policy classrooms_select_admin on public.classrooms for select to authenticated using (public.is_admin());
create policy class_members_select_admin on public.class_members for select to authenticated using (public.is_admin());
create policy assignments_select_admin on public.assignments for select to authenticated using (public.is_admin());
create policy audit_logs_select_admin on public.audit_logs for select to authenticated using (public.is_admin());
grant select on public.audit_logs to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  metadata_role text := nullif(new.raw_app_meta_data ->> 'role', '');
  requested_role text := case
    when metadata_role = 'STUDENT' then 'STUDENT'
    when lower(coalesce(new.email, '')) like '%@students.englishclass.internal' then 'STUDENT'
    else 'TEACHER'
  end;
  profile_name text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Người dùng'), 120);
  creator_id uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'created_by', '') ~ '^[0-9a-fA-F-]{36}$' then
    creator_id := (new.raw_app_meta_data ->> 'created_by')::uuid;
  end if;
  insert into public.profiles (id, role, full_name, created_by_teacher_id, teacher_approval_status)
  values (
    new.id,
    requested_role::public.user_role,
    profile_name,
    case when requested_role = 'STUDENT' then creator_id else null end,
    case when requested_role = 'TEACHER' then 'PENDING'::public.teacher_approval_status else null end
  );
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public;
