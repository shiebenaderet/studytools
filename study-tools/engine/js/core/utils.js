const StudyUtils = {
    shuffle(array) {
        // Fisher-Yates shuffle, returns NEW array (don't mutate input)
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    formatTime(seconds) {
        // Returns "MM:SS"
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    formatStudyTime(ms) {
        // Returns "Xh Ym"
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    },

    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    },

    normalizeTerm(term) {
        return term.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    },

    editDistance(a, b) {
        // Levenshtein distance between two strings
        var prev = [];
        for (var j = 0; j <= b.length; j++) prev.push(j);
        for (var i = 1; i <= a.length; i++) {
            var cur = [i];
            for (var k = 1; k <= b.length; k++) {
                var cost = a[i - 1] === b[k - 1] ? 0 : 1;
                cur.push(Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost));
            }
            prev = cur;
        }
        return prev[b.length];
    },

    // Puts a typed answer and the expected one into the same plain form, so
    // "3/5 Compromise", "three fifths compromise" and "Three-Fifths Compromise"
    // compare as equal, as do "14th Amendment" and "Fourteenth Amendment".
    _NUM_WORDS: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
        'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
    _ORD_WORDS: ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
        'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'],
    _TENS: { 2: 'twenty', 3: 'thirty' },
    _numWord(n, ordinal) {
        n = parseInt(n, 10);
        if (n <= 20) return (ordinal ? this._ORD_WORDS : this._NUM_WORDS)[n];
        if (n < 40) {
            var ones = n % 10, tens = this._TENS[Math.floor(n / 10)];
            if (!ones) return ordinal ? tens.replace(/y$/, 'ieth') : tens;
            return tens + ' ' + (ordinal ? this._ORD_WORDS : this._NUM_WORDS)[ones];
        }
        return String(n);
    },
    answerKey(str) {
        var self = this;
        var s = String(str || '').toLowerCase()
            .replace(/[‘’]/g, "'").replace(/[‐-―]/g, '-')
            .replace(/&/g, ' and ');
        // Fractions: 3/5, 3/5ths, 3-5ths -> "three fifths"; 1/2 -> "one half"
        s = s.replace(/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})(?:ths?|rds?|nds?)?\b/g, function(m, a, b) {
            if (+b < 2 || +a > 20 || +b > 20) return m;
            var den = +b === 2 ? 'half' : self._numWord(b, true);
            return self._numWord(a) + ' ' + den + (+a > 1 ? 's' : '');
        }).replace(/halfs\b/g, 'halves');
        // Ordinals and plain numbers: 14th -> fourteenth, 13 -> thirteen
        s = s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, function(m, n) { return self._numWord(n, true); });
        s = s.replace(/\b\d{1,2}\b/g, function(n) { return self._numWord(n); });
        return s.replace(/[-\/]/g, ' ').replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ').trim().replace(/^(the|a|an)\s+/, '');
    },

    // How many wrong letters are forgiven, by the length of the answer.
    // Short answers get none or one: "code" must not pass for "cede", nor
    // "republican" for "republic". Long answers, where a slip is likelier and
    // a different real word is not, get more.
    typoAllowance(len) {
        return len >= 20 ? 4 : len >= 13 ? 3 : len >= 10 ? 2 : len >= 5 ? 1 : 0;
    },

    // Lenient check for a typed answer. Case, punctuation, hyphens, spacing and
    // a leading "the", "a" or "an" are ignored; numbers may be digits or words;
    // and a few typos are forgiven, more for longer answers.
    // `others` (optional) lists the other terms the student could have meant.
    // A guess that is closer to one of those than to the answer is wrong, so
    // "legislative" is never accepted for "legislature".
    answerMatches(typed, answer, others) {
        var t = this.answerKey(typed);
        var a = this.answerKey(answer);
        if (!t || !a) return false;
        if (t === a) return true;
        // Spaces do not count: "bill ofrights", "anti federalist"
        var ts = t.replace(/ /g, ''), as = a.replace(/ /g, '');
        var d = ts === as ? 0 : this.editDistance(ts, as);
        if (d > this.typoAllowance(as.length)) return false;
        if (others && d > 0) {
            for (var i = 0; i < others.length; i++) {
                var o = this.answerKey(others[i]).replace(/ /g, '');
                if (!o || o === as) continue;
                if (o === ts || this.editDistance(ts, o) <= d) return false;
            }
        }
        return true;
    },

    showToast(message, type, duration) {
        // type: 'success', 'error', 'info'
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'info');
        toast.textContent = message;
        // Toasts that overlap in time stack downward instead of covering
        // each other (an achievement and a mastery nudge often fire together).
        const visible = document.querySelectorAll('.toast').length;
        if (visible) toast.style.marginTop = (visible * 52) + 'px';
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration || 3000);
    }
};
