-- Leaderboard Snapshots: daily score history for replay/rewind
-- Run this in Supabase SQL Editor

-- 1. Create snapshots table
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date date NOT NULL,
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    unit_id text NOT NULL,
    score integer NOT NULL DEFAULT 0,
    class_id uuid REFERENCES classes(id),
    created_at timestamp DEFAULT now(),
    UNIQUE(snapshot_date, student_id, unit_id)
);

CREATE INDEX idx_snapshots_date ON leaderboard_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_unit_date ON leaderboard_snapshots(unit_id, snapshot_date);

-- 2. RLS policies
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read snapshots" ON leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Teachers manage snapshots" ON leaderboard_snapshots FOR ALL USING (auth.role() = 'authenticated');

-- 3. Function to take a daily snapshot (copies current leaderboard scores)
CREATE OR REPLACE FUNCTION take_leaderboard_snapshot()
RETURNS void AS $$
BEGIN
    INSERT INTO leaderboard_snapshots (snapshot_date, student_id, unit_id, score, class_id)
    SELECT
        CURRENT_DATE,
        l.student_id,
        l.unit_id,
        l.score,
        s.class_id
    FROM leaderboard l
    JOIN students s ON s.id = l.student_id
    WHERE l.approved = true
    ON CONFLICT (snapshot_date, student_id, unit_id)
    DO UPDATE SET score = EXCLUDED.score, class_id = EXCLUDED.class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Seed yesterday's snapshot from current data
INSERT INTO leaderboard_snapshots (snapshot_date, student_id, unit_id, score, class_id)
SELECT
    CURRENT_DATE - INTERVAL '1 day',
    l.student_id,
    l.unit_id,
    l.score,
    s.class_id
FROM leaderboard l
JOIN students s ON s.id = l.student_id
WHERE l.approved = true
ON CONFLICT (snapshot_date, student_id, unit_id) DO NOTHING;

-- 5. Take today's snapshot too
SELECT take_leaderboard_snapshot();

-- IMPORTANT: Set up a Supabase cron job to run daily at midnight:
-- In Supabase Dashboard > Database > Extensions, enable pg_cron
-- Then run:
-- SELECT cron.schedule('daily-leaderboard-snapshot', '0 5 * * *', 'SELECT take_leaderboard_snapshot()');
-- (runs at 5 AM UTC daily)
