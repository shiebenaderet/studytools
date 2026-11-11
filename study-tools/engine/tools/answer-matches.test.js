// Tests for StudyUtils.answerMatches, the shared check for typed answers.
// Run: node study-tools/engine/tools/answer-matches.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
const ctx = { document: {}, console, setTimeout, clearTimeout, requestAnimationFrame() {} };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.SU = StudyUtils;', ctx);
const m = (t, a, o) => ctx.SU.answerMatches(t, a, o);

const unit3 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../units/building-a-government/config.json'), 'utf8'))
    .vocabulary.map(v => v.term);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok - ' + name); }

test('case, punctuation and a leading article are ignored', () => {
    assert(m('the preamble', 'preamble'));
    assert(m('An Anti-Federalist', 'Anti-Federalist'));
    assert(m('bill of rights', 'Bill of Rights'));
    assert(m('Shays Rebellion', "Shays' Rebellion"));
});
test('numbers may be digits or words', () => {
    ['3/5 Compromise', '3/5ths compromise', 'three fifths compromise', 'Three-Fifths Compromise', '3-5ths Compromise', 'three-fifths  compromise']
        .forEach(t => assert(m(t, 'Three-Fifths Compromise', unit3), t));
    assert(m('14th Amendment', 'Fourteenth Amendment'));
    assert(m('fifth amendment', '5th Amendment'));
    assert(m('13 colonies', 'Thirteen Colonies'));
    assert(m('2/3', 'two thirds'));
});
test('hyphens and spacing do not count', () => {
    assert(m('anti federalist', 'Anti-Federalist', unit3));
    assert(m('antifederalist', 'Anti-Federalist', unit3));
    assert(m('checks  and balances', 'checks and balances', unit3));
});
test('typos are forgiven, more for longer answers', () => {
    assert(m('federlism', 'federalism', unit3));
    assert(m('soverignty', 'sovereignty', unit3));
    assert(m('seperation of pwoers', 'separation of powers', unit3));
    assert(m('Articals of Confedaration', 'Articles of Confederation', unit3));
    assert(m('amendmant', 'amendment', unit3));
    assert(m('delegates', 'delegate', unit3));
    assert(m('treatty', 'treaty', unit3));
    assert(m('vito', 'veto', unit3));   // 4 letters: one typo allowed
    assert(!m('cat', 'cede'));
});
test('a different term is never accepted as a typo', () => {
    assert(!m('legislative', 'legislature', unit3));
    assert(!m('legislature', 'legislative', unit3));
    assert(!m('Federalist', 'Anti-Federalist', unit3));
    assert(!m('included', 'excluded', unit3));
    assert(!m('excluded', 'included', unit3));
    assert(!m('confederation', 'convention', unit3));
    assert(!m('Supremacy Clause', 'Commerce Clause', unit3));
    assert(!m('New Jersey Plan', 'Virginia Plan', unit3));
    assert(!m('reserved powers', 'concurrent powers', unit3));
});
test('wrong answers stay wrong', () => {
    assert(!m('Congress', 'convention', unit3));
    assert(!m('representative', 'delegate', unit3));
    assert(!m('consent of the governed', 'popular sovereignty', unit3));
    assert(!m('checks and balances', 'separation of powers', unit3));
    assert(!m('New Jersey Plan', 'Great Compromise', unit3));
    assert(!m('', 'treaty'));
});
test('no two terms in any unit can be mistaken for each other', () => {
    const units = JSON.parse(fs.readFileSync(path.join(__dirname, '../../units/units.json'), 'utf8')).units;
    units.forEach(u => {
        const f = path.join(__dirname, '../../units', u.id, 'config.json');
        if (!fs.existsSync(f)) return;
        const terms = (JSON.parse(fs.readFileSync(f, 'utf8')).vocabulary || []).map(v => v.term);
        terms.forEach(a => terms.forEach(b => {
            if (ctx.SU.answerKey(a) === ctx.SU.answerKey(b)) return;
            assert(!m(a, b, terms), u.id + ': "' + a + '" accepted for "' + b + '"');
        }));
    });
});

console.log(passed + ' passed');
