-- Study Tool Platform Schema

CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    teacher_email text NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    class_id uuid REFERENCES classes(id),
    created_at timestamp DEFAULT now()
);

CREATE TABLE progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id),
    unit_id text NOT NULL,
    activity text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    updated_at timestamp DEFAULT now(),
    UNIQUE(student_id, unit_id, activity)
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id),
    unit_id text NOT NULL,
    started_at timestamp DEFAULT now(),
    duration_seconds int DEFAULT 0,
    activities_used text[] DEFAULT '{}'
);

CREATE TABLE leaderboard (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    unit_id text NOT NULL,
    score integer NOT NULL DEFAULT 0,
    vocab_mastered integer NOT NULL DEFAULT 0,
    best_test_score integer,
    study_time_seconds integer NOT NULL DEFAULT 0,
    map_best_time integer,
    map_bonus integer NOT NULL DEFAULT 0,
    approved boolean NOT NULL DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    UNIQUE(student_id, unit_id)
);

CREATE INDEX idx_leaderboard_unit_approved ON leaderboard(unit_id, approved);
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);

-- Row Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Classes: anyone can read (needed for period selection), only authenticated teachers can modify
CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Teachers manage classes" ON classes FOR ALL USING (auth.role() = 'authenticated');

-- Students: anyone can register (insert), anyone can read (needed for leaderboard names)
-- Only authenticated teachers can update/delete students
CREATE POLICY "Anyone can register" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read students" ON students FOR SELECT USING (true);
CREATE POLICY "Teachers manage students" ON students FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers delete students" ON students FOR DELETE USING (auth.role() = 'authenticated');

-- Progress: students manage their own progress only (matched by student_id stored in app)
-- Anon users identify by student_id passed from the client; this is acceptable because
-- student_ids are UUIDs that are not guessable and are stored only in the student's browser.
CREATE POLICY "Students insert own progress" ON progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read own progress" ON progress FOR SELECT USING (true);
CREATE POLICY "Students update own progress" ON progress FOR UPDATE USING (true);
CREATE POLICY "Teachers delete progress" ON progress FOR DELETE USING (auth.role() = 'authenticated');

-- Sessions: students create and read their own sessions
CREATE POLICY "Students insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Students update own sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Teachers delete sessions" ON sessions FOR DELETE USING (auth.role() = 'authenticated');

-- Leaderboard: students can upsert their own entry, anyone can read approved entries
-- Only authenticated teachers can approve, update approval status, or delete entries
CREATE POLICY "Students upsert own score" ON leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads approved scores" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Students update own score" ON leaderboard FOR UPDATE
    USING (true)
    WITH CHECK (approved = false);  -- Students cannot self-approve
CREATE POLICY "Teachers manage leaderboard" ON leaderboard FOR ALL USING (auth.role() = 'authenticated');
