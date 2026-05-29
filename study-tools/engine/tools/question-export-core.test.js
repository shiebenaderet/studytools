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

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
