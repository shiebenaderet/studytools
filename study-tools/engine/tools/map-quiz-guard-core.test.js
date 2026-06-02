#!/usr/bin/env node
// Tests for the map-quiz re-entrancy guard core.
// Bug (Tianyu, 2026-05-30): spam-clicking the correct answer during the
// post-answer feedback window scored it multiple times AND advanced the quiz
// by N, auto-marking the skipped questions. Root cause: the click handler
// reacts immediately but the question only advances inside a delayed
// setTimeout — so every click in that window is processed against the same
// still-current question. This core centralizes the "should this click be
// processed, or is it a re-entrant spam click?" decision so all five handler
// variants share one tested truth.
var core = require('./map-quiz-guard-core.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) {
    failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
  }
}

// ── shouldProcessClick: the flag-based guard (used by the two _quizIndex maps) ──
// First valid click while unlocked → process it.
eq('unlocked click processes', core.shouldProcessClick({ locked: false }), true);
// Any click while locked (feedback window pending) → ignore it.
eq('locked click ignored', core.shouldProcessClick({ locked: true }), false);
// A finished quiz (index past the end) never processes, even if unlocked.
eq('finished quiz ignored', core.shouldProcessClick({ locked: false, finished: true }), false);
// Locked AND finished → still ignored.
eq('locked+finished ignored', core.shouldProcessClick({ locked: true, finished: true }), false);
// Missing flags default to "not locked, not finished" → process.
eq('empty state processes', core.shouldProcessClick({}), true);

// ── shouldProcessRegionClick: the already-answered guard (used by map-quiz.js) ──
// map-quiz marks a region answered synchronously (mq-correct / _answeredIds)
// the instant it's clicked correctly, BEFORE the advance timeout. So a
// re-entrant correct-spam click lands on an already-answered region. We use
// that as the lock: a click whose CORRECT target was already answered is a
// re-entrant spam click and must not re-score or re-advance.
// Fresh correct target, not yet answered → process.
eq('fresh region processes', core.shouldProcessRegionClick({ answeredIds: [], targetId: 'va' }), true);
// The current target was already answered (re-entrant correct spam) → ignore.
eq('answered target ignored', core.shouldProcessRegionClick({ answeredIds: ['va'], targetId: 'va' }), false);
// Other regions answered but this target fresh → process.
eq('other answered, target fresh processes', core.shouldProcessRegionClick({ answeredIds: ['nc', 'sc'], targetId: 'va' }), true);
// No current target (between questions / quiz over) → ignore.
eq('no target ignored', core.shouldProcessRegionClick({ answeredIds: [], targetId: null }), false);
// Missing answeredIds defaults to empty → fresh target processes.
eq('missing answeredIds processes', core.shouldProcessRegionClick({ targetId: 'va' }), true);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
