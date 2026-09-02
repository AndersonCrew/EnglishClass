begin;

-- All Grade 3 assignments use ten questions worth one point each.
update public.questions q
set points = 1
from public.tasks t
join public.assignments a on a.id = t.assignment_id
join public.classrooms c on c.id = a.classroom_id
where q.task_id = t.id
  and c.grade_level = 3
  and a.curriculum_code ~ '^G3-[0-9]{2}$';

do $$
declare
  lesson record;
  listening_task uuid;
  reading_task uuid;
  writing_task uuid;
  listen_text text;
  source_options jsonb;
  source_answer jsonb;
  new_question uuid;
begin
  for lesson in
    select a.id
    from public.assignments a
    join public.classrooms c on c.id = a.classroom_id
    where c.grade_level = 3 and a.curriculum_code ~ '^G3-[0-9]{2}$'
  loop
    select id into listening_task from public.tasks where assignment_id = lesson.id and skill = 'LISTENING' order by order_index limit 1;
    select id into reading_task from public.tasks where assignment_id = lesson.id and skill = 'READING' order by order_index limit 1;
    select id into writing_task from public.tasks where assignment_id = lesson.id and skill = 'WRITING' order by order_index limit 1;

    select q.config->>'speakText', q.config->'options', k.answer_key
    into listen_text, source_options, source_answer
    from public.questions q
    join public.question_answer_keys k on k.question_id = q.id
    where q.task_id = listening_task and q.order_index = 0;

    if listen_text is null then continue; end if;

    if not exists (select 1 from public.questions where task_id = listening_task and order_index = 1) then
      insert into public.questions(task_id, type, prompt, instruction, image_path, config, points, order_index)
      values (listening_task, 'MULTIPLE_CHOICE', 'Chọn đúng câu em vừa nghe.', null, null,
        jsonb_build_object('options', jsonb_build_array(
          jsonb_build_object('id', 's1', 'label', listen_text),
          jsonb_build_object('id', 's2', 'label', 'I am reading a book.'),
          jsonb_build_object('id', 's3', 'label', 'This is my family.')
        ), 'speakText', listen_text), 1, 1)
      returning id into new_question;
      insert into public.question_answer_keys(question_id, answer_key) values (new_question, '{"optionId":"s1"}'::jsonb);
    end if;

    if not exists (select 1 from public.questions where task_id = reading_task and order_index = 1) then
      insert into public.questions(task_id, type, prompt, instruction, image_path, config, points, order_index)
      select reading_task, 'MULTIPLE_CHOICE', 'Chọn từ hoặc cụm từ xuất hiện trong nội dung bài.', null, q.image_path,
        jsonb_build_object('options', source_options), 1, 1
      from public.questions q where q.task_id = reading_task and q.order_index = 0
      returning id into new_question;
      insert into public.question_answer_keys(question_id, answer_key) values (new_question, source_answer);
    end if;

    if not exists (select 1 from public.questions where task_id = reading_task and order_index = 2) then
      insert into public.questions(task_id, type, prompt, instruction, image_path, config, points, order_index)
      select reading_task, 'TRUE_FALSE', 'Câu này đúng với nội dung bài nghe: “' || listen_text || '”', null, q.image_path, '{}'::jsonb, 1, 2
      from public.questions q where q.task_id = reading_task and q.order_index = 0
      returning id into new_question;
      insert into public.question_answer_keys(question_id, answer_key) values (new_question, '{"value":true}'::jsonb);
    end if;

    if not exists (select 1 from public.questions where task_id = writing_task and order_index = 2) then
      insert into public.questions(task_id, type, prompt, instruction, image_path, config, points, order_index)
      values (writing_task, 'FILL_BLANK', 'Nghe và viết lại câu em vừa nghe.', null, null,
        jsonb_build_object('speakText', listen_text), 1, 2)
      returning id into new_question;
      insert into public.question_answer_keys(question_id, answer_key)
      values (new_question, jsonb_build_object('accepted', jsonb_build_array(listen_text), 'caseSensitive', false));
    end if;
  end loop;
end;
$$;

-- Teachers still grade each Speaking answer from 1-10. The average is scaled
-- to the actual Speaking weight (two one-point questions), keeping the whole
-- assignment on a 10-point scale.
create or replace function public.assess_student_answer(
  target_answer_id uuid,
  score_value numeric,
  feedback_value text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  target_submission uuid;
  speaking_average numeric;
  speaking_weight numeric;
  weighted_speaking numeric;
  pending_speaking integer;
  total_value numeric;
  elapsed integer;
begin
  select sa.submission_id into target_submission
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  join public.submissions s on s.id = sa.submission_id
  where sa.id = target_answer_id and q.type = 'TEXT_INPUT' and t.skill = 'SPEAKING'
    and s.status = 'SUBMITTED' and public.teacher_owns_submission(sa.submission_id);

  if target_submission is null then raise exception 'Speaking answer is unavailable'; end if;
  if score_value < 1 or score_value > 10 then raise exception 'Speaking score must be between 1 and 10'; end if;
  if char_length(btrim(coalesce(feedback_value, ''))) = 0 then raise exception 'Speaking feedback is required'; end if;
  if char_length(feedback_value) > 2000 then raise exception 'Feedback is too long'; end if;

  update public.student_answers set teacher_score = score_value, teacher_feedback = btrim(feedback_value), updated_at = now() where id = target_answer_id;

  select round(avg(sa.teacher_score), 2), coalesce(sum(q.points), 0), count(*) filter (where sa.teacher_score is null)
  into speaking_average, speaking_weight, pending_speaking
  from public.student_answers sa
  join public.questions q on q.id = sa.question_id
  join public.tasks t on t.id = q.task_id
  where sa.submission_id = target_submission and q.type = 'TEXT_INPUT' and t.skill = 'SPEAKING';

  weighted_speaking := round((coalesce(speaking_average, 0) / 10) * speaking_weight, 2);
  select coalesce(s.auto_score, 0) + weighted_speaking, coalesce(s.duration_seconds, 0)
  into total_value, elapsed from public.submissions s where s.id = target_submission;

  update public.submissions
  set teacher_score = weighted_speaking, teacher_feedback = null,
      assessed_at = case when pending_speaking = 0 then now() else null end,
      assessed_by = case when pending_speaking = 0 then (select auth.uid()) else null end,
      best_score = case when pending_speaking = 0 and (best_score is null or total_value > best_score) then total_value else best_score end,
      best_duration_seconds = case
        when pending_speaking = 0 and (best_score is null or total_value > best_score) then elapsed
        when pending_speaking = 0 and total_value = best_score and (best_duration_seconds is null or elapsed < best_duration_seconds) then elapsed
        else best_duration_seconds end,
      updated_at = now()
  where id = target_submission;
end;
$$;

revoke all on function public.assess_student_answer(uuid, numeric, text) from public;
grant execute on function public.assess_student_answer(uuid, numeric, text) to authenticated;

commit;
