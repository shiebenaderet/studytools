-- Add map quiz columns to leaderboard
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS map_best_time integer;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS map_bonus integer NOT NULL DEFAULT 0;
