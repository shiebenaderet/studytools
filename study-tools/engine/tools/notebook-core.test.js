#!/usr/bin/env node
// Tests for notebook-core.js: Notebook Companion's checklist, missed
// questions, outlines and reread schedule.
// Run: node study-tools/engine/tools/notebook-core.test.js
var core = require('./notebook-core.js');

var failures = [];
function eq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}
var DAY = 86400000;
function day(y, m, d, h) { return new Date(y, m - 1, d, h || 0).getTime(); }

var config = {
  unit: { id: 'u', quizDate: '2026-12-17' },
  categorySchedule: { 'Ch A': '2026-11-16', 'Ch B': '2026-11-23' },
  vocabulary: [
    { term: 'Alpha', definition: 'a', category: 'Ch A', tier: 'must-know' },
    { term: 'Beta', definition: 'b', category: 'Ch A', tier: 'should-know' },
    { term: 'Gamma', definition: 'g', category: 'Ch A' },
    { term: 'Delta', definition: 'd', category: 'Ch B', tier: 'must-know' }
  ],
  practiceQuestions: [
    { question: 'Q1?', options: ['x', 'y'], correct: 1, explanation: 'because', topic: 'Ch A' },
    { question: 'Q2?', options: ['x', 'y'], correct: 0, topic: 'Ch B' },
    { question: 'Q3?', options: ['x', 'y'], correct: 0, topic: 'Ch B' }
  ],
  shortAnswerQuestions: [
    { question: 'Why?', topic: 'Ch A', keyTerms: ['Alpha'], plan: [{ role: 'claim' }, { role: 'evidence' }, { role: 'evidence' }, { role: 'reasoning' }] },
    { question: 'How?', topic: 'Ch B', keyTerms: ['Nothing'] }
  ]
};
var textbook = { segments: [
  { id: 'a', category: 'Ch A', sections: [
    { id: 'a1', heading: 'A one', vocabTerms: ['Alpha'] },
    { id: 'a2', heading: 'A two', vocabTerms: ['Gamma'] }
  ] },
  { id: 'b', category: 'Ch B', sections: [{ id: 'b1', heading: 'B one', vocabTerms: ['Delta'] }] }
] };

// Vocabulary
eq('core terms: must-know and untiered, not should-know', core.coreTerms(config).map(function (v) { return v.term; }), ['Alpha', 'Gamma', 'Delta']);
eq('core terms: a unit without tiers keeps all', core.coreTerms({ vocabulary: [{ term: 'X' }, { term: 'Y' }] }).length, 2);
var list = core.vocabChecklist(config, { Alpha: { on: true, at: 1 }, Gamma: { on: false, at: 2 } }, ['Gamma'], { Alpha: 3 }, ['Ch A']);
eq('checklist groups and flags', list, [
  { category: 'Ch A', open: true, terms: [
    { term: 'Alpha', definition: 'a', inNotebook: true, mastered: false, misses: 3 },
    { term: 'Gamma', definition: 'g', inNotebook: false, mastered: true, misses: 0 }] },
  { category: 'Ch B', open: false, terms: [{ term: 'Delta', definition: 'd', inNotebook: false, mastered: false, misses: 0 }] }
]);

// Missed questions
eq('missed: wrong list, in config order, not mastered', core.missedQuestions(config, { wrong: ['Q3?', 'Q1?', 'Q2?'], mastered: ['Q2?'] }), [
  { question: 'Q1?', answer: 'y', explanation: 'because', category: 'Ch A' },
  { question: 'Q3?', answer: 'x', explanation: '', category: 'Ch B' }]);
eq('missed: nothing recorded', core.missedQuestions(config, null), []);

// Outlines
var out = core.outlines(config, textbook, { 0: { answer: ' draft ' }, 1: { answer: '  ' } });
eq('outline parts numbered', out[0].parts, ['Claim', 'Evidence 1', 'Evidence 2', 'Reasoning']);
eq('outline: no plan gets the standard frame', out[1].parts, ['Claim', 'Evidence 1', 'Evidence 2', 'Reasoning']);
eq('outline reread: the section that teaches a key term', out[0].reread, [{ segId: 'a', secId: 'a1', heading: 'A one' }]);
eq('outline reread: whole chapter when no section matches', out[1].reread.map(function (s) { return s.secId; }), ['b1']);
eq('outline drafts', [out[0].hasDraft, out[1].hasDraft], [true, false]);

// Reread steps
var quiz = core.quizTime('2026-12-17');
var nov16 = day(2026, 11, 16, 14);
eq('targets: +2, +7, 2 days before the quiz', core.targets(nov16, quiz), [day(2026, 11, 18), day(2026, 11, 23), day(2026, 12, 15)]);
eq('targets: a late first read drops the steps that crowd the quiz', core.targets(day(2026, 12, 10, 9), quiz), [day(2026, 12, 12), day(2026, 12, 15)]);
eq('targets: read 2 days before the quiz, nothing more', core.targets(day(2026, 12, 15, 9), quiz), []);
eq('targets: no quiz date, just the steps', core.targets(nov16, null), [day(2026, 11, 18), day(2026, 11, 23)]);
eq('next: first step', core.nextTarget(nov16, [], quiz).at, day(2026, 11, 18));
eq('next: a reread a day early counts', core.nextTarget(nov16, [day(2026, 11, 17, 10)], quiz).at, day(2026, 11, 23));
eq('next: a reread too soon does not', core.nextTarget(nov16, [day(2026, 11, 16, 20)], quiz).at, day(2026, 11, 18));
eq('next: one reread cannot count twice', core.nextTarget(nov16, [day(2026, 11, 25)], quiz).at, day(2026, 11, 23));
eq('next: quiz step flagged', core.nextTarget(nov16, [day(2026, 11, 18), day(2026, 11, 23)], quiz).beforeQuiz, true);
eq('next: all done', core.nextTarget(nov16, [day(2026, 11, 18), day(2026, 11, 23), day(2026, 12, 15)], quiz), null);

// Reading plan
function plan(tb, weak, now, open) {
  var p = core.readingPlan({ config: config, textbook: textbook, tbProgress: tb, weak: weak, openCategories: open || ['Ch A', 'Ch B'], now: now });
  var ids = function (l) { return l.map(function (i) { return i.secId; }); };
  return { read: ids(p.read), reread: ids(p.reread), upcoming: ids(p.upcoming), raw: p };
}
var tb = { sectionsRead: { 'a/a1': true, 'a/a2': true }, readAt: { 'a/a1': nov16 } };
var p1 = plan(tb, {}, day(2026, 11, 17, 12));
eq('plan: unread, upcoming, and an old read counted from the open date', [p1.read, p1.reread, p1.upcoming], [['b1'], [], ['a1', 'a2']]);
var p2 = plan(tb, {}, day(2026, 11, 18, 8));
eq('plan: due on the day', p2.reread, ['a1', 'a2']);
eq('plan: reason', p2.raw.reread[0].reason, 'First reread');
eq('plan: closed chapters stay off', plan(tb, {}, day(2026, 11, 17), ['Ch A']).read, []);
var weak = { terms: { Alpha: 2 }, at: { Alpha: day(2026, 11, 17, 9) } };
var p3 = plan(tb, weak, day(2026, 11, 17, 12));
eq('plan: a term missed twice since reading makes it due now', p3.reread, ['a1']);
eq('plan: names the term', p3.raw.reread[0].reason, 'You keep missing Alpha');
var tb2 = { sectionsRead: tb.sectionsRead, readAt: tb.readAt, rereads: { 'a/a1': [day(2026, 11, 17, 10)] } };
eq('plan: misses before the last reread do not count', plan(tb2, weak, day(2026, 11, 17, 12)).reread, []);
eq('plan: one miss is not enough', plan(tb, { terms: { Alpha: 1 }, at: { Alpha: day(2026, 11, 17, 9) } }, day(2026, 11, 17, 12)).reread, []);
eq('plan: empty the day after the quiz', plan(tb, weak, day(2026, 12, 18, 9)).read, []);
eq('plan: no textbook', core.readingPlan({ config: config, textbook: null }), { read: [], reread: [], upcoming: [] });
eq('due helper', core.isRereadDue({ config: config, textbook: textbook, tbProgress: tb, weak: {}, now: day(2026, 11, 18, 8) }, 'a', 'a1'), true);

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('notebook-core: all tests passed');
