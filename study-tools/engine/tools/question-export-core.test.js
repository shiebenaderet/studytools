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

// === TASK 5: round-trip integration against real Civil War data ===
var fs = require('fs');
var path = require('path');

function parseCsv(text) {
  var rows = [], row = [], field = '', i = 0, inQ = false, QUOTE = '"';
  while (i < text.length) {
    var ch = text[i];
    if (inQ) {
      if (ch === QUOTE) { if (text[i+1] === QUOTE) { field += QUOTE; i += 2; continue; } inQ = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === QUOTE) { inQ = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return r.length > 1 || r[0] !== ''; });
}

var cwPath = path.join(__dirname, '..', '..', 'units', 'civil-war', 'config.json');
var cwConfig = JSON.parse(fs.readFileSync(cwPath, 'utf8'));
var cwQuestions = core.normalizeQuestions(cwConfig);
eq('civil-war normalized length', cwQuestions.length, 63);

var blooketRows = parseCsv(core.formatBlooket(cwQuestions));
eq('blooket row count', blooketRows.length, 64);
cwQuestions.forEach(function (q, i) {
  var row = blooketRows[i + 1];
  var correctNum = parseInt(row[7], 10); // Correct Answer(s) column
  // answer columns are indices 2..5 (Answer 1..4)
  var picked = row[2 + (correctNum - 1)];
  eq('blooket roundtrip q' + i, picked, q.options[q.correctIndex]);
});

var gimkitRows = parseCsv(core.formatGimkit(cwQuestions));
eq('gimkit row count', gimkitRows.length, 64);
cwQuestions.forEach(function (q, i) {
  var row = gimkitRows[i + 1];
  eq('gimkit roundtrip q' + i, row[1], q.options[q.correctIndex]); // Correct Answer column
});

// === TASK 1 (new): pickDistractors + defaultShuffle ===
var identityShuffle = function (a) { return a.slice(); };
var pdItems = [
  {value:'a',category:'C1'},{value:'b',category:'C1'},{value:'c',category:'C1'},{value:'d',category:'C1'},
  {value:'x',category:'C2'},{value:'y',category:'C2'}
];
var pd1 = core.pickDistractors(pdItems, 'a', 'C1', 3, identityShuffle);
eq('pickDistractors C1 length', pd1.length, 3);
deepEq('pickDistractors C1 values', pd1, ['b','c','d']);
eq('pickDistractors C1 excludes correct', pd1.indexOf('a'), -1);
var pd2 = core.pickDistractors(pdItems, 'x', 'C2', 3, identityShuffle);
eq('pickDistractors C2 length', pd2.length, 3);
eq('pickDistractors C2 excludes correct', pd2.indexOf('x'), -1);
eq('pickDistractors C2 unique', new Set(pd2).size, 3);

// === TASK 2 (new): normalizeFib ===
var fibCfg = {
  fillInBlankSentences: [
    { sentence: '_____ is one.', answer: 'alpha', category: 'G1' },
    { sentence: '_____ is two.', answer: 'beta', category: 'G1' },
    { sentence: '_____ is three.', answer: 'gamma', category: 'G1' },
    { sentence: '_____ is four.', answer: 'delta', category: 'G1' }
  ]
};
var fib = core.normalizeFib(fibCfg, identityShuffle);
eq('normalizeFib length', fib.length, 4);
eq('normalizeFib question', fib[0].question, '_____ is one.');
eq('normalizeFib topic', fib[0].topic, 'G1');
eq('normalizeFib correct value', fib[0].options[fib[0].correctIndex], 'alpha');
eq('normalizeFib options length', fib[0].options.length, 4);
eq('normalizeFib options unique', new Set(fib[0].options).size, 4);

// === TASK 3 (new): normalizeVocab ===
var vocabCfg = {
  vocabulary: [
    { term: 'aterm', definition: 'adef', category: 'V1' },
    { term: 'bterm', definition: 'bdef', category: 'V1' },
    { term: 'cterm', definition: 'cdef', category: 'V1' },
    { term: 'dterm', definition: 'ddef', category: 'V1' },
    { term: 'eterm', definition: 'edef', category: 'V1', tier: 'encounter' }
  ]
};
var vocabDT = core.normalizeVocab(vocabCfg, { direction: 'definition-term', includeEncounter: false }, identityShuffle);
eq('normalizeVocab DT length', vocabDT.length, 4);
eq('normalizeVocab DT question', vocabDT[0].question, 'adef');
eq('normalizeVocab DT correct', vocabDT[0].options[vocabDT[0].correctIndex], 'aterm');
eq('normalizeVocab DT topic', vocabDT[0].topic, 'V1');
var vocabTD = core.normalizeVocab(vocabCfg, { direction: 'term-definition', includeEncounter: false }, identityShuffle);
eq('normalizeVocab TD question', vocabTD[0].question, 'aterm');
eq('normalizeVocab TD correct', vocabTD[0].options[vocabTD[0].correctIndex], 'adef');
var vocabEnc = core.normalizeVocab(vocabCfg, { direction: 'definition-term', includeEncounter: true }, identityShuffle);
eq('normalizeVocab includeEncounter length', vocabEnc.length, 5);

// === TASK 4 (new): formatGimkitTyped ===
var typedQ = [{ id:0, question:'_____ is one.', options:['alpha','b','c','d'], correctIndex:0, topic:'G1' }];
var typedCsv = core.formatGimkitTyped(typedQ);
var typedLines = typedCsv.replace(/\r\n$/, '').split('\r\n');
eq('formatGimkitTyped header', typedLines[0], '"Question","Answer"');
eq('formatGimkitTyped data', typedLines[1], '"_____ is one.","alpha"');
eq('formatGimkitTyped col count', typedLines[1].split('","').length, 2);

// === TASK 5 (new): integration over real Civil War data ===
var cfgReal = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'units', 'civil-war', 'config.json'), 'utf8'));
var fibReal = core.normalizeFib(cfgReal);
eq('real fib count', fibReal.length, 15);
var fibBad = 0; fibReal.forEach(function (q) { if (q.options[q.correctIndex] == null || q.options.indexOf(q.options[q.correctIndex]) === -1) fibBad++; });
eq('real fib correct present', fibBad, 0);
eq('real typed cols', core.formatGimkitTyped(fibReal).trim().split('\r\n')[1].split('","').length, 2);
var vocabReal = core.normalizeVocab(cfgReal, { direction: 'definition-term', includeEncounter: false });
eq('real vocab mustknow only', vocabReal.length, 47);
var vocabAll = core.normalizeVocab(cfgReal, { direction: 'definition-term', includeEncounter: true });
eq('real vocab all', vocabAll.length, 70);

// xmlEscape
eq('xml &', core.xmlEscape('a & b'), 'a &amp; b');
eq('xml <', core.xmlEscape('1 < 2'), '1 &lt; 2');
eq('xml >', core.xmlEscape('b > a'), 'b &gt; a');
eq('xml "', core.xmlEscape('say "hi"'), 'say &quot;hi&quot;');
eq("xml '", core.xmlEscape("it's"), 'it&apos;s');
eq('xml null', core.xmlEscape(null), '');
eq('xml number', core.xmlEscape(42), '42');

// slugify
eq('slug basic', core.slugify('Civil War'), 'civil-war');
eq('slug strip', core.slugify('  Civil  War!! '), 'civil-war');
eq('slug unicode', core.slugify('Café & Crémes'), 'cafe-cremes');
eq('slug already', core.slugify('civil-war-vocab'), 'civil-war-vocab');
eq('slug empty', core.slugify(''), 'untitled');

// renderMCItem
var mcQ = { id: 0, question: 'Which is true?', options: ['A & a', 'B', 'C', 'D'], correctIndex: 1, topic: 'T' };
var mcXml = core.renderMCItem(mcQ, 1);
eq('mc has item ident', /<item ident="q1"/.test(mcXml), true);
eq('mc has question_type', /<fieldlabel>question_type<\/fieldlabel>\s*<fieldentry>multiple_choice_question<\/fieldentry>/.test(mcXml), true);
eq('mc has points_possible 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(mcXml), true);
eq('mc has 4 named labels', (mcXml.match(/<response_label ident="q1_a[0-3]"/g) || []).length, 4);
eq('mc no numeric ident', /<response_label ident="[0-9]+"/.test(mcXml), false);
eq('mc varequal points at q1_a1', /<varequal[^>]*>q1_a1<\/varequal>/.test(mcXml), true);
eq('mc maxvalue 100', /maxvalue="100"/.test(mcXml), true);
eq('mc setvar 100', /<setvar[^>]*>100<\/setvar>/.test(mcXml), true);
eq('mc escapes &', mcXml.indexOf('A &amp; a') >= 0, true);
eq('mc question text escaped', mcXml.indexOf('Which is true?') >= 0, true);

// renderShortAnswerItem
var saQ = { id: 0, question: '_____ is one.', _accepted: ['alpha', 'Alpha'], options: ['alpha','','',''], correctIndex: 0, topic: 'T' };
var saXml = core.renderShortAnswerItem(saQ, 2);
eq('sa item ident', /<item ident="q2"/.test(saXml), true);
eq('sa qtype short_answer', /<fieldentry>short_answer_question<\/fieldentry>/.test(saXml), true);
eq('sa points 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(saXml), true);
eq('sa response_str + render_fib', /<response_str[\s\S]*<render_fib/.test(saXml), true);
eq('sa case insensitive flag', (saXml.match(/case="No"/g) || []).length, 2);
eq('sa has alpha answer', saXml.indexOf('>alpha</') >= 0, true);
eq('sa has Alpha answer', saXml.indexOf('>Alpha</') >= 0, true);

// renderEssayItem
var esQ = { id: 0, question: 'How did geography shape the North & South?', _essay: { keyTerms: ['sectionalism', 'Cotton Kingdom'], sentenceStarters: ['Geography pushed...', 'In the North...'] }, options: [], correctIndex: -1, topic: 'T' };
var esXml = core.renderEssayItem(esQ, 3);
eq('essay item ident', /<item ident="q3"/.test(esXml), true);
eq('essay qtype', /<fieldentry>essay_question<\/fieldentry>/.test(esXml), true);
eq('essay points 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(esXml), true);
eq('essay response_str + render_fib', /<response_str[\s\S]*<render_fib/.test(esXml), true);
eq('essay no respcondition', /<respcondition/.test(esXml), false);
eq('essay text/plain mattext', /<mattext texttype="text\/plain">/.test(esXml), true);
eq('essay contains question', esXml.indexOf('How did geography shape the North &amp; South?') >= 0, true);
eq('essay contains keyTerms', esXml.indexOf('Key terms to consider: sectionalism, Cotton Kingdom') >= 0, true);
eq('essay contains starters', esXml.indexOf('Suggested sentence starters:') >= 0, true);
eq('essay contains starter bullet', esXml.indexOf('- Geography pushed') >= 0, true);
eq('essay no rubric word', esXml.toLowerCase().indexOf('rubric') === -1, true);
eq('essay no exemplar', esXml.indexOf('exemplar') === -1, true);

// buildCanvasPackage MC
var bcMcQ = { id: 0, question: 'Which is true?', options: ['A','B','C','D'], correctIndex: 1, topic: 'T' };
var pkgMc = core.buildCanvasPackage([bcMcQ], { title: 'Test Quiz', maxAttempts: 1, unitId: 'civil-war', source: 'practice' });
eq('pkg has assessmentId', pkgMc.assessmentId, 'civil-war-practice');
eq('pkg fileMap has manifest', !!pkgMc.fileMap['imsmanifest.xml'], true);
eq('pkg fileMap has assessment xml', !!pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'], true);
eq('manifest schemaversion 1.1.3', pkgMc.fileMap['imsmanifest.xml'].indexOf('<schemaversion>1.1.3</schemaversion>') >= 0, true);
eq('manifest hybrid type', pkgMc.fileMap['imsmanifest.xml'].indexOf('imsqti_xmlv1p2/imscc_xmlv1p1/assessment') >= 0, true);
eq('manifest namespace imsccv1p1', pkgMc.fileMap['imsmanifest.xml'].indexOf('imsccv1p1') >= 0, true);
eq('manifest has organizations', /<organizations\s*\/>|<organizations>\s*<\/organizations>/.test(pkgMc.fileMap['imsmanifest.xml']), true);
eq('manifest file href matches', pkgMc.fileMap['imsmanifest.xml'].indexOf('civil-war-practice/civil-war-practice.xml') >= 0, true);
eq('assessment ident matches', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('<assessment ident="civil-war-practice"') >= 0, true);
eq('assessment title is escaped', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('title="Test Quiz"') >= 0, true);
eq('assessment cc_maxattempts', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('<fieldentry>1</fieldentry>') >= 0, true);

// FIB short_answer wiring: buildCanvasPackage sets _accepted from correct option
var bcFibQ = { id: 0, question: 'X is _____', options: ['alpha','b','c','d'], correctIndex: 0, topic: 'T' };
var pkgFib = core.buildCanvasPackage([bcFibQ], { title: 'F', maxAttempts: 1, unitId: 'civil-war', source: 'fib' });
eq('fib uses short_answer', pkgFib.fileMap['civil-war-fib/civil-war-fib.xml'].indexOf('short_answer_question') >= 0, true);
eq('fib accepted = correct option', pkgFib.fileMap['civil-war-fib/civil-war-fib.xml'].indexOf('>alpha</varequal>') >= 0, true);

// Essay wiring
var bcEsQ = { id: 0, question: 'Q?', _essay: { keyTerms: [], sentenceStarters: [] }, options: [], correctIndex: -1, topic: 'T' };
var pkgEss = core.buildCanvasPackage([bcEsQ], { title: 'E', maxAttempts: 2, unitId: 'civil-war', source: 'shortAnswer' });
eq('essay assessment id', pkgEss.assessmentId, 'civil-war-shortanswer');
eq('essay cc_maxattempts 2', pkgEss.fileMap['civil-war-shortanswer/civil-war-shortanswer.xml'].indexOf('<fieldentry>2</fieldentry>') >= 0, true);
eq('essay uses essay_question', pkgEss.fileMap['civil-war-shortanswer/civil-war-shortanswer.xml'].indexOf('essay_question') >= 0, true);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
