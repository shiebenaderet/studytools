-- RLS hardening, October 2026. REVIEW BEFORE RUNNING; this changes who can do
-- what with the public (anon) key that ships in the site's source.
--
-- What the live database allowed before this (read with pg_policies, 2026-10-10),
-- which is looser than migrate-rls-policies.sql in this folder:
--   * progress, sessions, leaderboard: one policy each, FOR ALL USING (true).
--     Anyone with the anon key could DELETE every student's progress, sessions
--     and scores, and flip leaderboard.approved.
--   * "teacher" meant any signed-in Supabase account (auth.role() = 'authenticated'),
--     not an account whose email teaches a class.
--   * classes had no teacher policy at all, so the dashboard's "create class"
--     insert could not succeed; students had no UPDATE policy, so attaching a
--     recovery word to an existing student (progress.js) silently failed.
--
-- Design limits: students are not authenticated (they hold a UUID in local
-- storage), so row-level security cannot tell one student from another. This
-- migration removes destructive and privilege-escalating paths and gates every
-- teacher action on the teacher's email; it does NOT stop a student with devtools
-- from editing their own (or a classmate's) progress or score. That needs
-- Supabase anonymous auth plus owner-scoped policies: see the notes at the end.
--
-- Run in the Supabase SQL editor as one transaction.

begin;

-- ---------------------------------------------------------------------------
-- Teacher check: the signed-in email must teach at least one class.
-- SECURITY DEFINER so it works even if classes becomes less readable later.
-- ---------------------------------------------------------------------------
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    where lower(c.teacher_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_teacher() from public;
grant execute on function public.is_teacher() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- classes: anyone can read (students look up their class by code); only a
-- teacher can create/edit/delete. The dashboard inserts {name, code} only, so
-- fill teacher_email from the signed-in account.
-- ---------------------------------------------------------------------------
create or replace function public.classes_set_teacher_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teacher_email is null or new.teacher_email = '' then
    new.teacher_email := coalesce(auth.jwt() ->> 'email', '');
  end if;
  return new;
end;
$$;
drop trigger if exists classes_set_teacher_email on public.classes;
create trigger classes_set_teacher_email
  before insert on public.classes
  for each row execute function public.classes_set_teacher_email();

drop policy if exists "Anyone can read classes" on public.classes;
drop policy if exists "Teachers manage classes" on public.classes;
create policy "Anyone can read classes" on public.classes for select using (true);
create policy "Teachers insert classes" on public.classes for insert with check (public.is_teacher() or auth.role() = 'authenticated');
create policy "Teachers update classes" on public.classes for update using (public.is_teacher());
create policy "Teachers delete classes" on public.classes for delete using (public.is_teacher());
-- Note: the INSERT policy also accepts any signed-in account so a brand-new
-- teacher can create their first class (which is what makes them a teacher).
-- If sign-ups are disabled in Supabase Auth, that account can only be yours.

-- ---------------------------------------------------------------------------
-- students: register and read (sign-in looks a student up by class + name);
-- edits and deletes are teacher-only. Recovery words are attached through
-- set_recovery_word() below instead of a direct UPDATE.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can register" on public.students;
drop policy if exists "Anyone can read students" on public.students;
drop policy if exists "Students read own data" on public.students;
drop policy if exists "Teachers manage students" on public.students;
drop policy if exists "Teachers delete students" on public.students;
create policy "Anyone can register" on public.students for insert with check (true);
create policy "Anyone can read students" on public.students for select using (true);
create policy "Teachers update students" on public.students for update using (public.is_teacher());
create policy "Teachers delete students" on public.students for delete using (public.is_teacher());

-- Set a recovery word only where none exists yet. Called by the student app
-- (progress.js) in place of its direct UPDATE, which the policies never allowed.
create or replace function public.set_recovery_word(p_student uuid, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_hash is null or length(p_hash) <> 64 then
    return false;
  end if;
  update public.students
     set recovery_word_hash = p_hash,
         recovery_word_set_at = now()
   where id = p_student
     and recovery_word_hash is null;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;
revoke all on function public.set_recovery_word(uuid, text) from public;
grant execute on function public.set_recovery_word(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- progress and sessions: students can insert, read and update (the app upserts
-- with merge-duplicates, which needs both INSERT and UPDATE). Nobody but a
-- teacher can delete.
-- ---------------------------------------------------------------------------
drop policy if exists "Students manage own progress" on public.progress;
drop policy if exists "Students insert own progress" on public.progress;
drop policy if exists "Students read own progress" on public.progress;
drop policy if exists "Students update own progress" on public.progress;
drop policy if exists "Teachers delete progress" on public.progress;
create policy "Students insert progress" on public.progress for insert with check (true);
create policy "Students read progress" on public.progress for select using (true);
create policy "Students update progress" on public.progress for update using (true);
create policy "Teachers delete progress" on public.progress for delete using (public.is_teacher());

drop policy if exists "Students manage own sessions" on public.sessions;
drop policy if exists "Students insert sessions" on public.sessions;
drop policy if exists "Students read sessions" on public.sessions;
drop policy if exists "Students update own sessions" on public.sessions;
drop policy if exists "Teachers delete sessions" on public.sessions;
create policy "Students insert sessions" on public.sessions for insert with check (true);
create policy "Students read sessions" on public.sessions for select using (true);
create policy "Students update sessions" on public.sessions for update using (true);
create policy "Teachers delete sessions" on public.sessions for delete using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- leaderboard: students can insert/read/update their score rows but can never
-- set or change `approved`; only a teacher can approve or delete. Done with a
-- trigger rather than WITH CHECK (approved = false) so a student's later score
-- updates still succeed after the teacher has approved the row.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_guard_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    if tg_op = 'INSERT' then
      new.approved := false;
    else
      new.approved := old.approved;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists leaderboard_guard_approved on public.leaderboard;
create trigger leaderboard_guard_approved
  before insert or update on public.leaderboard
  for each row execute function public.leaderboard_guard_approved();

drop policy if exists "Students can upsert own leaderboard" on public.leaderboard;
drop policy if exists "Students upsert own score" on public.leaderboard;
drop policy if exists "Anyone reads approved scores" on public.leaderboard;
drop policy if exists "Students update own score" on public.leaderboard;
drop policy if exists "Teachers manage leaderboard" on public.leaderboard;
create policy "Students insert score" on public.leaderboard for insert with check (true);
create policy "Anyone reads scores" on public.leaderboard for select using (true);
create policy "Students update score" on public.leaderboard for update using (true);
create policy "Teachers delete scores" on public.leaderboard for delete using (public.is_teacher());

-- ---------------------------------------------------------------------------
-- leaderboard_snapshots and feedback: teacher checks move from "any signed-in
-- account" to "teaches a class".
-- ---------------------------------------------------------------------------
drop policy if exists "Teachers manage snapshots" on public.leaderboard_snapshots;
create policy "Teachers manage snapshots" on public.leaderboard_snapshots for all using (public.is_teacher()) with check (public.is_teacher());

drop policy if exists "Teachers read feedback" on public.feedback;
drop policy if exists "Teachers update feedback" on public.feedback;
drop policy if exists "Teachers delete feedback" on public.feedback;
create policy "Teachers read feedback" on public.feedback for select using (public.is_teacher());
create policy "Teachers update feedback" on public.feedback for update using (public.is_teacher());
create policy "Teachers delete feedback" on public.feedback for delete using (public.is_teacher());

commit;

-- ---------------------------------------------------------------------------
-- Still open after this migration (needs app changes, not just SQL):
--   1. Anyone with the anon key can read every student's name, class and
--      recovery_word_hash (unsalted SHA-256 of a short word) and can update any
--      student's progress or score. Fix: Supabase anonymous sign-in on first
--      visit, an auth_uid column on students, policies scoped to
--      auth.uid(), and a SECURITY DEFINER function for the recovery flow that
--      verifies name + class + word server-side and links the new device.
--   2. Supabase Auth settings (dashboard, not SQL): disable public sign-ups,
--      enable leaked-password protection.
--   3. Other apps sharing this project: lc_classes / lc_saves are world-
--      writable including DELETE; the escape_* SECURITY DEFINER functions are
--      callable anonymously with an in-SQL password. Review in their repos.
-- ---------------------------------------------------------------------------
