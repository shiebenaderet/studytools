#!/usr/bin/env node
/**
 * Reading levels check (docs/READING-LEVELS.md).
 *
 * Measures every textbook section of a unit at each reading level it has, with
 * the shared Flesch-Kincaid measure, and reports any reading that measures
 * outside its level or does not step up (Quick < Clear < Full < Deep).
 * A reading that fails is rewritten, not relabeled.
 *
 *   node study-tools/engine/tools/reading-levels-check.js <unit-id> [--read-more]
 *
 * --read-more also measures each section's Read More text.
 * Exits 1 when there is any ERROR.
 */
const fs = require('fs');
const path = require('path');

/* ---- fk-core.js, copied unchanged ------------------------------------------ */
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
/* ---- end of fk-core.js ------------------------------------------------------ */

/* The textbook's data keys, in level order. The keys never change (highlights
   and saved levels point at them); only the names students see did. */
const LEVEL_KEYS = ['level0', 'simplified', 'standard', 'advanced'];

/* Measure the characters a student sees, so "&mdash;" is not counted as a word. */
const ENT = { mdash: '—', ndash: '–', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  hellip: '...', amp: '&', nbsp: ' ', middot: '·' };
const dec = s => String(s).replace(/&(\w+);/g, (m, n) => (ENT[n] != null ? ENT[n] : m));

const words = html => dec(html).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

/* Tap-to-define matches the exact term plus a plural ending, so a level that
   drops or respells a vocab term loses its definition. */
function missingTerms(html, terms) {
  const text = dec(html).replace(/<[^>]+>/g, ' ').toLowerCase();
  return (terms || []).filter(t => !text.includes(String(t).toLowerCase()));
}

function byLevel(content) {
  const out = {};
  LEVEL_KEYS.forEach((k, i) => { if (content && content[k]) out[LEVEL_NAMES[i]] = dec(content[k]); });
  return out;
}

function checkUnit(unitId, opts) {
  const file = path.join(__dirname, '..', '..', 'units', unitId, 'textbook.json');
  const tb = JSON.parse(fs.readFileSync(file, 'utf8')).textbookContent;
  const offered = LEVEL_KEYS.filter(k => tb.readingLevels && tb.readingLevels[k]).map(k => LEVEL_NAMES[LEVEL_KEYS.indexOf(k)]);
  const errors = [], warnings = [], rows = [];

  LEVEL_KEYS.forEach((k, i) => {
    const lv = tb.readingLevels && tb.readingLevels[k];
    if (lv && lv.label !== LEVEL_NAMES[i]) errors.push(`readingLevels.${k} is labeled "${lv.label}"; it must be "${LEVEL_NAMES[i]}"`);
  });

  for (const seg of tb.segments) {
    for (const sec of seg.sections) {
      const topic = `${seg.id}/${sec.id}`;
      const sets = [['', sec.content]];
      if (opts.readMore && sec.readMore && sec.readMore.content) sets.push([' (Read More)', sec.readMore.content]);
      for (const [tag, content] of sets) {
        const levels = byLevel(content);
        const name = topic + tag;
        rows.push(name.padEnd(62) + LEVEL_NAMES.map(n => levels[n]
          ? `${n} ${fkGrade(levels[n]).grade.toFixed(1).padStart(4)} ${String(words(levels[n])).padStart(3)}w`
          : `${n}    -     `).join('  '));
        errors.push(...checkTopic(name, levels));
        // The short reading must exist at every level the unit offers.
        if (!tag) offered.forEach(n => { if (!levels[n]) errors.push(`${name}: no ${n} text, but the unit offers ${n}`); });
        LEVEL_NAMES.forEach(n => {
          if (!levels[n]) return;
          const gone = missingTerms(levels[n], sec.vocabTerms);
          if (gone.length && !tag) errors.push(`${name}: ${n} is missing vocab term(s): ${gone.join(', ')}`);
          if (/—|&mdash;/.test(content[LEVEL_KEYS[LEVEL_NAMES.indexOf(n)]])) warnings.push(`${name}: ${n} has an em dash`);
        });
        // Length should step up too: Quick is the shortest reading.
        if (levels.Quick && levels.Clear && words(levels.Quick) >= words(levels.Clear)) warnings.push(`${name}: Quick is not shorter than Clear`);
        if (levels.Clear && levels.Full && words(levels.Clear) > words(levels.Full)) warnings.push(`${name}: Clear is longer than Full`);
      }
    }
  }
  return { offered, rows, errors, warnings };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const unitId = args.find(a => !a.startsWith('--'));
  if (!unitId) {
    console.error('Usage: node reading-levels-check.js <unit-id> [--read-more]');
    process.exit(2);
  }
  const r = checkUnit(unitId, { readMore: args.includes('--read-more') });
  console.log(`Reading levels: ${unitId} (offers ${r.offered.join(', ') || 'none'})`);
  console.log('Measured grade and word count per section:\n');
  r.rows.forEach(x => console.log('  ' + x));
  console.log('');
  r.warnings.forEach(w => console.log('WARN  ' + w));
  r.errors.forEach(e => console.log('ERROR ' + e));
  console.log(`\n${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  process.exit(r.errors.length ? 1 : 0);
}

module.exports.checkUnit = checkUnit;
