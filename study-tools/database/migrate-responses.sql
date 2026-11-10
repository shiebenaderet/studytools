-- Responses table, November 2026. REVIEW BEFORE RUNNING. NOT YET APPLIED.
--
-- Holds students' written answers from two places:
--   * 'short-answer': the Short Answer activity and Response Builder (the June
--     2026 Response Incentives design, docs/superpowers/specs/2026-06-02-...).
--   * 'read-more': the "Tell Mr. B" question at the end of a textbook section's
--     Read More panel (docs/plans/2026-11-09-unit3-read-more-checks.md).
--
-- Change from the June design: that design gave the anon key open SELECT on
-- responses, so anyone with the site's public key could read every student's
-- answers with names attached. Here students have NO direct access to the table.
-- They save through save_response(), a SECURITY DEFINER function that can only
-- insert or update one row. Only a teacher (is_teacher(), from
-- migrate-rls-hardening.sql) can read, mark or delete rows.
--
-- Same design limit as the rest of the database: students are not
-- authenticated, so the function cannot prove the caller is the student whose
-- UUID it passes. It can stop reads, bulk changes and oversized input.
--
-- Run in the Supabase SQL editor as one query. Safe to re-run.

begin;

create table if not exists public.responses (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid not null references public.students(id) on delete cascade,
    student_name    text,
    class_code      text,
    unit_id         text not null,
    source          text not null check (source in ('short-answer', 'read-more')),
    item_key        text not null,          -- question index, or segment/section id
    question_text   text,                   -- copied so the teacher view needs no joins
    answer_text     text not null,
    word_count      int not null default 0,
    featured        boolean not null default false,   -- teacher marks a good example
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (student_id, unit_id, source, item_key)
);

create index if not exists idx_responses_unit_item on public.responses (unit_id, source, item_key);
create index if not exists idx_responses_updated on public.responses (updated_at desc);

alter table public.responses enable row level security;

-- No anon policies at all: students cannot select, insert, update or delete
-- rows directly. Teachers read and manage everything.
drop policy if exists "Teachers read responses" on public.responses;
drop policy if exists "Teachers update responses" on public.responses;
drop policy if exists "Teachers delete responses" on public.responses;
create policy "Teachers read responses"   on public.responses for select using (public.is_teacher());
create policy "Teachers update responses" on public.responses for update using (public.is_teacher());
create policy "Teachers delete responses" on public.responses for delete using (public.is_teacher());

-- The one way a student saves an answer. Upserts a single row and returns the
-- saved word count, or -1 if the input was rejected. Never returns other rows.
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
       or p_source not in ('short-answer', 'read-more')
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
--   select policyname, cmd, qual from pg_policies where tablename = 'responses';
--     -> three teacher policies, nothing for anon.
--   As anon: select * from responses;               -> 0 rows (RLS)
--   As anon: select save_response(<real student id>, 'unit-test', 'read-more',
--            'test/section', 'Q?', 'one two three', null, null);  -> 3
--   As a teacher in the dashboard: the test row is visible; delete it.
