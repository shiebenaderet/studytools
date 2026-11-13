// Tests for the core-first rule on practice questions (MasteryManager.getTieredQuestions).
// Run: node study-tools/engine/tools/question-tiers.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const store = {};
const ctx = {
    console,
    sessionStorage: { getItem: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    ProgressManager: {
        getActivityProgress: (unit, act) => store[unit + ':' + act] || null,
        saveActivityProgress: (unit, act, data) => { store[unit + ':' + act] = JSON.parse(JSON.stringify(data)); },
    },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/core/mastery.js'), 'utf8') + '\nthis.MM = MasteryManager;', ctx);
const MM = ctx.MM;
const q = (text, tier) => Object.assign({ question: text, options: ['a', 'b', 'c', 'd'], correct: 0, topic: 'T' }, tier ? { tier } : {});
const cfg = { practiceQuestions: [q('core one'), q('core two'), q('extra one', 'extra'), q('extra two', 'extra')] };
const texts = list => list.map(x => x.question);

let passed = 0;
function test(name, fn) { Object.keys(store).forEach(k => delete store[k]); fn(); passed++; console.log('ok - ' + name); }

test('a unit with no tags is returned whole', () => {
    const plain = [q('a'), q('b')];
    assert.deepStrictEqual(texts(MM.getTieredQuestions('u', { practiceQuestions: plain }, plain)), ['a', 'b']);
});
test('extras are held back until every core question is answered right', () => {
    assert.deepStrictEqual(texts(MM.getTieredQuestions('u', cfg, cfg.practiceQuestions)), ['core one', 'core two']);
    assert.strictEqual(MM.heldBackCount('u', cfg, cfg.practiceQuestions), 2);
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[0]);
    assert.strictEqual(MM.getTieredQuestions('u', cfg, cfg.practiceQuestions).length, 2);
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[1]);
    assert.strictEqual(MM.getTieredQuestions('u', cfg, cfg.practiceQuestions).length, 4);
    assert.strictEqual(MM.heldBackCount('u', cfg, cfg.practiceQuestions), 0);
});
test('only the questions in the list count, so a locked chapter does not hold extras back', () => {
    const open = [cfg.practiceQuestions[0], cfg.practiceQuestions[2]];   // one open core, one open extra
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[0]);
    assert.deepStrictEqual(texts(MM.getTieredQuestions('u', cfg, open)), ['core one', 'extra one']);
});
test('a list of extras only is returned whole (nothing to master first)', () => {
    const only = [cfg.practiceQuestions[2], cfg.practiceQuestions[3]];
    assert.strictEqual(MM.getTieredQuestions('u', cfg, only).length, 2);
});
test('a right answer is recorded once, clears a "wrong" mark, and ignores questions not in the bank', () => {
    store['u:practice-test-mastery'] = { mastered: [], wrong: ['core one'], sessions: 3 };
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[0]);
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[0]);
    MM.noteQuestionRight('u', cfg, { question: 'made up by a game' });
    assert.deepStrictEqual(store['u:practice-test-mastery'], { mastered: ['core one'], wrong: [], sessions: 3 });
});
test('progress is kept per unit', () => {
    MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[0]); MM.noteQuestionRight('u', cfg, cfg.practiceQuestions[1]);
    assert.strictEqual(MM.getTieredQuestions('other', cfg, cfg.practiceQuestions).length, 2);
});
test('Unit 3: 32 core and 28 extra, and every chapter has at least 5 core', () => {
    const u3 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../units/building-a-government/config.json'), 'utf8'));
    const core = u3.practiceQuestions.filter(x => x.tier !== 'extra');
    assert.strictEqual(core.length, 32); assert.strictEqual(u3.practiceQuestions.length, 60);
    const by = {}; core.forEach(x => { by[x.topic] = (by[x.topic] || 0) + 1; });
    Object.keys(by).forEach(t => assert(by[t] >= 5, t));
});
console.log(passed + ' passed');
