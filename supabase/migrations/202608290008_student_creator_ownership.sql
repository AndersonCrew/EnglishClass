begin;

alter table public.profiles
  add column if not exists created_by_teacher_id uuid
    references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_student_creator_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_student_creator_check check (
        role = 'STUDENT' or created_by_teacher_id is null
      );
  end if;
end
$$;

create or replace function public.finalize_student_enrollment(
  target_classroom_id uuid,
  target_student_id uuid,
  student_full_name text,
  student_date_of_birth date,
  student_gender_value public.student_gender,
  student_parent_phone text,
  student_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_classroom_teacher(target_classroom_id) then
    raise exception 'Not allowed to manage this classroom';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_student_id
      and p.role = 'STUDENT'
      and p.created_by_teacher_id = (select auth.uid())
  ) then
    raise exception 'Student account was not created by this teacher';
  end if;

  update public.profiles
  set full_name = student_full_name,
      date_of_birth = student_date_of_birth,
      gender = student_gender_value,
      parent_phone = student_parent_phone,
      username = student_username
  where id = target_student_id and role = 'STUDENT';

  insert into public.class_members (classroom_id, student_id)
  values (target_classroom_id, target_student_id)
  on conflict (classroom_id, student_id) do nothing;
end;
$$;

revoke all on function public.finalize_student_enrollment(uuid, uuid, text, date, public.student_gender, text, text) from public;
grant execute on function public.finalize_student_enrollment(uuid, uuid, text, date, public.student_gender, text, text) to authenticated;

commit;
