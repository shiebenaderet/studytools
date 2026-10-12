-- Maddy's Madness board: 13 Colonies speed-run times in tenths of a second.
-- Run this in Supabase SQL Editor. Until it runs, the Madness tab shows
-- "not available yet" and everything else on the leaderboard works as before.
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS madness_best_time numeric(5,1);
