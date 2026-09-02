begin;

-- Reading questions need their own semantic illustration instead of reusing
-- the assignment cover. Update already-provisioned Grade 3 lessons as well as
-- relying on the curriculum seed for future classrooms.
update public.questions q
set image_path = '/images/grade3/questions/reading-' || right(a.curriculum_code, 2) || '.webp',
    updated_at = now()
from public.tasks t
join public.assignments a on a.id = t.assignment_id
where q.task_id = t.id
  and t.skill = 'READING'
  and a.curriculum_code ~ '^G3-(0[1-9]|1[0-2])$';

commit;
