#!/usr/bin/env node
// Tests for the response-builder wizard's pure decision logic (Step 4 CER plan).
var core = require('./response-builder-core.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
function deepEq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}

var PLAN = [
  { role: 'claim',     text: 'Geography pushed the regions apart.' },
  { role: 'evidence',  text: 'The North built factories.' },
  { role: 'evidence',  text: 'The South built plantations.' },
  { role: 'reasoning', text: 'So the two regions grew into different societies.' }
];

// checkPlacement: a piece matches a row when its role equals the row's role.
eq('claim into claim row', core.checkPlacement({ role: 'claim' }, 'claim'), true);
eq('claim into evidence row', core.checkPlacement({ role: 'claim' }, 'evidence'), false);
eq('evidence into evidence row', core.checkPlacement({ role: 'evidence' }, 'evidence'), true);
eq('evidence into reasoning row', core.checkPlacement({ role: 'evidence' }, 'reasoning'), false);
eq('reasoning into reasoning row', core.checkPlacement({ role: 'reasoning' }, 'reasoning'), true);

// rowRolesFor: the ordered list of row roles, one evidence row per evidence piece.
deepEq('row roles for 2-evidence plan', core.rowRolesFor(PLAN), ['claim', 'evidence', 'evidence', 'reasoning']);
deepEq('row roles for 1-evidence plan', core.rowRolesFor([
  { role: 'claim', text: 'c' }, { role: 'evidence', text: 'e' }, { role: 'reasoning', text: 'r' }
]), ['claim', 'evidence', 'reasoning']);

// isPlanComplete: every row has a correctly-roled piece.
// placements is an array aligned to rowRolesFor; each entry is the placed piece or null.
eq('incomplete when a row empty', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, null, {role:'reasoning'}]), false);
eq('complete when all rows correct', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, {role:'evidence'}, {role:'reasoning'}]), true);
eq('incomplete when a placement is wrong-role', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'reasoning'}, {role:'evidence'}, {role:'evidence'}]), false);

// roleCoaching: returns non-empty copy for each real role, '' for unknown.
eq('coaching claim non-empty', core.roleCoaching('claim').length > 0, true);
eq('coaching evidence non-empty', core.roleCoaching('evidence').length > 0, true);
eq('coaching reasoning non-empty', core.roleCoaching('reasoning').length > 0, true);
eq('coaching unknown empty', core.roleCoaching('nonsense'), '');

// scramblePlan: deterministic given a seed, returns a permutation (same multiset).
var s1 = core.scramblePlan(PLAN, 0);
eq('scramble length', s1.length, PLAN.length);
deepEq('scramble is a permutation',
  s1.map(function (p) { return p.text; }).sort(),
  PLAN.map(function (p) { return p.text; }).sort());
deepEq('scramble deterministic for same seed',
  core.scramblePlan(PLAN, 3).map(function (p) { return p.text; }),
  core.scramblePlan(PLAN, 3).map(function (p) { return p.text; }));

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
