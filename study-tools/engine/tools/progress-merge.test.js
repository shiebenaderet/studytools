// Tests for ProgressManager.mergeActivityData rules on studyTime and streaks.
// Run: node study-tools/engine/tools/progress-merge.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '../js/core/progress.js'), 'utf8');
const store = {};
const ctx = {
    localStorage: {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; },
        key: () => null, length: 0
    },
    window: { addEventListener() {} },
    console
};
vm.createContext(ctx);
vm.runInContext(src + '\nthis.PM = ProgressManager;', ctx);
// Round-trip through JSON so results compare cleanly across the vm boundary.
const merge = (a, l, r) => { const m = ctx.PM.mergeActivityData(a, l, r); return m == null ? m : JSON.parse(JSON.stringify(m)); };

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok - ' + name); }

test('studyTime: small fresh local does not beat hours in the cloud', () => {
    assert.strictEqual(merge('studyTime', 34000, 49259000), 49259000);
});
test('studyTime: larger local total is kept', () => {
    assert.strictEqual(merge('studyTime', 60000, 30000), 60000);
});
test('studyTime: missing side falls back', () => {
    assert.strictEqual(merge('studyTime', null, 5000), 5000);
    assert.strictEqual(merge('studyTime', 5000, null), 5000);
});
test('streak: same-day reset to 1 loses to the real streak', () => {
    const r = merge('streak', { current: 1, lastDate: 'Wed Oct 28 2026' }, { current: 19, lastDate: 'Wed Oct 28 2026' });
    assert.strictEqual(r.current, 19);
});
test('streak: later lastDate wins', () => {
    const r = merge('streak', { current: 5, lastDate: 'Thu Oct 29 2026' }, { current: 9, lastDate: 'Mon Oct 26 2026' });
    assert.strictEqual(r.current, 5);
});
test('learn-mode-streak: a gap of two days or more keeps the later day, and the longest best', () => {
    const r = merge('learn-mode-streak',
        { currentStreak: 1, longestStreak: 1, lastSessionDate: 'Wed Oct 28 2026' },
        { currentStreak: 20, longestStreak: 20, lastSessionDate: 'Mon Oct 26 2026' });
    assert.strictEqual(r.currentStreak, 1);
    assert.strictEqual(r.longestStreak, 20);
});
test('streak: next-day sign-in on a second device carries the real streak on', () => {
    const r = merge('streak', { current: 1, lastDate: 'Thu Oct 29 2026' }, { current: 19, lastDate: 'Wed Oct 28 2026' });
    assert.strictEqual(r.current, 20);
    assert.strictEqual(r.lastDate, 'Thu Oct 29 2026');
    // same thing with the devices the other way round
    const r2 = merge('streak', { current: 19, lastDate: 'Wed Oct 28 2026' }, { current: 1, lastDate: 'Thu Oct 29 2026' });
    assert.strictEqual(r2.current, 20);
});
test('streak: next-day copy that already counted yesterday is left alone', () => {
    const r = merge('streak', { current: 20, lastDate: 'Thu Oct 29 2026' }, { current: 19, lastDate: 'Wed Oct 28 2026' });
    assert.strictEqual(r.current, 20);
});
test('streak: carries across the autumn clock change', () => {
    const r = merge('streak', { current: 1, lastDate: 'Sun Nov 01 2026' }, { current: 7, lastDate: 'Sat Oct 31 2026' });
    assert.strictEqual(r.current, 8);
});
test('learn-mode-streak: next-day carry also raises the longest streak', () => {
    const r = merge('learn-mode-streak',
        { currentStreak: 1, longestStreak: 1, lastSessionDate: 'Wed Oct 28 2026' },
        { currentStreak: 20, longestStreak: 20, lastSessionDate: 'Tue Oct 27 2026' });
    assert.strictEqual(r.currentStreak, 21);
    assert.strictEqual(r.longestStreak, 21);
});
test('learn-mode-streak: same-day tie keeps higher count', () => {
    const r = merge('learn-mode-streak',
        { currentStreak: 1, longestStreak: 1, lastSessionDate: 'Wed Oct 28 2026' },
        { currentStreak: 21, longestStreak: 21, lastSessionDate: 'Wed Oct 28 2026' });
    assert.strictEqual(r.currentStreak, 21);
});
test('term-mastery: fresh device keeps terms from the cloud, higher count wins', () => {
    const r = merge('term-mastery',
        { Repeal: { sources: ['learn-mode'], count: { 'learn-mode': 1 } } },
        { Repeal: { sources: ['learn-mode', 'wordle'], count: { 'learn-mode': 2, wordle: 1 } },
          Boycott: { sources: ['learn-mode'], count: { 'learn-mode': 3 } } });
    assert.deepStrictEqual(r.Repeal.count, { 'learn-mode': 2, wordle: 1 });
    assert.deepStrictEqual(r.Repeal.sources.sort(), ['learn-mode', 'wordle']);
    assert.strictEqual(r.Boycott.count['learn-mode'], 3);
});
test('learn-mode-tiers: union of terms, device wins a clash', () => {
    const r = merge('learn-mode-tiers', { tyranny: 3 }, { tyranny: 2, Repeal: 2 });
    assert.deepStrictEqual(r, { tyranny: 3, Repeal: 2 });
});
test('weakness_tracker: union of terms', () => {
    const r = merge('weakness_tracker', { terms: { Boycott: 1 } }, { terms: { Loyalist: 2 } });
    assert.deepStrictEqual(r.terms, { Boycott: 1, Loyalist: 2 });
});
test('weakness_tracker: higher count wins a clash', () => {
    const r = merge('weakness_tracker', { terms: { Boycott: 1 } }, { terms: { Boycott: 5 } });
    assert.strictEqual(r.terms.Boycott, 5);
});
test('weakness_tracker: a term cleared on one device does not come back from the other', () => {
    const r = merge('weakness_tracker',
        { terms: {}, cleared: { Boycott: 2000 } },
        { terms: { Boycott: 3, Loyalist: 1 }, at: { Boycott: 1000, Loyalist: 1000 } });
    assert.deepStrictEqual(r.terms, { Loyalist: 1 });
    assert.strictEqual(r.cleared.Boycott, 2000);
    // an older cloud copy with no times is treated as older than the clear
    const r2 = merge('weakness_tracker', { terms: {}, cleared: { Boycott: 2000 } }, { terms: { Boycott: 3 } });
    assert.deepStrictEqual(r2.terms, {});
});
test('weakness_tracker: a miss after the clear keeps the term', () => {
    const r = merge('weakness_tracker',
        { terms: {}, cleared: { Boycott: 2000 } },
        { terms: { Boycott: 1 }, at: { Boycott: 3000 } });
    assert.deepStrictEqual(r.terms, { Boycott: 1 });
});
test('sameData: key order does not matter, content does', () => {
    assert.strictEqual(ctx.PM._sameData({ a: 1, b: { c: [1, 2], d: 2 } }, { b: { d: 2, c: [1, 2] }, a: 1 }), true);
    assert.strictEqual(ctx.PM._sameData({ a: 1 }, { a: 2 }), false);
    assert.strictEqual(ctx.PM._sameData(['a', 'b'], ['b', 'a']), false);
    ['term-mastery', 'learn-mode-tiers', 'weakness_tracker', 'badges', 'learn-mode-reflections'].forEach(k => {
        const v = k === 'badges' ? ['a', 'b'] : k === 'learn-mode-reflections' ? [{ text: 'a', timestamp: 1 }] : k === 'term-mastery' ? { Repeal: { sources: ['wordle'], count: { wordle: 1 } } } : k === 'weakness_tracker' ? { terms: { Boycott: 1 } } : { tyranny: 3 };
        assert.strictEqual(ctx.PM._sameData(ctx.PM.mergeActivityData(k, v, JSON.parse(JSON.stringify(v))), v), true, k + ' unchanged after merging with itself');
    });
});
test('reflections: both devices kept, no duplicates, oldest first', () => {
    const a = { text: 'a', timestamp: 1 }, b = { text: 'b', timestamp: 2 }, c = { text: 'c', timestamp: 3 };
    const r = merge('learn-mode-reflections', [c, a], [a, b]);
    assert.deepStrictEqual(r.map(e => e.text), ['a', 'b', 'c']);
});
test('learn-mode-sessions: union keeps the 20 newest', () => {
    const mk = n => ({ mode: 'smart', timestamp: n });
    const r = merge('learn-mode-sessions', Array.from({ length: 15 }, (_, i) => mk(i + 10)), Array.from({ length: 15 }, (_, i) => mk(i)));
    assert.strictEqual(r.length, 20);
    assert.strictEqual(r[0].timestamp, 5);
    assert.strictEqual(r[19].timestamp, 24);
});
test('badges: union', () => {
    assert.deepStrictEqual(merge('badges', ['a'], ['b', 'a']).sort(), ['a', 'b']);
});
test('textbook: a written answer on a brief reading keeps the later save, and a sent copy on a tie', () => {
    const k = 'seg/sec';
    let m = merge('activity_textbook', { readingPrompts: { [k]: { answer: 'new', savedAt: 5, sent: false } } }, { readingPrompts: { [k]: { answer: 'old', savedAt: 1, sent: true } } });
    assert.strictEqual(m.readingPrompts[k].answer, 'new');
    m = merge('activity_textbook', { readingPrompts: { [k]: { answer: 'same', savedAt: 5, sent: false } } }, { readingPrompts: { [k]: { answer: 'same', savedAt: 5, sent: true } } });
    assert.strictEqual(m.readingPrompts[k].sent, true);
    m = merge('activity_textbook', { readingPrompts: { a: { answer: 'x', savedAt: 1 } } }, { readingPrompts: { b: { answer: 'y', savedAt: 2 } } });
    assert.deepStrictEqual(Object.keys(m.readingPrompts).sort(), ['a', 'b']);
});
// Rules that arrived with Unit 3 and now share the function with the ones above.
test('short answer: newer draft wins, earned points stay earned', () => {
    const m = merge('activity_short-answer-2', { answer: 'new draft', updatedAt: 5 }, { answer: 'old', updatedAt: 1, complete: true });
    assert.strictEqual(m.answer, 'new draft');
    assert.strictEqual(m.complete, true);
});

test('power sort: better score per sort is kept from either device', () => {
    const m = merge('activity_power-sort', { best: { branches: 3 }, updatedAt: 2 }, { best: { branches: 9, federalism: 4 }, updatedAt: 1 });
    assert.deepStrictEqual(m.best, { branches: 9, federalism: 4 });
});

test('activityTimeByDay: each day and activity keeps the larger figure, never the sum', () => {
    const local = { days: { '2026-11-16': { wordle: 600000, flashcards: 120000 }, '2026-11-17': { textbook: 300000 } } };
    const remote = { days: { '2026-11-16': { wordle: 900000, hangman: 60000 }, '2026-11-15': { flashcards: 240000 } } };
    assert.deepStrictEqual(merge('activityTimeByDay', local, remote), { days: {
        '2026-11-15': { flashcards: 240000 },
        '2026-11-16': { wordle: 900000, hangman: 60000, flashcards: 120000 },
        '2026-11-17': { textbook: 300000 } } });
});
test('activityTimeByDay: merging the result again changes nothing', () => {
    const a = { days: { '2026-11-16': { wordle: 600000 } } }, b = { days: { '2026-11-16': { wordle: 900000 } } };
    const once = merge('activityTimeByDay', a, b);
    assert.deepStrictEqual(merge('activityTimeByDay', once, b), once);
    assert.deepStrictEqual(merge('activityTimeByDay', a, once), once);
});
test('activityTimeByDay: only the newest six weeks are kept, and a missing side falls back', () => {
    const days = {}; for (let i = 1; i <= 50; i++) days['2026-' + String(10 + Math.floor((i - 1) / 28)).padStart(2, '0') + '-' + String(1 + (i - 1) % 28).padStart(2, '0')] = { wordle: i };
    const m = merge('activityTimeByDay', { days }, { days: {} });
    assert.strictEqual(Object.keys(m.days).length, 42);
    assert.ok(!('2026-10-01' in m.days) && ('2026-11-22' in m.days));
    assert.deepStrictEqual(merge('activityTimeByDay', null, { days: { '2026-11-16': { wordle: 5 } } }), { days: { '2026-11-16': { wordle: 5 } } });
});

console.log(passed + ' passed');
