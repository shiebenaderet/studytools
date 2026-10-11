// Textbook highlighter. Select text in a chapter, tap "Highlight"; tap a
// highlight to remove it. The textbook activity owns storage: a highlight is
// { s, e, t } — start and end character offsets in the section's plain text
// plus the highlighted snippet, which is checked on re-render so a highlight
// whose text has since been edited is skipped rather than painted in the
// wrong place. Offsets are per section and per reading level (the text
// differs), so the activity keys lists by segment/section/level.
//
// Marks wrap text nodes only; the text content of the section is unchanged,
// so Read Aloud (which walks text nodes by offset) and the vocab spans keep
// working.
const TextbookHighlights = {
    _contentEl: null,
    _list: null,
    _onChange: null,
    _btn: null,
    _pending: null,
    _selTimer: null,
    _selHandler: null,
    _downHandler: null,
    _clickHandler: null,

    attach(contentEl, list, onChange) {
        this.detach();
        this._contentEl = contentEl;
        this._list = list.slice();
        this._onChange = onChange;
        this._paint();

        var self = this;
        this._selHandler = function() {
            clearTimeout(self._selTimer);
            self._selTimer = setTimeout(function() { self._onSelectionChange(); }, 150);
        };
        document.addEventListener('selectionchange', this._selHandler);

        // Tapping a highlight offers to remove it; other taps dismiss the button
        this._clickHandler = function(e) {
            var mark = e.target.closest ? e.target.closest('mark.tb-hl') : null;
            if (!mark) return;
            e.stopPropagation();
            e.preventDefault();
            var idx = parseInt(mark.dataset.hl, 10);
            var rect = mark.getBoundingClientRect();
            self._showButton('Remove highlight', 'fas fa-eraser', rect, function() {
                self._remove(idx);
            });
        };
        contentEl.addEventListener('click', this._clickHandler);

        this._downHandler = function(e) {
            if (self._btn && !self._btn.contains(e.target)) self._hideButton();
        };
        document.addEventListener('pointerdown', this._downHandler, true);
        window.addEventListener('scroll', this._downHandler, true);
    },

    detach() {
        clearTimeout(this._selTimer);
        if (this._selHandler) document.removeEventListener('selectionchange', this._selHandler);
        if (this._downHandler) {
            document.removeEventListener('pointerdown', this._downHandler, true);
            window.removeEventListener('scroll', this._downHandler, true);
        }
        if (this._clickHandler && this._contentEl) this._contentEl.removeEventListener('click', this._clickHandler);
        this._hideButton();
        this._selHandler = this._downHandler = this._clickHandler = null;
        this._contentEl = null;
        this._list = null;
        this._onChange = null;
        this._pending = null;
    },

    // ---- selection -> pending highlight ----

    _onSelectionChange() {
        if (!this._contentEl) return;
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            if (this._pending) { this._pending = null; this._hideButton(); }
            return;
        }
        var range = sel.getRangeAt(0);
        if (!this._contentEl.contains(range.startContainer) || !this._contentEl.contains(range.endContainer)) {
            if (this._pending) { this._pending = null; this._hideButton(); }
            return;
        }
        var text = range.toString();
        if (!text.trim()) return;
        var start = this._offsetOf(range.startContainer, range.startOffset);
        this._pending = { s: start, e: start + text.length, t: text };
        var self = this;
        this._showButton('Highlight', 'fas fa-highlighter', range.getBoundingClientRect(), function() {
            self._add(self._pending);
        });
    },

    _offsetOf(node, offset) {
        var r = document.createRange();
        r.setStart(this._contentEl, 0);
        r.setEnd(node, offset);
        return r.toString().length;
    },

    _rangeFor(start, end) {
        var range = document.createRange();
        var tw = document.createTreeWalker(this._contentEl, NodeFilter.SHOW_TEXT, null);
        var pos = 0, node, set = false;
        while ((node = tw.nextNode())) {
            var len = node.nodeValue.length;
            if (!set && start < pos + len) { range.setStart(node, start - pos); set = true; }
            if (set && end <= pos + len) { range.setEnd(node, end - pos); return range; }
            pos += len;
        }
        return null;
    },

    // ---- list changes ----

    _add(h) {
        if (!h || !this._contentEl) return;
        var text = this._contentEl.textContent;
        // Merge with anything it overlaps
        var s = h.s, e = h.e;
        var kept = [];
        for (var i = 0; i < this._list.length; i++) {
            var x = this._list[i];
            if (x.e <= s || x.s >= e) { kept.push(x); continue; }
            s = Math.min(s, x.s);
            e = Math.max(e, x.e);
        }
        kept.push({ s: s, e: e, t: text.slice(s, e) });
        kept.sort(function(a, b) { return a.s - b.s; });
        this._list = kept;
        this._pending = null;
        var sel = window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();
        this._hideButton();
        this._paint();
        if (this._onChange) this._onChange(this._list.slice());
    },

    _remove(idx) {
        if (idx < 0 || idx >= this._list.length) return;
        this._list.splice(idx, 1);
        this._hideButton();
        this._paint();
        if (this._onChange) this._onChange(this._list.slice());
    },

    // ---- painting ----

    _paint() {
        var el = this._contentEl;
        if (!el) return;
        this._clear();
        var text = el.textContent;
        for (var i = 0; i < this._list.length; i++) {
            var h = this._list[i];
            if (typeof h.s !== 'number' || typeof h.e !== 'number' || h.e <= h.s) continue;
            if (h.t !== undefined && text.slice(h.s, h.e) !== h.t) continue; // text changed since
            var range = this._rangeFor(h.s, h.e);
            if (range) this._wrapRange(range, i);
        }
    },

    _clear() {
        var marks = this._contentEl.querySelectorAll('mark.tb-hl');
        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            while (m.firstChild) m.parentNode.insertBefore(m.firstChild, m);
            m.parentNode.removeChild(m);
        }
        this._contentEl.normalize();
    },

    _wrapRange(range, idx) {
        var root = range.commonAncestorContainer;
        if (root.nodeType === 3) root = root.parentNode;
        var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        var nodes = [], n;
        while ((n = tw.nextNode())) { if (range.intersectsNode(n)) nodes.push(n); }
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var s = node === range.startContainer ? range.startOffset : 0;
            var e = node === range.endContainer ? range.endOffset : node.nodeValue.length;
            if (e <= s) continue;
            var target = node;
            if (e < node.nodeValue.length) node.splitText(e);
            if (s > 0) target = node.splitText(s);
            var mark = document.createElement('mark');
            mark.className = 'tb-hl';
            mark.dataset.hl = String(idx);
            mark.title = 'Tap to remove this highlight';
            target.parentNode.insertBefore(mark, target);
            mark.appendChild(target);
        }
    },

    // Scroll a highlight into view and flash it (used by the sidebar list)
    reveal(idx) {
        if (!this._contentEl) return;
        var mark = this._contentEl.querySelector('mark.tb-hl[data-hl="' + idx + '"]');
        if (!mark) return;
        mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
        var all = this._contentEl.querySelectorAll('mark.tb-hl[data-hl="' + idx + '"]');
        for (var i = 0; i < all.length; i++) all[i].classList.add('tb-hl-flash');
        setTimeout(function() { for (var j = 0; j < all.length; j++) all[j].classList.remove('tb-hl-flash'); }, 1500);
    },

    // ---- floating button ----

    _showButton(label, iconClass, rect, onAct) {
        this._hideButton();
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tb-hl-btn';
        var icon = document.createElement('i');
        icon.className = iconClass;
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(' ' + label));
        document.body.appendChild(btn);

        // Below the selection, kept on screen; above it when there is no room
        var bw = btn.offsetWidth, bh = btn.offsetHeight;
        var left = rect.left + rect.width / 2 - bw / 2;
        var top = rect.bottom + 10;
        if (left < 8) left = 8;
        if (left + bw > window.innerWidth - 8) left = window.innerWidth - bw - 8;
        if (top + bh > window.innerHeight - 8) top = rect.top - bh - 10;
        if (top < 8) top = 8;
        btn.style.left = left + 'px';
        btn.style.top = top + 'px';

        var acted = false;
        var act = function(e) {
            if (e) e.preventDefault();
            if (acted) return;
            acted = true;
            onAct();
        };
        // mousedown would clear the selection before click fires
        btn.addEventListener('mousedown', function(e) { e.preventDefault(); });
        // touchend + preventDefault keeps iOS from dropping the selection and
        // suppresses the synthetic click, so each tap acts once
        btn.addEventListener('touchend', act);
        btn.addEventListener('click', act);
        this._btn = btn;
    },

    _hideButton() {
        if (this._btn && this._btn.parentNode) this._btn.parentNode.removeChild(this._btn);
        this._btn = null;
    }
};
