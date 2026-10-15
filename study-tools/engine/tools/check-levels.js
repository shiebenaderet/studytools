#!/usr/bin/env node
// Measures every unit's textbook reading levels and checks that each tier's
// displayed name matches the band its text actually measures at.
// The names and limits are defined once in docs/READING-LEVELS.md.
// Usage: node study-tools/engine/tools/check-levels.js [unit-id ...]
// With no ids, checks every unit in study-tools/units/units.json.
// Exits 1 if any ERROR is found; WARN and NOTE lines are advisory.
//
// A tier is all of its sections' text, every segment, joined together.
// Tiers named Quick / Clear / Full / Deep are checked against the canonical
// limits (Quick <= 5.0, Clear <= 7.5, Full <= 10.5, Deep above Full) and must
// step up. A named tier that also fits the limit of the band below it reads as
// that easier band and fails too: a name always means the same difficulty.
// Tiers still carrying older labels (Easier / On Grade / Challenge) are
// measured and reported with the names their text would earn, but not failed:
// renaming them is the teacher's decision, and a tier that fits no band needs
// a rewrite, not a new label.
'use strict';
var fs = require('fs');
var path = require('path');

// ---- Shared measure: copied unchanged from fk-core.js -----------------------
/* Shared reading-level measure (see READING-LEVELS.md). Copy this block into a
   repo's check-levels script unchanged so every site measures the same way. */
const LEVEL_NAMES = ['Quick', 'Clear', 'Full', 'Deep'];
const LEVEL_BLURBS = {
  Quick: 'Short sentences. Key words explained.',
  Clear: 'Plain words, a little more detail.',
  Full: 'The grade-level reading.',
  Deep: 'Adds real quotes from the time and what historians argue.'
};
const LEVEL_LIMITS = { Quick: 5.0, Clear: 7.5, Full: 10.5 }; // Deep: must beat Full

function syllables(word) {
  let w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function fkGrade(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\([^)]*\)/g, ' ');
  const sentences = text.split(/[.!?]+["”’')]*(?=\s|$)/).filter(s => s.trim().split(/\s+/).length > 2);
  const words = text.split(/\s+/).filter(w => /[a-z]/i.test(w));
  if (!sentences.length || !words.length) return { grade: 0, wordsPerSentence: 0 };
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return {
    grade: 0.39 * words.length / sentences.length + 11.8 * syl / words.length - 15.59,
    wordsPerSentence: words.length / sentences.length
  };
}

/* levels: { Quick: html, Clear: html, Full: html, Deep: html } (any may be missing).
   Returns a list of problems for one topic. */
function checkTopic(topic, levels) {
  const problems = [];
  const g = {};
  LEVEL_NAMES.forEach(n => { if (levels[n]) g[n] = fkGrade(levels[n]).grade; });
  Object.keys(LEVEL_LIMITS).forEach(n => {
    if (g[n] != null && g[n] > LEVEL_LIMITS[n]) problems.push(`${topic}: ${n} measures ${g[n].toFixed(1)} (limit ${LEVEL_LIMITS[n]})`);
  });
  for (let i = 1; i < LEVEL_NAMES.length; i++) {
    const a = LEVEL_NAMES[i - 1], b = LEVEL_NAMES[i];
    if (g[a] != null && g[b] != null && !(g[b] > g[a])) problems.push(`${topic}: ${b} (${g[b].toFixed(1)}) does not measure harder than ${a} (${g[a].toFixed(1)})`);
  }
  return problems;
}

module.exports = { LEVEL_NAMES, LEVEL_BLURBS, LEVEL_LIMITS, syllables, fkGrade, checkTopic };
// ---- End of shared measure ---------------------------------------------------

var unitsRoot = path.join(__dirname, '..', '..', 'units');

// The engine's built-in tiers when a textbook.json has no readingLevels
// (textbook.js _DEFAULT_LEVELS).
var ENGINE_DEFAULT_LEVELS = {
  simplified: { label: 'Easier' },
  standard: { label: 'On Grade' },
  advanced: { label: 'Challenge' }
};

// The easiest band whose limit a grade fits; Deep for anything above Full.
function bandFor(grade) {
  for (var i = 0; i < LEVEL_NAMES.length - 1; i++) {
    var n = LEVEL_NAMES[i];
    if (grade <= LEVEL_LIMITS[n]) return n;
  }
  return 'Deep';
}

// Names a list of tiers (easiest first) by measurement. Returns the names, or
// null with a reason when the tiers cannot each take a different band in order.
function suggestNames(tiers) {
  var names = tiers.map(function(t) { return bandFor(t.grade); });
  for (var i = 1; i < names.length; i++) {
    if (LEVEL_NAMES.indexOf(names[i]) <= LEVEL_NAMES.indexOf(names[i - 1])) {
      var listed = tiers.map(function(t, j) { return t.label + ' ' + t.grade.toFixed(1) + ' (' + names[j] + ')'; }).join(', ');
      return { names: null, reason: listed + '; ' + tiers[i].label + ' does not land on a harder band than ' + tiers[i - 1].label };
    }
  }
  return { names: names, reason: null };
}

// readingLevels: { key: { label, description } } in order; segments: the
// textbook's segments. Returns { tiers, errors, warnings, notes }.
function checkLevels(unitId, readingLevels, segments) {
  var levels = readingLevels && Object.keys(readingLevels).length ? readingLevels : ENGINE_DEFAULT_LEVELS;
  var out = { tiers: [], errors: [], warnings: [], notes: [] };
  Object.keys(levels).forEach(function(key) {
    var parts = [];
    var perSection = [];
    var missing = 0;
    (segments || []).forEach(function(seg) {
      (seg.sections || []).forEach(function(sec) {
        var html = sec.content && typeof sec.content === 'object' ? sec.content[key] : null;
        if (html) { parts.push(html); perSection.push(fkGrade(html).grade); } else missing++;
      });
    });
    var all = fkGrade(parts.join('\n'));
    out.tiers.push({
      key: key,
      label: (levels[key] && levels[key].label) || key,
      description: (levels[key] && levels[key].description) || '',
      grade: all.grade,
      wordsPerSentence: all.wordsPerSentence,
      min: perSection.length ? Math.min.apply(null, perSection) : 0,
      max: perSection.length ? Math.max.apply(null, perSection) : 0,
      sections: perSection.length,
      missing: missing
    });
  });

  var tiers = out.tiers.filter(function(t) { return t.sections > 0; });
  out.tiers.forEach(function(t) {
    if (!t.sections) out.warnings.push(unitId + ': ' + t.label + ' (' + t.key + ') has no text in any section');
    else if (t.missing) out.warnings.push(unitId + ': ' + t.label + ' (' + t.key + ') is missing from ' + t.missing + ' section(s); those show the default level');
  });
  var named = tiers.filter(function(t) { return LEVEL_NAMES.indexOf(t.label) !== -1; });

  if (named.length === 0) {
    var s = suggestNames(tiers);
    if (s.names) out.notes.push(unitId + ': not yet named; by measurement these tiers are ' + s.names.join(' / '));
    else out.notes.push(unitId + ': not yet named, and no clean names by measurement: ' + s.reason + '. Rewriting the text is content work for the teacher');
    return out;
  }
  if (named.length !== tiers.length) {
    out.errors.push(unitId + ': mixes Quick/Clear/Full/Deep with other labels (' + tiers.map(function(t) { return t.label; }).join(', ') + ')');
  }

  var byName = {};
  named.forEach(function(t) {
    if (byName[t.label]) out.errors.push(unitId + ': two tiers are named ' + t.label + ' (' + byName[t.label].key + ', ' + t.key + ')');
    else byName[t.label] = t;
  });
  for (var i = 1; i < named.length; i++) {
    if (LEVEL_NAMES.indexOf(named[i].label) < LEVEL_NAMES.indexOf(named[i - 1].label)) {
      out.errors.push(unitId + ': ' + named[i].label + ' comes after ' + named[i - 1].label + ' in readingLevels; list them easiest first');
    }
  }

  // Canonical limits and stepping, using the shared checkTopic on each tier's text.
  var texts = {};
  Object.keys(byName).forEach(function(n) {
    var t = byName[n];
    var html = [];
    (segments || []).forEach(function(seg) {
      (seg.sections || []).forEach(function(sec) { if (sec.content && sec.content[t.key]) html.push(sec.content[t.key]); });
    });
    texts[n] = html.join('\n');
  });
  checkTopic(unitId, texts).forEach(function(p) { out.errors.push(p); });
  // checkTopic steps only between neighbouring names; a set that skips one
  // (Quick, Full, Deep) is stepped here across the gap.
  var present = LEVEL_NAMES.filter(function(n) { return byName[n]; });
  for (var k = 1; k < present.length; k++) {
    var a = present[k - 1], b = present[k];
    if (LEVEL_NAMES.indexOf(b) - LEVEL_NAMES.indexOf(a) > 1 && !(byName[b].grade > byName[a].grade)) {
      out.errors.push(unitId + ': ' + b + ' (' + byName[b].grade.toFixed(1) + ') does not measure harder than ' + a + ' (' + byName[a].grade.toFixed(1) + ')');
    }
  }

  // A name must not sit on text that already fits the band below it.
  Object.keys(byName).forEach(function(n) {
    var idx = LEVEL_NAMES.indexOf(n);
    if (idx === 0) return;
    var lower = LEVEL_NAMES[idx - 1];
    if (byName[n].grade <= LEVEL_LIMITS[lower]) {
      out.errors.push(unitId + ': ' + n + ' measures ' + byName[n].grade.toFixed(1) + ', inside ' + lower + "'s limit (" + LEVEL_LIMITS[lower] + '), so it reads as ' + lower);
    }
  });

  named.forEach(function(t) {
    if (t.description !== LEVEL_BLURBS[t.label]) {
      out.warnings.push(unitId + ': ' + t.label + ' blurb is "' + t.description + '"; the shared blurb is "' + LEVEL_BLURBS[t.label] + '"');
    }
  });
  return out;
}

function loadUnit(unitId) {
  var p = path.join(unitsRoot, unitId, 'textbook.json');
  if (!fs.existsSync(p)) return null;
  var tb = JSON.parse(fs.readFileSync(p, 'utf8'));
  var c = tb.textbookContent || tb;
  return { readingLevels: c.readingLevels, segments: c.segments || [] };
}

function listUnits() {
  return JSON.parse(fs.readFileSync(path.join(unitsRoot, 'units.json'), 'utf8')).units.map(function(u) { return u.id; });
}

function checkUnit(unitId) {
  var u = loadUnit(unitId);
  if (!u) return null;
  return checkLevels(unitId, u.readingLevels, u.segments);
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

function main(ids) {
  if (!ids.length) ids = listUnits();
  var errors = 0;
  ids.forEach(function(id) {
    var r = checkUnit(id);
    if (!r) { console.log(id + ': no textbook.json, skipped'); return; }
    console.log(id);
    r.tiers.forEach(function(t) {
      console.log('  ' + pad(t.label, 10) + pad('(' + t.key + ')', 13) + 'FK ' + pad(t.grade.toFixed(1), 5) +
        'range ' + pad(t.min.toFixed(1) + '-' + t.max.toFixed(1), 10) + 'words/sentence ' + pad(t.wordsPerSentence.toFixed(1), 5) +
        'sections ' + t.sections + '  measures as ' + bandFor(t.grade));
    });
    r.errors.forEach(function(m) { errors++; console.log('ERROR ' + m); });
    r.warnings.forEach(function(m) { console.log('WARN  ' + m); });
    r.notes.forEach(function(m) { console.log('NOTE  ' + m); });
  });
  console.log(errors ? errors + ' error(s)' : 'Reading levels OK');
  return errors;
}

module.exports.bandFor = bandFor;
module.exports.suggestNames = suggestNames;
module.exports.checkLevels = checkLevels;
module.exports.checkUnit = checkUnit;
module.exports.listUnits = listUnits;

if (require.main === module) process.exit(main(process.argv.slice(2)) ? 1 : 0);
