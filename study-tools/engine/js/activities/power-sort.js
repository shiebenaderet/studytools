// Power Sort: students place each power or job into the right bin (for
// example, Legislative / Executive / Judicial, or National / State / Both).
// Untimed, one item at a time, with tap targets big enough for a phone.
// Every answer shows a short explanation, and missed items come back at the end.
//
// Config (units/<id>/config.json):
//   "powerSorts": [{
//     "id": "branches", "title": "Which Branch?", "category": "Inside the Constitution",
//     "prompt": "Which branch has this power?",
//     "bins": [{ "id": "legislative", "label": "Legislative", "hint": "Congress" }, ...],
//     "items": [{ "text": "Writes and passes laws", "bin": "legislative",
//                 "explanation": "Article I gives Congress the power to make laws." }, ...]
//   }]
// A set with a `category` stays locked until that category is unlocked, like
// the vocabulary games. Progress: activity 'power-sort' = { best: { setId: n }, perfect: { setId: true } }.
StudyEngine.registerActivity({
    id: 'power-sort',
    name: 'Power Sort',
    icon: 'fas fa-sitemap',
    description: 'Sort powers and jobs into the branch or level of government that holds them',
    category: 'practice',
    requires: ['powerSorts'],

    _config: null,
    _wrap: null,
    _set: null,
    _queue: [],
    _pos: 0,
    _correct: 0,
    _missed: [],

    render(container, config) {
        this._config = config;
        this._wrap = document.createElement('div');
        this._wrap.className = 'ps-container';
        container.appendChild(this._wrap);
        var params = this._deepLinkParams || [];
        var sets = config.powerSorts || [];
        var direct = params.length ? sets.filter(function(s) { return s.id === params[0]; })[0] : null;
        if (direct && this._isUnlocked(direct)) this._start(direct);
        else this._showMenu();
    },

    _el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    },

    _clear() { this._wrap.textContent = ''; },

    _progress() {
        return ProgressManager.getActivityProgress(this._config.unit.id, 'power-sort') || {};
    },

    _isUnlocked(set) {
        if (!set.category) return true;
        if (sessionStorage.getItem('teacher-unlock') === 'true') return true;
        if (typeof MasteryManager === 'undefined') return true;
        var open = MasteryManager.getUnlockedCategories(this._config.unit.id, this._config) || [];
        return open.indexOf(set.category) !== -1;
    },

    _showMenu() {
        var self = this;
        this._clear();
        var head = this._el('div', 'ps-head');
        var icon = this._el('i', 'fas fa-sitemap ps-head-icon');
        head.appendChild(icon);
        head.appendChild(this._el('h2', 'ps-title', 'Power Sort'));
        head.appendChild(this._el('p', 'ps-sub', 'Who holds the power? Read each power or job and tap where it belongs. Every answer explains why.'));
        this._wrap.appendChild(head);

        var prog = this._progress();
        var best = prog.best || {};
        var list = this._el('div', 'ps-set-list');
        (this._config.powerSorts || []).forEach(function(set) {
            var unlocked = self._isUnlocked(set);
            var card = self._el('button', 'ps-set-card' + (unlocked ? '' : ' ps-locked'));
            card.type = 'button';
            card.disabled = !unlocked;
            card.appendChild(self._el('div', 'ps-set-title', set.title));
            var bins = (set.bins || []).map(function(b) { return b.label; }).join(' · ');
            card.appendChild(self._el('div', 'ps-set-bins', bins));
            var meta = unlocked
                ? set.items.length + ' items' + (best[set.id] !== undefined ? ' · Best: ' + best[set.id] + '/' + set.items.length : '')
                : 'Unlocks with ' + set.category;
            var metaEl = self._el('div', 'ps-set-meta', meta);
            if (!unlocked) {
                var lock = self._el('i', 'fas fa-lock');
                metaEl.insertBefore(lock, metaEl.firstChild);
                metaEl.insertBefore(document.createTextNode(' '), lock.nextSibling);
            }
            card.appendChild(metaEl);
            if (unlocked) card.addEventListener('click', function() { self._start(set); });
            list.appendChild(card);
        });
        this._wrap.appendChild(list);
    },

    _start(set, onlyItems) {
        this._set = set;
        this._queue = StudyUtils.shuffle(onlyItems || set.items);
        this._isReview = !!onlyItems;
        this._pos = 0;
        this._correct = 0;
        this._missed = [];
        this._showItem();
    },

    _showItem() {
        var self = this;
        var set = this._set;
        var item = this._queue[this._pos];
        this._clear();

        var top = this._el('div', 'ps-top');
        var back = this._el('button', 'ps-link-btn');
        back.type = 'button';
        back.appendChild(this._el('i', 'fas fa-chevron-left'));
        back.appendChild(document.createTextNode(' All sorts'));
        back.addEventListener('click', function() { self._showMenu(); });
        top.appendChild(back);
        top.appendChild(this._el('span', 'ps-count', (this._pos + 1) + ' of ' + this._queue.length + ' · ' + this._correct + ' correct'));
        this._wrap.appendChild(top);

        var bar = this._el('div', 'ps-bar');
        var fill = this._el('div', 'ps-bar-fill');
        fill.style.width = Math.round(this._pos / this._queue.length * 100) + '%';
        bar.appendChild(fill);
        this._wrap.appendChild(bar);

        this._wrap.appendChild(this._el('div', 'ps-prompt', set.prompt || 'Where does this belong?'));
        var card = this._el('div', 'ps-item', item.text);
        card.setAttribute('aria-live', 'polite');
        this._wrap.appendChild(card);

        var bins = this._el('div', 'ps-bins ps-bins-' + set.bins.length);
        var feedback = this._el('div', 'ps-feedback');
        feedback.setAttribute('aria-live', 'polite');
        set.bins.forEach(function(bin) {
            var b = self._el('button', 'ps-bin');
            b.type = 'button';
            b.dataset.bin = bin.id;
            b.appendChild(self._el('span', 'ps-bin-label', bin.label));
            if (bin.hint) b.appendChild(self._el('span', 'ps-bin-hint', bin.hint));
            b.addEventListener('click', function() { self._answer(bin, item, bins, feedback); });
            bins.appendChild(b);
        });
        this._wrap.appendChild(bins);
        this._wrap.appendChild(feedback);
    },

    _answer(bin, item, binsEl, feedback) {
        var self = this;
        var right = bin.id === item.bin;
        var rightBin = this._set.bins.filter(function(b) { return b.id === item.bin; })[0] || {};
        Array.prototype.forEach.call(binsEl.querySelectorAll('.ps-bin'), function(b) {
            b.disabled = true;
            if (b.dataset.bin === item.bin) b.classList.add('ps-bin-right');
            else if (b.dataset.bin === bin.id) b.classList.add('ps-bin-wrong');
        });
        if (right) this._correct++;
        else this._missed.push(item);

        var verdict = this._el('div', 'ps-verdict ' + (right ? 'ps-verdict-right' : 'ps-verdict-wrong'));
        verdict.appendChild(this._el('i', right ? 'fas fa-check-circle' : 'fas fa-times-circle'));
        verdict.appendChild(document.createTextNode(right ? ' Correct!' : ' Not quite. It belongs in ' + rightBin.label + '.'));
        feedback.appendChild(verdict);
        if (item.explanation) feedback.appendChild(this._el('p', 'ps-explain', item.explanation));

        var next = this._el('button', 'ps-next-btn');
        next.type = 'button';
        var last = this._pos >= this._queue.length - 1;
        next.appendChild(document.createTextNode(last ? 'See results ' : 'Next '));
        next.appendChild(this._el('i', 'fas fa-arrow-right'));
        next.addEventListener('click', function() {
            if (last) self._finish();
            else { self._pos++; self._showItem(); }
        });
        feedback.appendChild(next);
        next.focus();
    },

    _finish() {
        var self = this;
        var set = this._set;
        var total = this._queue.length;
        var newBest = false;
        if (!this._isReview) {
            var prog = this._progress();
            prog.best = prog.best || {};
            prog.perfect = prog.perfect || {};
            if (prog.best[set.id] === undefined || this._correct > prog.best[set.id]) {
                newBest = prog.best[set.id] !== undefined;
                prog.best[set.id] = this._correct;
            }
            if (this._correct === total) prog.perfect[set.id] = true;
            prog.gamesPlayed = (prog.gamesPlayed || 0) + 1;
            ProgressManager.saveActivityProgress(this._config.unit.id, 'power-sort', prog);
        }

        this._clear();
        var res = this._el('div', 'ps-results');
        res.appendChild(this._el('i', 'fas ' + (this._correct === total ? 'fa-trophy' : 'fa-sitemap') + ' ps-head-icon'));
        res.appendChild(this._el('h2', 'ps-title', set.title + (this._isReview ? ': Review' : '')));
        res.appendChild(this._el('div', 'ps-score', this._correct + ' / ' + total));
        var msg = this._correct === total ? 'Perfect sort!'
            : newBest ? 'New best score!'
            : this._missed.length + ' to review below.';
        res.appendChild(this._el('p', 'ps-sub', msg));
        this._wrap.appendChild(res);

        if (this._missed.length) {
            var box = this._el('div', 'ps-missed');
            box.appendChild(this._el('h3', 'ps-missed-title', 'Review these'));
            this._missed.forEach(function(item) {
                var bin = set.bins.filter(function(b) { return b.id === item.bin; })[0] || {};
                var row = self._el('div', 'ps-missed-row');
                var t = self._el('div', 'ps-missed-item');
                t.appendChild(self._el('strong', '', item.text));
                t.appendChild(document.createTextNode(' → ' + bin.label));
                row.appendChild(t);
                if (item.explanation) row.appendChild(self._el('div', 'ps-explain', item.explanation));
                box.appendChild(row);
            });
            this._wrap.appendChild(box);
        }

        var btns = this._el('div', 'ps-result-btns');
        var missed = this._missed.slice();
        if (missed.length) {
            var retry = this._el('button', 'ps-next-btn');
            retry.type = 'button';
            retry.appendChild(this._el('i', 'fas fa-redo'));
            retry.appendChild(document.createTextNode(' Practice the ' + missed.length + ' I missed'));
            retry.addEventListener('click', function() { self._start(set, missed); });
            btns.appendChild(retry);
        }
        var again = this._el('button', 'ps-link-btn');
        again.type = 'button';
        again.textContent = 'Sort all ' + set.items.length + ' again';
        again.addEventListener('click', function() { self._start(set); });
        btns.appendChild(again);
        var menu = this._el('button', 'ps-link-btn');
        menu.type = 'button';
        menu.textContent = 'All sorts';
        menu.addEventListener('click', function() { self._showMenu(); });
        btns.appendChild(menu);
        this._wrap.appendChild(btns);
    },

    activate() {},
    deactivate() {},
    getProgress() { return this._config ? this._progress() : null; },
    loadProgress() {}
});
