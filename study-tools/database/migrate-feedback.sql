-- Feedback table: students submit bugs and suggestions; teachers read them.
-- Denormalized student/class names so feedback survives student deletion (audit value).

CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id) ON DELETE SET NULL,
    student_name text,
    class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
    class_code text,
    class_name text,
    type text NOT NULL CHECK (type IN ('bug','suggestion')),
    description text NOT NULL,
    context text,
    activity text,
    unit_id text,
    app_version text,
    created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including guest mode) can submit feedback.
CREATE POLICY "Anyone can submit feedback" ON feedback FOR INSERT WITH CHECK (true);

-- Only authenticated teachers can read or manage entries.
CREATE POLICY "Teachers read feedback" ON feedback FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers update feedback" ON feedback FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Teachers delete feedback" ON feedback FOR DELETE USING (auth.role() = 'authenticated');
