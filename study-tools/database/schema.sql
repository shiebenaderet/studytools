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

-- Row Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read own data" ON students FOR SELECT USING (true);
CREATE POLICY "Students manage own progress" ON progress FOR ALL USING (true);
CREATE POLICY "Students manage own sessions" ON sessions FOR ALL USING (true);
