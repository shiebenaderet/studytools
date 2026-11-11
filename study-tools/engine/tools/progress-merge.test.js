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
test('learn-mode-streak: keeps later day and longest best', () => {
    const r = merge('learn-mode-streak',
        { currentStreak: 1, longestStreak: 1, lastSessionDate: 'Wed Oct 28 2026' },
        { currentStreak: 20, longestStreak: 20, lastSessionDate: 'Tue Oct 27 2026' });
    assert.strictEqual(r.currentStreak, 1);
    assert.strictEqual(r.longestStreak, 20);
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
console.log(passed + ' passed');
