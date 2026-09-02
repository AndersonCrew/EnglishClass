begin;

create or replace function public.provision_curriculum_assignment(
  target_classroom_id uuid,
  lesson_code text,
  lesson_title text,
  lesson_description text,
  lesson_level smallint,
  lesson_sequence integer,
  lesson_tasks jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  result_id uuid;
  task_item jsonb;
  question_item jsonb;
  created_task_id uuid;
  created_question_id uuid;
  task_position bigint;
  question_position bigint;
  skill_count integer;
begin
  if not public.is_classroom_teacher(target_classroom_id) then
    raise exception 'Classroom is unavailable';
  end if;
  if not exists (select 1 from public.classrooms where id = target_classroom_id and grade_level = 3) then
    raise exception 'Curriculum does not match classroom grade';
  end if;
  if lesson_code !~ '^G3-[0-9]{2}$' or lesson_level not between 1 and 4 or lesson_sequence <= 0 then
    raise exception 'Invalid curriculum metadata';
  end if;
  if jsonb_typeof(lesson_tasks) <> 'array' or jsonb_array_length(lesson_tasks) <> 4 then
    raise exception 'A curriculum assignment requires four tasks';
  end if;

  select id into result_id from public.assignments
  where classroom_id = target_classroom_id and curriculum_code = lesson_code;
  if result_id is not null then return result_id; end if;

  select count(distinct value->>'skill') into skill_count from jsonb_array_elements(lesson_tasks);
  if skill_count <> 4 or exists (
    select 1 from jsonb_array_elements(lesson_tasks) value
    where value->>'skill' not in ('LISTENING', 'SPEAKING', 'READING', 'WRITING')
      or jsonb_typeof(value->'questions') <> 'array'
      or jsonb_array_length(value->'questions') = 0
  ) then raise exception 'Curriculum tasks are invalid'; end if;

  insert into public.assignments(
    classroom_id, title, description, status, show_results_after_submit,
    level, sequence_index, curriculum_code
  ) values (
    target_classroom_id, lesson_title, nullif(btrim(lesson_description), ''), 'DRAFT', false,
    lesson_level, lesson_sequence, lesson_code
  ) returning id into result_id;

  for task_item, task_position in
    select value, ordinality from jsonb_array_elements(lesson_tasks) with ordinality
  loop
    insert into public.tasks(assignment_id, skill, title, instruction, content, category, order_index)
    values (
      result_id, (task_item->>'skill')::public.skill_type, task_item->>'title',
      nullif(btrim(task_item->>'instruction'), ''), '{}'::jsonb,
      nullif(btrim(task_item->>'category'), ''), task_position - 1
    ) returning id into created_task_id;

    for question_item, question_position in
      select value, ordinality from jsonb_array_elements(task_item->'questions') with ordinality
    loop
      insert into public.questions(task_id, type, prompt, instruction, image_path, config, points, order_index)
      values (
        created_task_id, (question_item->>'type')::public.question_type,
        question_item->>'prompt', nullif(btrim(question_item->>'instruction'), ''),
        nullif(btrim(question_item->>'imagePath'), ''),
        coalesce(question_item->'config', '{}'::jsonb),
        (question_item->>'points')::numeric, question_position - 1
      ) returning id into created_question_id;

      insert into public.question_answer_keys(question_id, answer_key)
      values (created_question_id, coalesce(question_item->'answerKey', '{}'::jsonb));
    end loop;
  end loop;

  return result_id;
end;
$$;

revoke all on function public.provision_curriculum_assignment(uuid, text, text, text, smallint, integer, jsonb) from public;
grant execute on function public.provision_curriculum_assignment(uuid, text, text, text, smallint, integer, jsonb) to authenticated;

commit;
