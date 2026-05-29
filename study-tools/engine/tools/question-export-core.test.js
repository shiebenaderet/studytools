#!/usr/bin/env node
var core = require('./question-export-core.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) {
    failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
  }
}
function deepEq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
  }
}

// === TASK 1: csvField + toCsv ===
eq('csvField hello', core.csvField('hello'), '"hello"');
eq('csvField a,b', core.csvField('a,b'), '"a,b"');
eq('csvField internal quotes', core.csvField('say "hi"'), '"say ""hi"""');
eq('csvField number', core.csvField(2), '"2"');
eq('csvField null', core.csvField(null), '""');
eq('toCsv basic', core.toCsv([['A','B'],['1','x,y']]), '"A","B"\r\n"1","x,y"\r\n');

// === TASK 2: normalizeQuestions ===
var t2config = {
  practiceQuestions: [
    { question: 'Good?', options: ['a','b','c','d'], correct: 2, topic: 'T1' },
    { question: 'No options', correct: 0 },
    { question: 'Out of range', options: ['a','b'], correct: 5, topic: 'T1' }
  ]
};
var t2 = core.normalizeQuestions(t2config);
eq('normalize length', t2.length, 1);
eq('normalize id', t2[0].id, 0);
eq('normalize correctIndex', t2[0].correctIndex, 2);
eq('normalize topic', t2[0].topic, 'T1');
deepEq('normalize options', t2[0].options, ['a','b','c','d']);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
