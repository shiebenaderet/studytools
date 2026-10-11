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

    // Lenient check for a typed answer: case, punctuation, extra spaces and a
    // leading "the" are ignored, and one typo is forgiven (two for long answers).
    answerMatches(typed, answer) {
        var norm = function(str) {
            return StudyUtils.normalizeTerm(String(str || '')).replace(/^the\s+/, '').replace(/\s+/g, ' ').trim();
        };
        var t = norm(typed);
        var a = norm(answer);
        if (!t || !a) return false;
        if (t === a) return true;
        var allowed = a.length >= 10 ? 2 : (a.length >= 5 ? 1 : 0);
        return StudyUtils.editDistance(t, a) <= allowed;
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
