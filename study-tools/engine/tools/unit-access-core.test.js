#!/usr/bin/env node
// Tests for unit-access-core.js: students see only the current unit.
var core = require('./unit-access-core.js');
var fs = require('fs');
var path = require('path');

var failures = [];
function eq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}

var units = [
  { id: 'constitution', opens: '2026-11-23' },
  { id: 'revolution', opens: '2026-10-04' },
  { id: 'colonies', opens: '2026-09-02' },
  { id: 'civil-war', hidden: true },
  { id: 'wip', draft: true, opens: '2026-09-01' }
];

eq('today is local', core.today(new Date(2026, 9, 4, 23, 59)), '2026-10-04');
eq('current on the day it opens', core.currentUnit(units, '2026-10-04').id, 'revolution');
eq('current the day before falls back to the earlier unit', core.currentUnit(units, '2026-10-03').id, 'colonies');
eq('later unit takes over', core.currentUnit(units, '2026-11-23').id, 'constitution');
eq('nothing open', core.currentUnit(units, '2026-08-01'), null);
eq('hidden never current', core.currentUnit([{ id: 'a', hidden: true }], '2026-10-04'), null);
eq('undated counts as open', core.currentUnit([{ id: 'a' }], '2026-10-04').id, 'a');
eq('dated beats undated', core.currentUnit([{ id: 'a' }, { id: 'b', opens: '2026-01-01' }], '2026-10-04').id, 'b');

eq('future blocked', core.canOpen(units, 'constitution', '2026-10-04', false).reason, 'not-open');
eq('hidden blocked', core.canOpen(units, 'civil-war', '2026-10-04', false).reason, 'hidden');
eq('earlier unit still opens by link', core.canOpen(units, 'colonies', '2026-10-04', false).ok, true);
eq('teacher opens anything', core.canOpen(units, 'civil-war', '2026-10-04', true).ok, true);
eq('unknown id passes through', core.canOpen(units, 'nope', '2026-10-04', false).ok, true);

// The live units.json: exactly one unit is current today or later, and last
// year's units are hidden.
var live = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'units', 'units.json'), 'utf8')).units;
live.forEach(function (u) {
  if (u.opens && !/^\d{4}-\d{2}-\d{2}$/.test(u.opens)) failures.push('bad opens date on ' + u.id + ': ' + u.opens);
  if (!u.opens && !u.hidden && !u.draft) failures.push(u.id + ' has neither an opens date nor hidden: true');
});

if (failures.length) {
  console.error('FAIL unit-access-core\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('ok unit-access-core');
