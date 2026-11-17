#!/usr/bin/env node
// Tests for nudge-core.js: the nudge log and toast timing.
// Run: node study-tools/engine/tools/nudge-core.test.js
var core = require('./nudge-core.js');

var failures = [];
function eq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}
function at(d, h, m) { return new Date(2026, 10, d, h, m || 0).getTime(); }

eq('short toast still 5 s', core.toastDuration('Hi'), 5000);
eq('150 characters gets 10 s', core.toastDuration(new Array(151).join('x')), 10000);
eq('very long toast capped at 15 s', core.toastDuration(new Array(1000).join('x')), 15000);

var log = {};
eq('first showing counts', core.markShown(log, 'learn-first', 'learn-mode', at(16, 9)), true);
eq('second showing the same day does not', core.markShown(log, 'learn-first', 'learn-mode', at(16, 20)), false);
eq('shown today', core.shownToday(log, 'learn-first', at(16, 23, 59)), true);
eq('not shown today the next morning', core.shownToday(log, 'learn-first', at(17, 0, 1)), false);
eq('follow within the window', core.followedBy(log, 'learn-mode', at(16, 9, 10)), ['learn-first']);
eq('no follow after the window', core.followedBy(log, 'learn-mode', at(16, 9, 20)), []);
eq('no follow for another activity', core.followedBy(log, 'wordle', at(16, 9, 5)), []);
eq('follow counts', core.markFollowed(log, 'learn-first', at(16, 9, 10)), true);
eq('follow counts once per showing', core.markFollowed(log, 'learn-first', at(16, 9, 11)), false);
eq('no second follow match', core.followedBy(log, 'learn-mode', at(16, 9, 12)), []);
core.markShown(log, 'learn-first', 'learn-mode', at(17, 9));
eq('next day counts again', [log['learn-first'].shown, core.markFollowed(log, 'learn-first', at(17, 9, 1)), log['learn-first'].followed], [2, true, 2]);
eq('unknown nudge cannot be followed', core.markFollowed(log, 'nope', at(17, 9)), false);
core.markShown(log, 'card-read', null, at(17, 9));
eq('card has no target', 'target' in log['card-read'], false);

var sum = core.summarize([
  { student_id: 'a', data: { 'learn-first': { shown: 4, followed: 1 }, 'card-read': { shown: 2, followed: 2 } } },
  { student_id: 'b', data: { 'learn-first': { shown: 6, followed: 2 }, 'zz-new': { shown: 1, followed: 9 } } },
  { student_id: 'c', data: null }
]);
eq('summary order, counts, rates and capped follows', sum.map(function (s) { return [s.id, s.students, s.shown, s.followed, s.rate]; }), [
  ['card-read', 1, 2, 2, 100], ['learn-first', 2, 10, 3, 30], ['zz-new', 1, 1, 1, 100]]);
eq('summary names', sum[1].name, 'Toast: Start with Learn Mode');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('nudge-core: all tests passed');
