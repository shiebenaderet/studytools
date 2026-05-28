#!/usr/bin/env node
// Audit civil-war practiceQuestions for the "longest option = correct answer" tell.
// A question PASSES when the correct option is within THRESHOLD chars of the
// longest distractor. FAILS when the correct answer is the obvious long outlier.
//
// Usage:
//   node audit-mc-lengths.js              # summary + list of failing questions
//   node audit-mc-lengths.js --topic "A Dividing Nation"   # filter to one chapter
//   node audit-mc-lengths.js --verbose    # show every question's option lengths

var path = require('path');
var CONFIG = path.join(__dirname, '..', 'config.json');
var THRESHOLD = 10; // correct may be at most THRESHOLD chars longer than longest distractor

var args = process.argv.slice(2);
var verbose = args.indexOf('--verbose') !== -1;
var topicIdx = args.indexOf('--topic');
var topicFilter = topicIdx !== -1 ? args[topicIdx + 1] : null;

var cfg = require(CONFIG);
var qs = cfg.practiceQuestions || [];

var failing = [];
var checked = 0;

qs.forEach(function (q, i) {
  if (!q.options || typeof q.correct !== 'number') return;
  if (topicFilter && q.topic !== topicFilter) return;
  checked++;

  var lens = q.options.map(function (o) { return (o || '').length; });
  var correctLen = lens[q.correct];
  var maxDistractor = Math.max.apply(null, lens.filter(function (_, idx) {
    return idx !== q.correct;
  }));
  var gap = correctLen - maxDistractor;
  var fails = gap > THRESHOLD;

  if (fails) {
    failing.push({ i: i, gap: gap, correctLen: correctLen, maxDistractor: maxDistractor, q: q });
  }

  if (verbose) {
    console.log(
      (fails ? 'FAIL' : 'ok  ') + ' #' + i +
      ' correct=' + correctLen + ' maxDistractor=' + maxDistractor +
      ' gap=' + gap + '  ' + (q.question || '').slice(0, 50)
    );
  }
});

console.log('');
console.log('Checked: ' + checked + (topicFilter ? ' (topic: ' + topicFilter + ')' : ''));
console.log('Failing (correct >' + THRESHOLD + ' chars longer than any distractor): ' + failing.length);

if (failing.length) {
  console.log('\nFailing questions (worst gap first):');
  failing.sort(function (a, b) { return b.gap - a.gap; }).forEach(function (f) {
    console.log('  #' + f.i + '  gap=' + f.gap +
      '  [' + (f.q.topic || '?') + ']  ' + (f.q.question || '').slice(0, 55));
  });
  process.exitCode = 1;
} else {
  console.log('\nAll checked questions pass. No length tell.');
}
