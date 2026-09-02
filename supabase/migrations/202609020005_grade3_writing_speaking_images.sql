-- Give every Grade 3 Writing and Speaking question its own illustration.
update public.questions as q
set image_path = case t.skill
  when 'WRITING'::public.skill_type then
    '/images/grade3/questions/writing-' || right(a.curriculum_code, 2) || '-' || lpad((q.order_index + 1)::text, 2, '0') || '.webp'
  when 'SPEAKING'::public.skill_type then
    '/images/grade3/questions/speaking-' || right(a.curriculum_code, 2) || '-' || lpad((q.order_index + 1)::text, 2, '0') || '.webp'
  else q.image_path
end
from public.tasks as t
join public.assignments as a on a.id = t.assignment_id
join public.classrooms as c on c.id = a.classroom_id
where q.task_id = t.id
  and c.grade_level = 3
  and a.curriculum_code ~ '^G3-[0-9]{2}$'
  and t.skill in ('WRITING'::public.skill_type, 'SPEAKING'::public.skill_type);
