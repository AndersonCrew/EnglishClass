begin;

-- Public sign-up is for teachers. The trusted student import flow sets
-- app_metadata.role = STUDENT. Clients cannot modify raw_app_meta_data.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'TEACHER');
  profile_name text := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Người dùng'
    ),
    120
  );
begin
  if requested_role not in ('TEACHER', 'STUDENT') then
    raise exception 'Unsupported user role';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, requested_role::public.user_role, profile_name);
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
