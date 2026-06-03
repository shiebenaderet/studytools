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
function deepEqNot(name, got, notWant) {
  if (JSON.stringify(got) === JSON.stringify(notWant)) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  must differ from: ' + JSON.stringify(notWant));
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
// Edge: an empty plan still yields a claim row and a reasoning row (no evidence rows).
deepEq('row roles for empty plan', core.rowRolesFor([]), ['claim', 'reasoning']);
// Edge: three evidence pieces -> three evidence rows between claim and reasoning.
deepEq('row roles for 3-evidence plan', core.rowRolesFor([
  { role: 'claim', text: 'c' },
  { role: 'evidence', text: 'e1' }, { role: 'evidence', text: 'e2' }, { role: 'evidence', text: 'e3' },
  { role: 'reasoning', text: 'r' }
]), ['claim', 'evidence', 'evidence', 'evidence', 'reasoning']);

// isPlanComplete: every row has a correctly-roled piece.
// placements is an array aligned to rowRolesFor; each entry is the placed piece or null.
eq('incomplete when a row empty', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, null, {role:'reasoning'}]), false);
eq('complete when all rows correct', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, {role:'evidence'}, {role:'reasoning'}]), true);
eq('incomplete when a placement is wrong-role', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'reasoning'}, {role:'evidence'}, {role:'evidence'}]), false);
// Guard: placements shorter/longer than rowRoles is incomplete (length mismatch).
eq('incomplete when placements length mismatch', core.isPlanComplete(['claim'], []), false);
// Guard: a null placement is never a valid placement, so the plan is incomplete.
eq('incomplete when a placement is null', core.isPlanComplete(['claim'], [null]), false);

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

// Non-identity: the wizard seeds the scramble with the question index (a FIXED
// value per question), so a seed that returns the plan already in order would
// hand the student a pre-arranged answer. The scramble must never equal input
// order for a plan of 2+ distinct pieces. Check the 4-piece PLAN AND a 2-piece
// plan (the short plan is where the old LCG hit identity on every odd seed).
var planOrder = PLAN.map(function (p) { return p.text; });
for (var seed = 0; seed <= 9; seed++) {
  deepEqNot('4-piece scramble not identity for seed ' + seed,
    core.scramblePlan(PLAN, seed).map(function (p) { return p.text; }),
    planOrder);
}
var P2 = [{ role: 'claim', text: 'a' }, { role: 'reasoning', text: 'b' }];
var p2Order = P2.map(function (p) { return p.text; });
for (var seed2 = 0; seed2 <= 9; seed2++) {
  deepEqNot('2-piece scramble not identity for seed ' + seed2,
    core.scramblePlan(P2, seed2).map(function (p) { return p.text; }),
    p2Order);
}
// Still deterministic after the re-roll: same seed -> identical non-identity result.
deepEq('2-piece scramble deterministic for same seed',
  core.scramblePlan(P2, 1).map(function (p) { return p.text; }),
  core.scramblePlan(P2, 1).map(function (p) { return p.text; }));

// Length 0 and 1 can't differ from input, so identity is fine and must not loop.
deepEq('scramble of empty plan is empty', core.scramblePlan([], 0), []);
var solo = [{ role: 'claim', text: 'x' }];
deepEq('scramble of single-item plan returns the single item',
  core.scramblePlan(solo, 0).map(function (p) { return p.text; }), ['x']);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
