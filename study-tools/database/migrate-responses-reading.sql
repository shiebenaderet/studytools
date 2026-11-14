-- Responses: a third kind of written answer, 'reading', November 2026.
--
-- NOT YET APPLIED. The teacher runs this once in the Supabase SQL editor. When it
-- has been run, replace this line with the date, as in migrate-responses.sql.
--
-- Why: a brief textbook reading can end with one optional written question
-- (docs/plans/2026-11-11-reading-questions.md). Its answers are sent with
-- source 'reading' so the dashboard can filter them apart from Short Answer
-- and Read More. Until this runs, save_response() returns -1 for 'reading'
-- and the site tells the student the answer is saved on the device only.
--
-- What it changes: the list of allowed sources, in the table's check and in
-- save_response(). Nothing else. No rows are touched, and access is unchanged
-- (students still cannot read the table; only a teacher can).
--
-- Run as one query. Safe to re-run.

begin;

-- Replace the source check, whatever name it was given when the table was made.
do $$
declare c record;
begin
    for c in
        select conname from pg_constraint
        where conrelid = 'public.responses'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid) ilike '%read-more%'
    loop
        execute format('alter table public.responses drop constraint %I', c.conname);
    end loop;
end $$;

alter table public.responses
    add constraint responses_source_check
    check (source in ('short-answer', 'read-more', 'reading'));

-- Same function as in migrate-responses.sql, with 'reading' allowed.
create or replace function public.save_response(
    p_student       uuid,
    p_unit          text,
    p_source        text,
    p_item          text,
    p_question      text,
    p_answer        text,
    p_student_name  text,
    p_class_code    text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_answer text := btrim(coalesce(p_answer, ''));
    v_words  int;
begin
    if p_student is null
       or p_unit is null or length(p_unit) = 0 or length(p_unit) > 64
       or p_source not in ('short-answer', 'read-more', 'reading')
       or p_item is null or length(p_item) = 0 or length(p_item) > 128
       or length(v_answer) = 0 or length(v_answer) > 4000
       or length(coalesce(p_question, '')) > 1000
       or length(coalesce(p_student_name, '')) > 120
       or length(coalesce(p_class_code, '')) > 32 then
        return -1;
    end if;

    if not exists (select 1 from public.students s where s.id = p_student) then
        return -1;
    end if;

    v_words := coalesce(array_length(regexp_split_to_array(v_answer, '\s+'), 1), 0);

    insert into public.responses as r
        (student_id, student_name, class_code, unit_id, source, item_key,
         question_text, answer_text, word_count, updated_at)
    values
        (p_student, nullif(p_student_name, ''), nullif(p_class_code, ''), p_unit,
         p_source, p_item, p_question, v_answer, v_words, now())
    on conflict (student_id, unit_id, source, item_key) do update
        set answer_text   = excluded.answer_text,
            word_count    = excluded.word_count,
            question_text = excluded.question_text,
            student_name  = excluded.student_name,
            class_code    = excluded.class_code,
            updated_at    = now();
    -- featured is never touched here, so a student's edit keeps the teacher's mark.

    return v_words;
end;
$$;

revoke all on function public.save_response(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.save_response(uuid, text, text, text, text, text, text, text) to anon, authenticated;

commit;

-- Check after running:
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.responses'::regclass and contype = 'c';
--     -> one row listing short-answer, read-more and reading.
--   select policyname, cmd from pg_policies where tablename = 'responses';
--     -> still three teacher policies, nothing for anon.
