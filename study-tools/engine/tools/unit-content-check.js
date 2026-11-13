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

  // Who Am I: no clue may contain its own answer after masking, and every
  // blank must stand alone so the sentence still reads ("___ity" does not)
  var GENERIC = ['without', 'with', 'from', 'into', 'over', 'rights', 'acts', 'source', 'sources', 'voices'];
  vocab.forEach(function(t) {
    var o = Object.create(whoAmI);
    o._currentTerm = t;
    for (var c = 0; c < 4; c++) {
      var clue = o._getClueText(c);
      if (clue.toLowerCase().indexOf(t.term.toLowerCase()) !== -1) {
        err(id, 'Who Am I clue ' + (c + 1) + ' for "' + t.term + '" still contains the term; reword the example or explanation');
      }
      if (/[A-Za-z0-9]___|___[A-Za-z0-9]/.test(clue)) {
        err(id, 'Who Am I clue ' + (c + 1) + ' for "' + t.term + '" has a blank joined to other letters: ' + clue.slice(0, 90));
      }
    }
    // The 5-point clue should not hand over a distinctive word of a longer term
    var words = t.term.trim().split(/\s+/);
    if (words.length > 1) {
      var first = o._getClueText(0);
      words.filter(function(w, i) { return words.indexOf(w) === i; }).forEach(function(w) {
        if (w.length < 5 || GENERIC.indexOf(w.toLowerCase()) !== -1) return;
        if (new RegExp('\\b' + w.slice(0, Math.max(5, w.length - 3)), 'i').test(first)) {
          warn(id, 'Who Am I first clue for "' + t.term + '" contains "' + w + '"; consider rewording the example');
        }
      });
    }
  });
  var mustKnow = vocab.filter(function(v) { return !v.tier || v.tier === 'must-know'; }).length;
  if (vocab.length && mustKnow < 6) warn(id, 'only ' + mustKnow + ' must-know terms; games pad with other tiers below 6');

  // Practice question tiers: "extra" questions wait until the core ones are answered right
  var pq = cfg.practiceQuestions || [];
  var coreBy = {}, extraBy = {};
  pq.forEach(function(q, i) {
    if (q.tier !== undefined && q.tier !== 'extra' && q.tier !== 'core') err(id, 'practiceQuestions[' + i + ']: tier must be "extra" or "core" (or left out, which means core)');
    var bucket = q.tier === 'extra' ? extraBy : coreBy;
    bucket[q.topic] = (bucket[q.topic] || 0) + 1;
  });
  Object.keys(extraBy).forEach(function(t) {
    if ((coreBy[t] || 0) < 4) warn(id, 'practice questions for "' + t + '": only ' + (coreBy[t] || 0) + ' core; extras stay hidden until the core ones are answered right, so keep at least 4 core per chapter');
  });

  // Power Sort sets
  var vocabCats = {};
  vocab.forEach(function(v) { vocabCats[v.category] = true; });
  (cfg.powerSorts || []).forEach(function(set, i) {
    var where = 'powerSorts[' + i + '] "' + (set.title || set.id || '') + '"';
    if (!set.id) err(id, where + ' has no id');
    if (set.category && !vocabCats[set.category]) err(id, where + ' category "' + set.category + '" matches no vocabulary category');
    var bins = (set.bins || []).map(function(b) { return b.id; });
    if (bins.length < 2 || bins.length > 4) err(id, where + ' needs 2 to 4 bins');
    (set.items || []).forEach(function(it, j) {
      if (bins.indexOf(it.bin) === -1) err(id, where + ' item ' + j + ' "' + it.text + '" uses unknown bin "' + it.bin + '"');
      if (!it.explanation) warn(id, where + ' item "' + it.text + '" has no explanation');
    });
    if ((set.items || []).length < 6) warn(id, where + ' has fewer than 6 items');
  });

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

    // Key terms, parts of speech and pronunciation guides
    var POS = ['noun', 'verb', 'adjective', 'adverb'];
    var vocabTerms = vocab.map(function(v) { return String(v.term).toLowerCase(); });
    vocab.forEach(function(v) {
      if (v.pos && POS.indexOf(v.pos) === -1) err(id, 'vocabulary "' + v.term + '": pos must be one of ' + POS.join(', '));
    });
    var plain = function(html) { return String(html || '').replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/g, ' ').replace(/<[^>]+>/g, ' '); };
    var has = function(html, term) {
      return new RegExp('\\b' + String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es)?\\b', 'i').test(plain(html));
    };
    (tb.segments || []).forEach(function(seg) {
      (seg.sections || []).forEach(function(sec) {
        var where = 'textbook ' + seg.id + '/' + sec.id;
        var levels = typeof sec.content === 'object' ? sec.content : { standard: sec.content };
        (sec.keyTerms || []).forEach(function(k) {
          if (!k.term) return err(id, where + ': a key term has no term');
          if (/[^A-Za-z0-9]$/.test(k.term)) err(id, where + ': key term "' + k.term + '" must end in a letter or number, or it will never match');
          if (vocabTerms.indexOf(k.term.toLowerCase()) !== -1) err(id, where + ': key term "' + k.term + '" is already a vocabulary word');
          if (k.pos && POS.indexOf(k.pos) === -1) err(id, where + ': key term "' + k.term + '" pos must be one of ' + POS.join(', '));
          if (!k.note) warn(id, where + ': key term "' + k.term + '" has no note');
          var found = Object.keys(levels).filter(function(lv) { return has(levels[lv], k.term); });
          if (!found.length) err(id, where + ': key term "' + k.term + '" is not in the section text (outside subheads)');
          else if (found.length < Object.keys(levels).length) warn(id, where + ': key term "' + k.term + '" is missing at ' + Object.keys(levels).filter(function(lv) { return found.indexOf(lv) === -1; }).join(', '));
        });
        // Quote boxes: a real link, and a portrait file that exists
        (sec.primarySource ? [].concat(sec.primarySource) : []).forEach(function(q) {
          if (!q.text) err(id, where + ': primarySource has no text');
          if (q.sourceUrl && !/^https:\/\//.test(q.sourceUrl)) err(id, where + ': primarySource sourceUrl must start with https://');
          if (!q.sourceUrl) warn(id, where + ': primarySource has no sourceUrl');
          if (q.image && q.image.src) {
            var imgPath = path.join(unitsDir, '..', 'engine', q.image.src);
            if (!fs.existsSync(imgPath)) err(id, where + ': primarySource image not found: ' + q.image.src);
            if (!q.image.credit) err(id, where + ': primarySource image has no credit');
          }
        });
        // Section picture, and its larger file for the enlarged view
        if (sec.image) ['src', 'full'].forEach(function(k) {
          if (sec.image[k] && !/^https?:/.test(sec.image[k]) && !fs.existsSync(path.join(unitsDir, '..', 'engine', sec.image[k]))) err(id, where + ': image ' + k + ' not found: ' + sec.image[k]);
        });
        var marked = (sec.keyTerms || []).length + (sec.vocabTerms || []).length;
        if ((sec.keyTerms || []).length && marked > 8) warn(id, where + ': ' + marked + ' words are colored by Word colors; keep it to about 7');
      });
    });
    Object.keys(tb.pronunciations || {}).forEach(function(word) {
      if (!tb.pronunciations[word] || /[()]/.test(tb.pronunciations[word])) err(id, 'pronunciation for "' + word + '" must be plain text with no parentheses');
    });
  }
});

console.log(errors ? errors + ' error(s)' : 'OK');
process.exit(errors ? 1 : 0);
