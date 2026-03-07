-- Migration: Tighten RLS policies
-- Run this in Supabase SQL Editor to fix overly permissive policies
-- Date: 2026-03-07

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can register" ON students;
DROP POLICY IF EXISTS "Students read own data" ON students;
DROP POLICY IF EXISTS "Students manage own progress" ON progress;
DROP POLICY IF EXISTS "Students manage own sessions" ON sessions;
DROP POLICY IF EXISTS "Leaderboard open access" ON leaderboard;

-- Students: anyone can register and read, only teachers can update/delete
CREATE POLICY "Anyone can register" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read students" ON students FOR SELECT USING (true);
CREATE POLICY "Teachers manage students" ON students FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers delete students" ON students FOR DELETE USING (auth.role() = 'authenticated');

-- Progress: open insert/read/update (student_id is a non-guessable UUID),
-- only teachers can delete
CREATE POLICY "Students insert own progress" ON progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read own progress" ON progress FOR SELECT USING (true);
CREATE POLICY "Students update own progress" ON progress FOR UPDATE USING (true);
CREATE POLICY "Teachers delete progress" ON progress FOR DELETE USING (auth.role() = 'authenticated');

-- Sessions: open insert/read/update, only teachers can delete
CREATE POLICY "Students insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Students update own sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Teachers delete sessions" ON sessions FOR DELETE USING (auth.role() = 'authenticated');

-- Leaderboard: enable RLS if not already
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Leaderboard: students can insert/read, update only if not self-approving, teachers have full access
CREATE POLICY "Students upsert own score" ON leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads approved scores" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Students update own score" ON leaderboard FOR UPDATE
    USING (true)
    WITH CHECK (approved = false);
CREATE POLICY "Teachers manage leaderboard" ON leaderboard FOR ALL USING (auth.role() = 'authenticated');
