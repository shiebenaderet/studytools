# Leaderboard Redesign: Score Explanation, Map Bonus, Map Speed Run

**Date:** 2026-03-10
**Status:** Approved

## Problem

1. Students see "X pts" on the leaderboard with no explanation of how points are earned
2. Map quiz tracks best time locally but it doesn't factor into the leaderboard
3. No competitive incentive for map quiz speed

## Design

### Score Formula

```
score = (vocab_mastered x 10) + best_test_score + study_minutes + map_bonus
map_bonus = map_best_time ? max(0, 180 - map_best_time) : 0
```

- Only 100% perfect map runs record a `map_best_time`
- Bonus caps at 180 points (instant completion) and reaches 0 at 3 minutes
- Current max without map is ~500 pts; map bonus adds up to ~35% boost

### Database Migration

Add two columns to the `leaderboard` table:

```sql
ALTER TABLE leaderboard ADD COLUMN map_best_time integer;
ALTER TABLE leaderboard ADD COLUMN map_bonus integer NOT NULL DEFAULT 0;
```

`map_best_time` is nullable (null = no perfect run). `map_bonus` defaults to 0.

### Leaderboard Tabs

**Before:** Top Students | Class Battle | Achievements
**After:** Top Students | Map Speed Run | Class Battle | Achievements

### Top Students Tab Changes

- Score explanation line above rankings: "Vocab (x10) + Test Score + Study Min + Map Bonus = Total"
- Add "Map" stat in each row showing bonus points or "-"

### Map Speed Run Tab (New)

- Query: `leaderboard` where `map_best_time IS NOT NULL` and `approved = true`, sorted by `map_best_time ASC`
- Display: Rank, Name, Time (formatted M:SS), Bonus Points
- Podium for top 3 showing time instead of score
- Empty state: "No perfect map runs yet. Get 100% to post your time!"

### Data Flow

1. **Map quiz `_endGame()`** — on 100% score, call `LeaderboardManager.submitMapTime(elapsed)` which upserts `map_best_time` (keeping the faster time) and recalculates `map_bonus`
2. **`LeaderboardManager.submitScore()`** — reads map progress from localStorage, computes `map_bonus`, includes `map_best_time` and `map_bonus` in upsert
3. **`beforeunload` handler** — existing keepalive fetch payload gets the two new fields
4. **Teacher dashboard** — scores table gets a Map Time column

### What Doesn't Change

- Teacher approval flow (same `approved` flag covers map entries)
- Class Battle (uses aggregate scores, map bonus included automatically)
- Achievement system
- Map quiz gameplay and local progress tracking
