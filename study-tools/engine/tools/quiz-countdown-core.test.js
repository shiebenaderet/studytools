#!/usr/bin/env node
// Tests for quiz-countdown-core.js: the quiz date note on the unit home screen.
var core = require('./quiz-countdown-core.js');

var failures = [];
function eq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}

var oct13 = new Date(2026, 9, 13, 8, 0);
eq('days ahead', core.daysUntil('2026-11-12', oct13), 30);
eq('late at night still counts the calendar day', core.daysUntil('2026-11-12', new Date(2026, 9, 13, 23, 59)), 30);
eq('across the November clock change', core.daysUntil('2026-11-12', new Date(2026, 10, 1, 12, 0)), 11);
eq('bad date', core.daysUntil('Nov 12', oct13), null);
eq('impossible date', core.daysUntil('2026-02-30', oct13), null);

eq('countdown', core.describe('2026-11-12', null, oct13), { date: 'Quiz: Thu, Nov 12', countdown: '30 days to go', days: 30 });
eq('custom label', core.describe('2026-11-12', 'Unit Test', oct13).date, 'Unit Test: Thu, Nov 12');
eq('tomorrow', core.describe('2026-11-12', null, new Date(2026, 10, 11, 15, 0)).countdown, 'tomorrow');
eq('today', core.describe('2026-11-12', null, new Date(2026, 10, 12, 7, 0)).countdown, 'today. Good luck!');
eq('gone after the quiz', core.describe('2026-11-12', null, new Date(2026, 10, 13, 0, 1)), null);
eq('no date', core.describe(undefined, null, oct13), null);

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('quiz-countdown-core: all tests passed');
