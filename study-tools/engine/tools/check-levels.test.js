#!/usr/bin/env node
// Tests for check-levels.js: textbook reading level names match what the text
// measures at (docs/READING-LEVELS.md). Also runs the check on every unit.
var lv = require('./check-levels.js');

var failures = [];
function eq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}
function ok(name, cond) { if (!cond) failures.push(name); }

// The shared measure, so a copy that drifts from the other repos shows up here.
eq('short word', lv.syllables('the'), 1);
eq('silent e', lv.syllables('little'), 2);
eq('final -ed dropped', lv.syllables('repealed'), 2);
eq('history word', lv.syllables('Massachusetts'), 4);
eq('limits', lv.LEVEL_LIMITS, { Quick: 5.0, Clear: 7.5, Full: 10.5 });
eq('blurb', lv.LEVEL_BLURBS.Full, 'The grade-level reading.');
eq('glosses and tags ignored', lv.fkGrade('<p>The cat sat on the mat (a small rug). The dog ran to the cat.</p>').grade.toFixed(2),
  lv.fkGrade('The cat sat on the mat. The dog ran to the cat.').grade.toFixed(2));

eq('band: Quick', lv.bandFor(4.9), 'Quick');
eq('band: Clear at its limit', lv.bandFor(7.5), 'Clear');
eq('band: Full', lv.bandFor(8.4), 'Full');
eq('band: above Full', lv.bandFor(10.6), 'Deep');

var easy = '<p>The war was long. Many men went to fight. Some did not come home.</p>';                       // about -1
var clear = '<p>The North had more factories and railroads than the Southern states. Those railroads carried food, uniforms and weapons to Union armies.</p>'; // about 6.5
var mid = '<p>Abraham Lincoln believed the country could not last forever half slave and half free. His election in 1860 convinced many Southern leaders to leave the Union.</p>'; // about 7.7
var hard = '<p>Historians still argue about whether arguments over federal power, rather than economic differences, caused secession. Many Americans at the time described the conflict as an unavoidable confrontation between two incompatible societies.</p>'; // about 17
function unit(_levels, texts) {
  return [{ sections: [{ content: texts }] }];
}

var named = { a: { label: 'Clear', description: 'Plain words, a little more detail.' }, b: { label: 'Full', description: 'The grade-level reading.' }, c: { label: 'Deep', description: 'Adds real quotes from the time and what historians argue.' } };
var r = lv.checkLevels('t', named, unit(named, { a: clear, b: mid, c: hard }));
eq('named in order: no errors', r.errors, []);
eq('canonical blurbs: no warnings', r.warnings, []);

r = lv.checkLevels('t', { a: { label: 'Quick' }, b: { label: 'Full' } }, unit(null, { a: hard, b: mid }));
ok('Quick on hard text fails its limit', r.errors.some(function(e) { return /Quick measures/.test(e); }));
ok('and fails stepping', r.errors.some(function(e) { return /does not measure harder/.test(e); }));

r = lv.checkLevels('t', { a: { label: 'Clear' }, b: { label: 'Deep' } }, unit(null, { a: easy, b: mid }));
ok('Clear on Quick-range text reads as Quick', r.errors.some(function(e) { return /reads as Quick/.test(e); }));
ok('Deep on Full-range text reads as Full', r.errors.some(function(e) { return /reads as Full/.test(e); }));

r = lv.checkLevels('t', { a: { label: 'Easier' }, b: { label: 'Full' } }, unit(null, { a: easy, b: mid }));
ok('mixed labels fail', r.errors.some(function(e) { return /mixes/.test(e); }));

r = lv.checkLevels('t', null, unit(null, { simplified: mid, standard: hard, advanced: hard }));
eq('old labels are reported, not failed', r.errors, []);
ok('old labels with no clean names get a note', /no clean names/.test(r.notes[0]));
r = lv.checkLevels('t', null, unit(null, { simplified: easy, standard: mid, advanced: hard }));
ok('old labels get suggested names', /Quick \/ Full \/ Deep/.test(r.notes[0]));

// Every real unit passes.
lv.listUnits().forEach(function(id) {
  var res = lv.checkUnit(id);
  if (res) res.errors.forEach(function(e) { failures.push('unit ' + e); });
});

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('check-levels: all tests passed');
