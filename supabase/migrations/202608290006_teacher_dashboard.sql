begin;

create function public.get_teacher_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with teacher_classrooms as (
  select c.id, c.name, c.grade_level, c.created_at
  from public.classrooms c
  where c.teacher_id = (select auth.uid())
    and public.is_teacher()
),
class_stats as (
  select tc.id, tc.name, tc.grade_level, tc.created_at,
    count(distinct cm.student_id)::integer as student_count,
    count(distinct a.id) filter (where a.status = 'PUBLISHED')::integer as active_assignment_count
  from teacher_classrooms tc
  left join public.class_members cm on cm.classroom_id = tc.id
  left join public.assignments a on a.classroom_id = tc.id
  group by tc.id, tc.name, tc.grade_level, tc.created_at
),
teacher_assignments as (
  select a.id, a.classroom_id, a.title, a.status, a.due_at, a.created_at,
    tc.name as classroom_name,
    count(distinct cm.student_id)::integer as total_students,
    count(distinct s.student_id) filter (where s.status = 'SUBMITTED')::integer as submitted_students
  from public.assignments a
  join teacher_classrooms tc on tc.id = a.classroom_id
  left join public.class_members cm on cm.classroom_id = a.classroom_id
  left join public.submissions s on s.assignment_id = a.id
  group by a.id, a.classroom_id, a.title, a.status, a.due_at, a.created_at, tc.name
),
pending_manual as (
  select ta.id as assignment_id, ta.classroom_id, ta.title, ta.classroom_name,
    count(distinct s.id)::integer as pending_count,
    max(s.submitted_at) as latest_at
  from teacher_assignments ta
  join public.submissions s on s.assignment_id = ta.id and s.status = 'SUBMITTED'
  where exists (
    select 1
    from public.student_answers sa
    join public.questions q on q.id = sa.question_id
    where sa.submission_id = s.id
      and q.type = 'TEXT_INPUT'
      and sa.teacher_score is null
  )
  group by ta.id, ta.classroom_id, ta.title, ta.classroom_name
  order by latest_at desc nulls last
  limit 3
),
due_work as (
  select ta.id as assignment_id, ta.classroom_id, ta.title, ta.classroom_name,
    ta.due_at, greatest(ta.total_students - ta.submitted_students, 0)::integer as incomplete_count
  from teacher_assignments ta
  where ta.status = 'PUBLISHED'
    and greatest(ta.total_students - ta.submitted_students, 0) > 0
    and ta.due_at is not null
    and ta.due_at <= now() + interval '3 days'
  order by ta.due_at asc
  limit 3
),
draft_work as (
  select ta.id as assignment_id, ta.classroom_id, ta.title, ta.classroom_name, ta.created_at
  from teacher_assignments ta
  where ta.status = 'DRAFT'
  order by ta.created_at desc
  limit 3
)
select jsonb_build_object(
  'overview', jsonb_build_object(
    'classroomCount', (select count(*) from teacher_classrooms),
    'studentCount', (
      select count(distinct cm.student_id)
      from public.class_members cm join teacher_classrooms tc on tc.id = cm.classroom_id
    ),
    'publishedAssignmentCount', (select count(*) from teacher_assignments where status = 'PUBLISHED')
  ),
  'classrooms', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', cs.id, 'name', cs.name, 'gradeLevel', cs.grade_level,
      'studentCount', cs.student_count, 'activeAssignmentCount', cs.active_assignment_count
    ) order by cs.created_at desc)
    from (select * from class_stats order by created_at desc limit 6) cs
  ), '[]'::jsonb),
  'recentAssignments', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', ra.id, 'classroomId', ra.classroom_id, 'title', ra.title,
      'classroomName', ra.classroom_name, 'status', ra.status,
      'dueAt', ra.due_at, 'totalStudents', ra.total_students,
      'submittedStudents', ra.submitted_students
    ) order by ra.created_at desc)
    from (select * from teacher_assignments order by created_at desc limit 6) ra
  ), '[]'::jsonb),
  'pendingManual', coalesce((select jsonb_agg(to_jsonb(pm) - 'latest_at') from pending_manual pm), '[]'::jsonb),
  'dueWork', coalesce((select jsonb_agg(to_jsonb(dw)) from due_work dw), '[]'::jsonb),
  'draftWork', coalesce((select jsonb_agg(to_jsonb(draft) - 'created_at') from draft_work draft), '[]'::jsonb)
);
$$;

revoke all on function public.get_teacher_dashboard() from public;
grant execute on function public.get_teacher_dashboard() to authenticated;

commit;
