begin;

-- Users created before on_auth_user_created existed have no profile and cannot
-- pass application authorization. This one-time backfill repairs those users.
insert into public.profiles (id, role, full_name)
select
  u.id,
  case
    when u.raw_app_meta_data ->> 'role' = 'STUDENT' then 'STUDENT'::public.user_role
    else 'TEACHER'::public.user_role
  end,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Người dùng'
    ),
    120
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

commit;
