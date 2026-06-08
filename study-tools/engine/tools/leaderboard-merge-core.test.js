#!/usr/bin/env node
// Tests for the leaderboard never-shrink merge core.
//
// Bug (Tianyu, 2026-06-07): a student whose browser data was cleared logged
// back in. The 30s sync loop (and the on-every-save submitScore) computed his
// score from EMPTY localStorage — vocab 0, studyTime 0 — and blindly upserted
// 0/0/0 over his real cloud leaderboard row (civil-war: 1739 pts), erasing his
// first-place standing. Root cause: submitScore had no floor against the
// existing DB row; it trusted localStorage to always be >= cloud, which is
// false on a cleared/unhydrated device. This core centralizes the
// "merge the freshly-computed row with the existing DB row, never shrinking a
// cumulative metric" decision so the write boundary is authoritatively safe
// regardless of localStorage state.
var core = require('./leaderboard-merge-core.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) {
    failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
  }
}
function deep(name, got, want) {
  eq(name, JSON.stringify(got), JSON.stringify(want));
}

// ── The Tianyu scenario: empty incoming over a rich existing row ──
// A cleared-device submit computes all-zero metrics. The merge must keep the
// existing high-water values — the write must NOT shrink the row.
deep('empty incoming never shrinks existing', core.mergeLeaderboardRow(
  { score: 0, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: null, map_bonus: 0 },
  { score: 1739, vocab_mastered: 47, best_test_score: 100, study_time_seconds: 15766, map_best_time: 42, map_bonus: 238 }
), { score: 1739, vocab_mastered: 47, best_test_score: 100, study_time_seconds: 15766, map_best_time: 42, map_bonus: 238 });

// ── No existing row (first ever submit): take incoming as-is ──
deep('no existing row takes incoming', core.mergeLeaderboardRow(
  { score: 120, vocab_mastered: 8, best_test_score: 90, study_time_seconds: 600, map_best_time: 55, map_bonus: 225 },
  null
), { score: 120, vocab_mastered: 8, best_test_score: 90, study_time_seconds: 600, map_best_time: 55, map_bonus: 225 });

// ── Genuine progress: incoming higher than existing → take the higher values ──
deep('real progress raises each metric', core.mergeLeaderboardRow(
  { score: 200, vocab_mastered: 12, best_test_score: 95, study_time_seconds: 900, map_best_time: 40, map_bonus: 240 },
  { score: 150, vocab_mastered: 10, best_test_score: 80, study_time_seconds: 800, map_best_time: 50, map_bonus: 230 }
), { score: 200, vocab_mastered: 12, best_test_score: 95, study_time_seconds: 900, map_best_time: 40, map_bonus: 240 });

// ── Mixed: some metrics up, some (spuriously) down → each takes its own max ──
// Score went up (more vocab) but study_time came in lower because that field
// wasn't hydrated yet. Each metric floors independently.
deep('each metric floors independently', core.mergeLeaderboardRow(
  { score: 210, vocab_mastered: 13, best_test_score: 70, study_time_seconds: 0, map_best_time: null, map_bonus: 0 },
  { score: 150, vocab_mastered: 10, best_test_score: 95, study_time_seconds: 800, map_best_time: 50, map_bonus: 230 }
), { score: 210, vocab_mastered: 13, best_test_score: 95, study_time_seconds: 800, map_best_time: 50, map_bonus: 230 });

// ── map_best_time uses MIN (lower time is better), not max ──
// Existing 50s, incoming faster 40s → keep 40. Existing 40s, incoming slower
// 50s → keep 40.
deep('map_best_time keeps the faster (lower) time', core.mergeLeaderboardRow(
  { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 40, map_bonus: 240 },
  { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 50, map_bonus: 230 }
), { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 40, map_bonus: 240 });
deep('map_best_time ignores a slower incoming time', core.mergeLeaderboardRow(
  { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 70, map_bonus: 110 },
  { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 40, map_bonus: 240 }
), { score: 10, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: 40, map_bonus: 240 });

// ── best_test_score: null incoming must not overwrite a real existing score ──
eq('null best_test_score keeps existing', core.mergeLeaderboardRow(
  { score: 0, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: null, map_bonus: 0 },
  { score: 100, vocab_mastered: 5, best_test_score: 88, study_time_seconds: 100, map_best_time: null, map_bonus: 0 }
).best_test_score, 88);
// ── best_test_score: real incoming over null existing → take incoming ──
eq('real best_test_score over null existing', core.mergeLeaderboardRow(
  { score: 100, vocab_mastered: 5, best_test_score: 88, study_time_seconds: 100, map_best_time: null, map_bonus: 0 },
  { score: 100, vocab_mastered: 5, best_test_score: null, study_time_seconds: 100, map_best_time: null, map_bonus: 0 }
).best_test_score, 88);

// ── map_best_time: both null stays null ──
eq('both map_best_time null stays null', core.mergeLeaderboardRow(
  { score: 5, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: null, map_bonus: 0 },
  { score: 5, vocab_mastered: 0, best_test_score: null, study_time_seconds: 0, map_best_time: null, map_bonus: 0 }
).map_best_time, null);

// ── resolveExisting: the read-error guard ──
// The whole never-shrink floor depends on actually reading the existing row.
// If the SELECT errored we must NOT write — otherwise a cleared device whose
// incoming row is 0/0/0 re-zeroes the real cloud row on a network blip (the
// Tianyu bug, re-triggered). Skipping is safe: submitScore retries on the next
// save and every 30s.

// Read error → do not proceed (skip the write entirely).
eq('read error skips the write', core.resolveExisting({ data: null, error: { message: 'network' } }).proceed, false);
eq('read error yields null existing', core.resolveExisting({ data: { score: 1739 }, error: { message: 'boom' } }).existing, null);

// Genuine no-row (maybeSingle returns data:null, error:null) → proceed, insert incoming.
eq('genuine no-row proceeds', core.resolveExisting({ data: null, error: null }).proceed, true);
eq('genuine no-row existing is null', core.resolveExisting({ data: null, error: null }).existing, null);

// Row found → proceed with that row as the floor.
var foundRes = core.resolveExisting({ data: { score: 1739, vocab_mastered: 47 }, error: null });
eq('row found proceeds', foundRes.proceed, true);
eq('row found returns the row', foundRes.existing.score, 1739);

// Missing/undefined result object → treat as no-row, proceed (don't block a new student).
eq('undefined result proceeds', core.resolveExisting(undefined).proceed, true);
eq('undefined result existing null', core.resolveExisting(undefined).existing, null);

// End-to-end of the safe path: read error means we never even call mergeLeaderboardRow,
// so the real row is untouched. (Documents the intended wiring.)
eq('blip path never writes (proceed=false)', core.resolveExisting({ error: { code: 'PGRST000' } }).proceed, false);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
