begin;

create type public.student_gender as enum ('MALE', 'FEMALE', 'OTHER');

alter table public.profiles
  add column date_of_birth date,
  add column gender public.student_gender,
  add column parent_phone text,
  add column username text;

alter table public.profiles
  add constraint profiles_student_details_check check (
    role = 'STUDENT'
    or (date_of_birth is null and gender is null and parent_phone is null and username is null)
  ),
  add constraint profiles_date_of_birth_check check (
    date_of_birth is null or date_of_birth between date '2000-01-01' and current_date
  ),
  add constraint profiles_parent_phone_check check (
    parent_phone is null or parent_phone ~ '^\+?[0-9]{8,15}$'
  ),
  add constraint profiles_username_check check (
    username is null or username ~ '^[a-z0-9]+(?:\.[a-z0-9]+)*$'
  );

create unique index profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

create policy profiles_update_managed_student
on public.profiles for update to authenticated
using (role = 'STUDENT' and public.teacher_manages_student(id))
with check (role = 'STUDENT' and public.teacher_manages_student(id));

grant update (full_name, date_of_birth, gender, parent_phone)
  on public.profiles to authenticated;

create function public.finalize_student_enrollment(
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
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'STUDENT'
    where u.id = target_student_id
      and u.raw_app_meta_data ->> 'created_by' = (select auth.uid())::text
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
  values (target_classroom_id, target_student_id);
end;
$$;

revoke all on function public.finalize_student_enrollment(uuid, uuid, text, date, public.student_gender, text, text) from public;
grant execute on function public.finalize_student_enrollment(uuid, uuid, text, date, public.student_gender, text, text) to authenticated;

commit;
