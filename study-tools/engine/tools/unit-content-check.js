#!/usr/bin/env node
// Checks a unit's content against the conventions in CLAUDE.md.
// Usage: node study-tools/engine/tools/unit-content-check.js [unit-id ...]
// With no ids, checks every unit in study-tools/units/units.json.
// Exits 1 if any ERROR is found; WARN lines are advisory.
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..', '..');
var unitsDir = path.join(root, 'units');

// Load Who Am I's clue builder so the leak check uses the real masking code
var whoAmI;
global.StudyEngine = { registerActivity: function(a) { if (a.id === 'who-am-i') whoAmI = a; } };
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine', 'js', 'activities', 'who-am-i.js'), 'utf8'));

var ids = process.argv.slice(2);
if (ids.length === 0) {
  ids = JSON.parse(fs.readFileSync(path.join(unitsDir, 'units.json'), 'utf8')).units.map(function(u) { return u.id; });
}

var errors = 0;
function err(unit, msg) { errors++; console.log('ERROR ' + unit + ': ' + msg); }
function warn(unit, msg) { console.log('WARN  ' + unit + ': ' + msg); }

ids.forEach(function(id) {
  var cfgPath = path.join(unitsDir, id, 'config.json');
  if (!fs.existsSync(cfgPath)) { err(id, 'no config.json'); return; }
  var cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  var vocab = cfg.vocabulary || [];
  var cats = [];
  vocab.forEach(function(v) { if (cats.indexOf(v.category) === -1) cats.push(v.category); });

  // categorySchedule keys must match vocab categories
  Object.keys(cfg.categorySchedule || {}).forEach(function(k) {
    if (cats.indexOf(k) === -1) err(id, 'categorySchedule key "' + k + '" is not a vocabulary category');
  });

  // Who Am I: no clue may contain its own answer after masking
  vocab.forEach(function(t) {
    var o = Object.create(whoAmI);
    o._currentTerm = t;
    for (var c = 0; c < 4; c++) {
      if (o._getClueText(c).toLowerCase().indexOf(t.term.toLowerCase()) !== -1) {
        err(id, 'Who Am I clue ' + (c + 1) + ' for "' + t.term + '" still contains the term');
      }
    }
  });
  var mustKnow = vocab.filter(function(v) { return !v.tier || v.tier === 'must-know'; }).length;
  if (vocab.length && mustKnow < 6) warn(id, 'only ' + mustKnow + ' must-know terms; games pad with other tiers below 6');

  // Go Deeper links
  var gd = cfg.goDeeper;
  if (!gd) {
    warn(id, 'no goDeeper links (see CLAUDE.md, "Go Deeper links")');
  } else {
    var perCat = {};
    gd.forEach(function(l, i) {
      var where = 'goDeeper[' + i + '] "' + (l.title || '') + '"';
      if (cats.indexOf(l.category) === -1) err(id, where + ': category "' + l.category + '" is not a vocabulary category');
      if (['video', 'reading', 'reference'].indexOf(l.type) === -1) err(id, where + ': type must be video, reading or reference');
      if (!/^https:\/\//.test(l.url || '')) err(id, where + ': url must start with https://');
      if (!l.title) err(id, where + ': missing title');
      if (/youtube\.com\/embed|player\./.test(l.url || '')) err(id, where + ': link to the watch page, never an embed URL');
      perCat[l.category] = (perCat[l.category] || 0) + 1;
    });
    cats.forEach(function(c) {
      var n = perCat[c] || 0;
      if (n === 0) warn(id, 'category "' + c + '" has no goDeeper links');
      else if (n > 6) warn(id, 'category "' + c + '" has ' + n + ' goDeeper links; keep it to about 6');
    });
  }

  // Textbook: each segment's category must match a vocab category, so the
  // Read > Study gate and the end-of-chapter "Keep going" box find it
  var tbPath = path.join(unitsDir, id, 'textbook.json');
  if (fs.existsSync(tbPath)) {
    var tb = JSON.parse(fs.readFileSync(tbPath, 'utf8')).textbookContent || {};
    (tb.segments || []).forEach(function(seg) {
      var cat = seg.category || seg.title;
      if (cats.indexOf(cat) === -1) err(id, 'textbook segment "' + seg.id + '" category "' + cat + '" is not a vocabulary category');
    });
  }
});

console.log(errors ? errors + ' error(s)' : 'OK');
process.exit(errors ? 1 : 0);
