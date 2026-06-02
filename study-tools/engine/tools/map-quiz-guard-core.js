// Re-entrancy guard for the map-quiz activities.
//
// Bug (Tianyu, 2026-05-30): spam-clicking the correct answer during the
// post-answer feedback window scored it multiple times and advanced the quiz
// by N, auto-marking the skipped questions correct. The click handler reacts
// immediately, but the quiz only advances inside a delayed setTimeout, so every
// extra click in that window is processed against the same still-current
// question. These pure predicates centralize the "is this a fresh click or a
// re-entrant spam click?" decision so every handler variant shares one tested
// rule instead of re-implementing it.
(function () {
  var api = {};

  // Flag-based guard for the queue-index maps (civil-war-map, fifty-states-map).
  // They have no per-element "already answered" marker on the target until the
  // advance timeout fires, so they carry an explicit boolean lock that is set on
  // the first valid click and cleared when the next question renders.
  //   state.locked   — true while a feedback window is pending (default false)
  //   state.finished — true once the quiz has run past its last question
  api.shouldProcessClick = function (state) {
    state = state || {};
    if (state.finished) return false;
    if (state.locked) return false;
    return true;
  };

  // Already-answered guard for map-quiz.js. It marks a region answered
  // synchronously (mq-correct class + _answeredIds) the instant it's clicked
  // correctly, before the advance timeout. So a re-entrant correct-spam click
  // lands on an already-answered region — we treat that as the lock.
  //   state.targetId    — id of the region currently being asked (null between
  //                       questions or when the quiz is over)
  //   state.answeredIds — ids already scored (default empty)
  api.shouldProcessRegionClick = function (state) {
    state = state || {};
    if (!state.targetId) return false;
    var answered = state.answeredIds || [];
    return answered.indexOf(state.targetId) === -1;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MapQuizGuard = api;
})();
