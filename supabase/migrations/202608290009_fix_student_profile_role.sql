begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_role text := nullif(new.raw_app_meta_data ->> 'role', '');
  requested_role text := case
    when metadata_role in ('TEACHER', 'STUDENT') then metadata_role
    when lower(coalesce(new.email, '')) like '%@students.englishclass.internal' then 'STUDENT'
    else 'TEACHER'
  end;
  profile_name text := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Người dùng'
    ),
    120
  );
  creator_id uuid;
begin
  if coalesce(new.raw_app_meta_data ->> 'created_by', '') ~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  then
    creator_id := (new.raw_app_meta_data ->> 'created_by')::uuid;
  end if;

  insert into public.profiles (id, role, full_name, created_by_teacher_id)
  values (new.id, requested_role::public.user_role, profile_name,
    case when requested_role = 'STUDENT' then creator_id else null end);
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

commit;
