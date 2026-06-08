// Never-shrink merge for the leaderboard write boundary.
//
// Bug (Tianyu, 2026-06-07): a cleared-device login made submitScore compute a
// row from EMPTY localStorage (vocab 0, studyTime 0) and blindly upsert 0/0/0
// over the student's real cloud row (civil-war: 1739 pts), erasing first place.
// Root cause: submitScore trusted localStorage to always be >= the cloud row,
// which is false on a cleared or not-yet-hydrated device.
//
// This pure function is the floor: given the freshly-computed row and the row
// currently in the DB, it returns a row that never shrinks a cumulative metric.
// submitScore calls it after fetching the existing row, so a write can only
// ever raise (or hold) a student's standing — never silently zero it.
//
// Cumulative metrics take the MAX (score, vocab_mastered, best_test_score,
// study_time_seconds, map_bonus). map_best_time takes the MIN (a faster run is
// better). null is treated as "no value": it never overwrites a real value, and
// a real value always wins over null.
(function () {
  var api = {};

  // max that treats null/undefined as absent (so null never beats a number).
  function maxDefined(a, b) {
    if (a === null || a === undefined) return (b === null || b === undefined) ? null : b;
    if (b === null || b === undefined) return a;
    return a > b ? a : b;
  }

  // min that treats null/undefined as absent — used for times where lower wins.
  function minDefined(a, b) {
    if (a === null || a === undefined) return (b === null || b === undefined) ? null : b;
    if (b === null || b === undefined) return a;
    return a < b ? a : b;
  }

  // incoming: the row submitScore just computed from localStorage.
  // existing: the row currently in the DB (or null if none exists yet).
  // Returns the row that is safe to upsert — never shrinking a cumulative metric.
  api.mergeLeaderboardRow = function (incoming, existing) {
    incoming = incoming || {};
    if (!existing) {
      return {
        score: incoming.score || 0,
        vocab_mastered: incoming.vocab_mastered || 0,
        best_test_score: (incoming.best_test_score === undefined ? null : incoming.best_test_score),
        study_time_seconds: incoming.study_time_seconds || 0,
        map_best_time: (incoming.map_best_time === undefined ? null : incoming.map_best_time),
        map_bonus: incoming.map_bonus || 0
      };
    }
    return {
      score: maxDefined(incoming.score || 0, existing.score || 0),
      vocab_mastered: maxDefined(incoming.vocab_mastered || 0, existing.vocab_mastered || 0),
      best_test_score: maxDefined(incoming.best_test_score, existing.best_test_score),
      study_time_seconds: maxDefined(incoming.study_time_seconds || 0, existing.study_time_seconds || 0),
      map_best_time: minDefined(incoming.map_best_time, existing.map_best_time),
      map_bonus: maxDefined(incoming.map_bonus || 0, existing.map_bonus || 0)
    };
  };

  // Decide whether submitScore may safely write, given the result of the
  // "fetch existing row" SELECT. The never-shrink floor only holds if we could
  // actually READ the existing row. If the read FAILED we cannot prove the
  // write wouldn't shrink the row — so on a cleared/unhydrated device (incoming
  // is 0/0/0) a blind upsert would re-zero a real cloud row exactly like the
  // original Tianyu bug, now triggered by a network blip. So:
  //   - read error  -> skip the write (submitScore runs again on next save/30s)
  //   - genuine no-row (data null, no error) -> proceed; merge inserts incoming
  //   - row found -> proceed; merge floors against it
  // supabase-js .maybeSingle() returns {data:null, error:null} for a true
  // zero-row match, so "no row" and "read failed" are distinguishable.
  // Returns { proceed, existing }.
  api.resolveExisting = function (existingRes) {
    if (existingRes && existingRes.error) {
      return { proceed: false, existing: null };
    }
    var existing = existingRes ? existingRes.data : null;
    return { proceed: true, existing: existing || null };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LeaderboardMergeCore = api;
})();
