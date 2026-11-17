// Notebook Companion (Tools): what to put in your notebook before the quiz.
// The rules live in notebook-core.js; this file draws the page, the print view
// and the reread note on the unit home screen.
const NotebookCompanion = {

    _el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    },

    _icon(cls) {
        const i = document.createElement('i');
        i.className = cls;
        i.setAttribute('aria-hidden', 'true');
        return i;
    },

    _shortDate(t) {
        return new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    },

    // Everything the page needs, read from progress.
    async _gather() {
        const config = StudyEngine.config;
        const unitId = config.unit.id;
        const textbook = await MasteryManager._loadTextbook(unitId);
        const open = MasteryManager.getEarnedCategories(unitId, config);
        const nb = ProgressManager.getActivityProgress(unitId, 'notebook') || {};
        const fc = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        const weak = ProgressManager.load(unitId, 'weakness_tracker') || {};
        const pt = ProgressManager.getActivityProgress(unitId, 'practice-test-mastery') || {};
        const tb = ProgressManager.getActivityProgress(unitId, 'textbook') || {};
        const drafts = {};
        (config.shortAnswerQuestions || []).forEach((q, i) => {
            drafts[i] = ProgressManager.getActivityProgress(unitId, 'short-answer-' + i);
        });
        return {
            config, unitId, textbook, open,
            checks: nb.terms || {},
            vocab: NotebookCore.vocabChecklist(config, nb.terms, fc.mastered, weak.terms, open),
            missed: NotebookCore.missedQuestions(config, pt),
            outlines: NotebookCore.outlines(config, textbook, drafts),
            plan: NotebookCore.readingPlan({ config, textbook, tbProgress: tb, weak, openCategories: open })
        };
    },

    _openSection(segId, secId) {
        StudyEngine.activateActivity('textbook', [segId, secId]);
    },

    async open() {
        const config = StudyEngine.config;
        if (!config || typeof NotebookCore === 'undefined') return;
        const data = await this._gather();

        const container = document.getElementById('activity-container');
        container.classList.add('active');
        document.getElementById('home-section').classList.remove('active');
        document.getElementById('sub-nav').classList.remove('active');
        container.textContent = '';

        const backBtn = this._el('button', 'nav-button');
        backBtn.style.marginBottom = '16px';
        backBtn.append(this._icon('fas fa-arrow-left'), document.createTextNode(' Back to Tools'));
        backBtn.addEventListener('click', () => {
            StudyEngine.showTools();
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.group === 'tools');
            });
        });
        container.appendChild(backBtn);

        const wrap = this._el('div', 'study-guide-container nb-page');
        const header = this._el('div', 'study-guide-header nb-header');
        const h2 = this._el('h2');
        h2.style.color = 'var(--primary-text)';
        h2.append(this._icon('fas fa-book'), document.createTextNode(' Notebook Companion'));
        header.appendChild(h2);
        const quiz = NotebookCore.quizTime(config.unit.quizDate);
        const sub = this._el('p', 'nb-sub', quiz
            ? 'Get your notebook ready for the ' + (config.unit.quizLabel || 'quiz').toLowerCase() + ' on ' + this._shortDate(quiz) + '. This page updates as you study.'
            : 'Get your notebook ready for the quiz. This page updates as you study.');
        header.appendChild(sub);
        const printBtn = this._el('button', 'nav-button nb-print');
        printBtn.append(this._icon('fas fa-print'), document.createTextNode(' Print this list'));
        printBtn.addEventListener('click', () => this.print(data));
        header.appendChild(printBtn);
        wrap.appendChild(header);

        wrap.appendChild(this._renderReading(data));
        wrap.appendChild(this._renderVocab(data));
        wrap.appendChild(this._renderMissed(data));
        wrap.appendChild(this._renderOutlines(data));
        container.appendChild(wrap);
    },

    _section(cls, icon, title, intro) {
        const sec = this._el('section', 'study-guide-section nb-section ' + cls);
        const h3 = this._el('h3');
        h3.append(this._icon(icon), document.createTextNode(' ' + title));
        sec.appendChild(h3);
        if (intro) sec.appendChild(this._el('p', 'nb-intro', intro));
        return sec;
    },

    _sectionLink(item, label) {
        const b = this._el('button', 'nb-link');
        b.append(this._icon('fas fa-book-open'), document.createTextNode(' ' + (label || item.heading)));
        b.addEventListener('click', () => this._openSection(item.segId, item.secId));
        return b;
    },

    // ── Read and reread ──
    _renderReading(data) {
        const plan = data.plan;
        const sec = this._section('nb-reading', 'fas fa-redo', 'Read and reread',
            'Rereading a section a few days later helps it stick. When a section is due, open it and tap Mark as Reread at the bottom.');
        if (!data.textbook) {
            sec.appendChild(this._el('p', 'nb-empty', 'This unit has no textbook.'));
            return sec;
        }
        const groups = [
            ['Reread now', plan.reread, true],
            ['Read for the first time', plan.read, false]
        ];
        let any = false;
        groups.forEach(([label, items, showReason]) => {
            if (!items.length) return;
            any = true;
            sec.appendChild(this._el('div', 'study-guide-cat', label + ' (' + items.length + ')'));
            items.forEach(item => {
                const row = this._el('div', 'nb-row');
                row.appendChild(this._sectionLink(item));
                row.appendChild(this._el('span', 'nb-meta', showReason ? item.reason : item.category));
                sec.appendChild(row);
            });
        });
        if (plan.upcoming.length) {
            any = true;
            sec.appendChild(this._el('div', 'study-guide-cat', 'Coming up'));
            plan.upcoming.slice(0, 5).forEach(item => {
                const row = this._el('div', 'nb-row nb-upcoming');
                row.appendChild(this._el('span', 'nb-date', this._shortDate(item.at)));
                row.appendChild(this._el('span', null, item.heading));
                sec.appendChild(row);
            });
            if (plan.upcoming.length > 5) sec.appendChild(this._el('p', 'nb-meta', 'and ' + (plan.upcoming.length - 5) + ' more later.'));
        }
        if (!any) sec.appendChild(this._el('p', 'nb-empty', 'You are all caught up on reading. Check back in a few days.'));
        return sec;
    },

    // ── Vocabulary checklist ──
    _renderVocab(data) {
        const sec = this._section('nb-vocab', 'fas fa-check-square', 'Vocabulary checklist',
            'Tick each key term once its half-sheet is glued in your notebook.');
        const all = data.vocab.filter(g => g.open).reduce((n, g) => n + g.terms.length, 0);
        const done = data.vocab.filter(g => g.open).reduce((n, g) => n + g.terms.filter(t => t.inNotebook).length, 0);
        const count = this._el('p', 'nb-count', done + ' of ' + all + ' in your notebook');
        sec.appendChild(count);
        const schedule = data.config.categorySchedule || {};
        data.vocab.forEach(group => {
            const cat = this._el('div', 'study-guide-cat', group.category);
            sec.appendChild(cat);
            if (!group.open) {
                const opens = NotebookCore.quizTime(schedule[group.category]);
                sec.appendChild(this._el('p', 'nb-meta', opens ? 'Opens ' + this._shortDate(opens) + '.' : 'Opens later.'));
                return;
            }
            group.terms.forEach(t => {
                const row = this._el('label', 'nb-check');
                const box = document.createElement('input');
                box.type = 'checkbox';
                box.checked = t.inNotebook;
                box.addEventListener('change', () => {
                    this._saveCheck(data.unitId, t.term, box.checked);
                    t.inNotebook = box.checked;
                    const d = data.vocab.filter(g => g.open).reduce((n, g) => n + g.terms.filter(x => x.inNotebook).length, 0);
                    count.textContent = d + ' of ' + all + ' in your notebook';
                });
                row.appendChild(box);
                const text = this._el('span', 'nb-term');
                text.appendChild(this._el('strong', null, t.term));
                text.appendChild(document.createTextNode(' ' + String.fromCharCode(8212) + ' ' + t.definition));
                if (t.misses >= 2) text.appendChild(this._el('span', 'nb-badge nb-badge-miss', 'missed ' + t.misses + ' times'));
                else if (t.mastered) text.appendChild(this._el('span', 'nb-badge nb-badge-ok', 'mastered'));
                row.appendChild(text);
                sec.appendChild(row);
            });
        });
        return sec;
    },

    _saveCheck(unitId, term, on) {
        const nb = ProgressManager.getActivityProgress(unitId, 'notebook') || {};
        nb.terms = nb.terms || {};
        nb.terms[term] = { on: !!on, at: Date.now() };
        ProgressManager.saveActivityProgress(unitId, 'notebook', nb);
    },

    // ── Missed questions ──
    _renderMissed(data) {
        const sec = this._section('nb-missed', 'fas fa-times-circle', 'Questions you have missed',
            'Copy each question into your notebook. Try to answer it first, then check and write the right answer in your own words.');
        if (!data.missed.length) {
            sec.appendChild(this._el('p', 'nb-empty', 'No missed questions right now. Questions you miss in Practice Test, Learn Mode and Tower Defense show up here until you get them right.'));
            return sec;
        }
        data.missed.forEach(m => {
            const card = this._el('div', 'nb-card');
            if (m.category) card.appendChild(this._el('div', 'nb-meta', m.category));
            card.appendChild(this._el('p', 'nb-q', m.question));
            const ans = this._el('div', 'nb-answer');
            ans.hidden = true;
            const a = this._el('p');
            a.appendChild(this._el('strong', null, 'Answer: '));
            a.appendChild(document.createTextNode(m.answer));
            ans.appendChild(a);
            if (m.explanation) ans.appendChild(this._el('p', 'nb-meta', m.explanation));
            const show = this._el('button', 'study-guide-toggle', 'Show answer');
            show.addEventListener('click', () => {
                ans.hidden = !ans.hidden;
                show.textContent = ans.hidden ? 'Show answer' : 'Hide answer';
            });
            card.append(show, ans);
            sec.appendChild(card);
        });
        return sec;
    },

    // ── Short-answer outlines ──
    _renderOutlines(data) {
        const sec = this._section('nb-outlines', 'fas fa-list-ol', 'Short-answer outlines',
            'These are the short-answer questions on your quiz. Copy each frame into your notebook and fill it in with your own words.');
        if (!data.outlines.length) {
            sec.appendChild(this._el('p', 'nb-empty', 'This unit has no short-answer questions.'));
            return sec;
        }
        data.outlines.forEach(o => {
            const card = this._el('div', 'nb-card');
            if (o.category) card.appendChild(this._el('div', 'nb-meta', o.category));
            card.appendChild(this._el('p', 'nb-q', o.question));
            const frame = this._el('ol', 'nb-frame');
            o.parts.forEach(p => {
                const li = this._el('li');
                li.appendChild(this._el('strong', null, p + ':'));
                li.appendChild(this._el('span', 'nb-blank'));
                frame.appendChild(li);
            });
            card.appendChild(frame);
            if (o.keyTerms.length) {
                const kt = this._el('p', 'nb-meta');
                kt.appendChild(this._el('strong', null, 'Terms to use: '));
                kt.appendChild(document.createTextNode(o.keyTerms.join(', ')));
                card.appendChild(kt);
            }
            if (o.reread.length) {
                const rr = this._el('div', 'nb-links');
                rr.appendChild(this._el('span', 'nb-meta', 'Reread: '));
                o.reread.forEach(s => rr.appendChild(this._sectionLink(s)));
                card.appendChild(rr);
            }
            card.appendChild(this._el('p', 'nb-meta', o.hasDraft
                ? 'You have a draft of this in Short Answer.'
                : 'Practice writing it in Short Answer or Response Builder.'));
            sec.appendChild(card);
        });
        return sec;
    },

    // ── Print ──
    print(data) {
        const win = window.open('', '_blank');
        if (!win) {
            if (typeof StudyUtils !== 'undefined') StudyUtils.showToast('Allow pop-ups to print this list.', 'info');
            return;
        }
        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Notebook Companion</title>' +
            '<style>body{font-family:Georgia,serif;max-width:700px;margin:32px auto;padding:0 20px;color:#222;line-height:1.45}' +
            'h1{border-bottom:2px solid #333;padding-bottom:6px;font-size:1.5em}h2{margin-top:26px;font-size:1.15em}' +
            'h3{margin:14px 0 4px;font-size:.95em;text-transform:uppercase;letter-spacing:.04em;color:#555}' +
            '.row{margin:3px 0}.q{margin:12px 0 2px;font-weight:bold}.small{color:#555;font-size:.9em}' +
            '.line{border-bottom:1px solid #999;height:1.6em;margin:2px 0 6px}' +
            '@media print{h2{break-after:avoid}.q{break-after:avoid}}</style></head><body></body></html>');
        doc.close();
        const add = (tag, text, cls) => {
            const e = doc.createElement(tag);
            if (cls) e.className = cls;
            e.textContent = text;
            doc.body.appendChild(e);
            return e;
        };
        add('h1', data.config.unit.title.replace(/ Study Tool$/, '') + ': Notebook Companion');

        const p = data.plan;
        if (p.reread.length || p.read.length || p.upcoming.length) {
            add('h2', 'Read and reread');
            p.reread.forEach(i => add('div', '☐ Reread: ' + i.heading + ' (' + i.reason + ')', 'row'));
            p.read.forEach(i => add('div', '☐ Read: ' + i.heading, 'row'));
            p.upcoming.forEach(i => add('div', '☐ ' + this._shortDate(i.at) + ': reread ' + i.heading, 'row'));
        }

        add('h2', 'Vocabulary checklist');
        data.vocab.filter(g => g.open).forEach(g => {
            add('h3', g.category);
            g.terms.forEach(t => add('div', (t.inNotebook ? '☑ ' : '☐ ') + t.term + ' — ' + t.definition, 'row'));
        });

        if (data.missed.length) {
            add('h2', 'Questions I have missed');
            data.missed.forEach(m => {
                add('div', m.question, 'q');
                add('div', 'Answer: ' + m.answer, 'small');
            });
        }

        if (data.outlines.length) {
            add('h2', 'Short-answer outlines');
            data.outlines.forEach(o => {
                add('div', o.question, 'q');
                if (o.keyTerms.length) add('div', 'Terms to use: ' + o.keyTerms.join(', '), 'small');
                o.parts.forEach(part => {
                    add('div', part + ':', 'small');
                    add('div', '', 'line');
                });
            });
        }
        win.print();
    },

    // ── Home screen note ──
    // One line under the quiz countdown when a reread is due.
    async renderHomeReminder(config) {
        const old = document.getElementById('nb-reminder');
        if (old) old.remove();
        if (!config || typeof NotebookCore === 'undefined') return;
        const unitId = config.unit.id;
        const textbook = await MasteryManager._loadTextbook(unitId);
        if (!textbook || StudyEngine.config !== config) return;
        const plan = NotebookCore.readingPlan({
            config, textbook,
            tbProgress: ProgressManager.getActivityProgress(unitId, 'textbook') || {},
            weak: ProgressManager.load(unitId, 'weakness_tracker') || {},
            openCategories: MasteryManager.getEarnedCategories(unitId, config)
        });
        if (!plan.reread.length || document.getElementById('nb-reminder')) return;
        const note = this._el('button', 'nb-reminder');
        note.id = 'nb-reminder';
        note.type = 'button';
        note.appendChild(this._icon('fas fa-redo'));
        const first = plan.reread[0].heading;
        const more = plan.reread.length - 1;
        note.appendChild(document.createTextNode(' Reread today: ' + first + (more ? ' and ' + more + ' more' : '')));
        note.addEventListener('click', () => this.open());
        document.getElementById('site-header').appendChild(note);
    }
};
