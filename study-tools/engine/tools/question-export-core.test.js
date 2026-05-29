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

// === TASK 3: formatBlooket ===
var t3 = core.formatBlooket([{ id:0, question:'What, then?', options:['o0','o1','o2','o3'], correctIndex:1, topic:'T' }]);
var t3lines = t3.replace(/\r\n$/, '').split('\r\n');
eq('blooket header', t3lines[0], '"Question #","Question Text","Answer 1","Answer 2","Answer 3","Answer 4","Time Limit (sec)","Correct Answer(s)"');
eq('blooket data', t3lines[1], '"1","What, then?","o0","o1","o2","o3","20","2"');

// === TASK 4: formatGimkit ===
var t4 = core.formatGimkit([{ id:0, question:'What, then?', options:['o0','o1','o2','o3'], correctIndex:1, topic:'T' }]);
var t4lines = t4.replace(/\r\n$/, '').split('\r\n');
eq('gimkit header', t4lines[0], '"Question","Correct Answer","Incorrect Answer 1","Incorrect Answer 2","Incorrect Answer 3"');
eq('gimkit data', t4lines[1], '"What, then?","o1","o0","o2","o3"');

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
