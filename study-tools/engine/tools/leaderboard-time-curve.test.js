#!/usr/bin/env node
// Tests for the leaderboard study-time points curve (LeaderboardManager.calculateTimePts).
//
// Why this test exists (Felynne, 2026-06-09): a top student reported that 7+ hours
// of real studying barely moved her leaderboard score. Root cause was NOT a bug —
// her vocab (47/47), test (100), and consistency (30 days, capped at 20) were all
// maxed, so study time was her only growing lever, and the curve gave just
// 0.1 pt/min after 2 hours. Across many short capped sessions that rounds to
// nothing visible. Fix: lift the post-2h rate to 0.25 pt/min so long-haul,
// genuinely-active study (idle time is already excluded by ActivityTimer, and
// each activity is daily-capped) keeps earning a noticeable trickle.
//
// calculateTimePts is a method on the LeaderboardManager object literal in
// js/core/leaderboard.js. To exercise the REAL shipped arithmetic (not a copy
// that could drift), we load that source in a minimal sandbox that stubs its
// browser globals, then call the actual method. No eval / new Function.
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var src = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'leaderboard.js'), 'utf8');

// leaderboard.js declares `var LeaderboardManager = {...}` and references a few
// browser/app globals (ProgressManager, StudyEngine, document, etc.). We never
// call the methods that touch them — only the pure calculateTimePts — but the
// file must parse and run its top-level declaration, so provide harmless stubs.
var sandbox = {
  ProgressManager: {}, StudyEngine: {}, StudyUtils: {}, AchievementManager: {},
  LeaderboardMergeCore: {}, document: {}, window: {}, console: console
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'leaderboard.js' });

var LeaderboardManager = sandbox.LeaderboardManager;
if (!LeaderboardManager || typeof LeaderboardManager.calculateTimePts !== 'function') {
  console.log('FAIL: could not load LeaderboardManager.calculateTimePts from leaderboard.js');
  process.exit(1);
}
var calculateTimePts = function (secs) { return LeaderboardManager.calculateTimePts(secs); };

var failures = [];
function eq(name, got, want) {
  if (got !== want) {
    failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
  }
}
var min = function (n) { return n * 60; }; // minutes -> seconds

// ── The first two hours are UNCHANGED — kids early in a unit see no surprise ──
eq('0 min = 0 pts', calculateTimePts(min(0)), 0);
eq('30 min = 30 pts (1 pt/min tier)', calculateTimePts(min(30)), 30);
eq('60 min = 45 pts (0.5 pt/min tier)', calculateTimePts(min(60)), 45);
eq('90 min = 52 pts (mid 0.25 tier)', calculateTimePts(min(90)), 45 + Math.floor(30 * 0.25)); // 52
eq('120 min = 60 pts (0.25 pt/min tier ends here)', calculateTimePts(min(120)), 60);

// ── The post-2h tail is now 0.25 pt/min (was 0.1) — the actual fix ──
// 60 base at 120 min, then +0.25/min.
eq('180 min = 75 pts (60 + 60*0.25)', calculateTimePts(min(180)), 60 + Math.floor(60 * 0.25)); // 75
eq('240 min = 90 pts (60 + 120*0.25)', calculateTimePts(min(240)), 60 + Math.floor(120 * 0.25)); // 90
eq('436 min (Felynne) = 139 pts', calculateTimePts(min(436)), 60 + Math.floor(316 * 0.25)); // 139
eq('600 min = 180 pts', calculateTimePts(min(600)), 60 + Math.floor(480 * 0.25)); // 180

// ── Still diminishing: the post-2h per-minute rate must not exceed the prior
// tier's rate, so mastering vocab (10 pts/term) always out-earns grinding
// minutes. Sample a 1-minute step inside the tail (0.25/min rounds to 0 or 1
// per single minute, never more).
var rateTail = calculateTimePts(min(240)) - calculateTimePts(min(239));
eq('tail per-minute step stays in [0,1]', rateTail >= 0 && rateTail <= 1, true);

// Monotonic non-decreasing across the seam at 120 min and into the tail.
eq('121 min >= 120 min', calculateTimePts(min(121)) >= calculateTimePts(min(120)), true);
eq('300 min >= 240 min', calculateTimePts(min(300)) >= calculateTimePts(min(240)), true);

// ── Guards: null/garbage input never throws, yields 0 ──
eq('null seconds = 0', calculateTimePts(null), 0);
eq('undefined seconds = 0', calculateTimePts(undefined), 0);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
