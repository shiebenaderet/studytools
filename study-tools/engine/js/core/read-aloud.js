/* Read-aloud for the textbook: the browser's own speech, one sentence at a time,
   with the sentence being read highlighted. Ported from the ams reader-tools.js
   used on the class readings, so students see the same Listen control in both.

   One sentence per utterance because Chrome stops long utterances partway on
   some voices. Pause is a cancel that remembers the sentence, because
   speechSynthesis.pause() is unreliable with Chrome's network voices.

   ReadAloud.attach(barHost, contentRoot) builds the control in barHost and reads
   the p / li / blockquote / callout text inside contentRoot, in page order.
   ReadAloud.stop() is called whenever the section changes. */
var ReadAloud = (function () {
    var synth = window.speechSynthesis || null;
    var HAS_HL = !!(window.CSS && CSS.highlights && window.Highlight);
    var PREF_KEY = 'readAloudRate';
    var voice = null;
    var items = [], idx = 0, playing = false, token = 0;
    var ui = null, root = null, markedEl = null;
    var rate = 1;
    try { rate = +localStorage.getItem(PREF_KEY) || 1; } catch (e) { rate = 1; }

    function pickVoice() {
        if (!synth) return;
        var vs = synth.getVoices(), best = null, score = -1;
        for (var i = 0; i < vs.length; i++) {
            var v = vs[i], l = (v.lang || '').toLowerCase().replace('_', '-');
            if (l.split('-')[0] !== 'en') continue;
            var s = 1;
            if (/natural|online|neural/i.test(v.name)) s += 4;
            if (/google/i.test(v.name)) s += 3;
            if (l === 'en-us') s += 2;
            if (v.localService === false) s += 1;
            if (s > score) { score = s; best = v; }
        }
        voice = best;
    }
    if (synth) {
        pickVoice();
        if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);
    }

    function split(text) {
        var res = [];
        if (window.Intl && Intl.Segmenter) {
            var seg = new Intl.Segmenter('en', { granularity: 'sentence' });
            var it = seg.segment(text)[Symbol.iterator](), n;
            while (!(n = it.next()).done) {
                var a = n.value.index, b = a + n.value.segment.length;
                if (text.slice(a, b).replace(/\s/g, '')) res.push([a, b]);
            }
            return res;
        }
        var re = /[^.!?]+[.!?]*["”’)]*\s*/g, m;
        while ((m = re.exec(text))) {
            if (m[0].replace(/\s/g, '')) res.push([m.index, m.index + m[0].length]);
            if (!m[0]) re.lastIndex++;
        }
        return res.length ? res : [[0, text.length]];
    }

    // Leaf text blocks in reading order: a heading, paragraphs, list items,
    // quotes and callout text. Blocks nested inside another block are skipped.
    function collect(el) {
        var out = [];
        var sel = '.tb-section-heading > span, .tb-content p, .tb-content li, .tb-content h4, .tb-content h5, .tb-content blockquote, .tb-callout-text, .tb-quote, .tb-quote-attr';
        var blocks = el.querySelectorAll(sel);
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            var parentBlock = b.parentElement && b.parentElement.closest('.tb-content p, .tb-content li, .tb-content blockquote');
            if (parentBlock && el.contains(parentBlock)) continue;
            var text = b.textContent;
            var sents = split(text);
            for (var s = 0; s < sents.length; s++) {
                var said = text.slice(sents[s][0], sents[s][1]).replace(/—/g, ', ').replace(/\s+/g, ' ').trim();
                if (!said) continue;
                out.push({ el: b, start: sents[s][0], end: sents[s][1], text: said });
            }
        }
        return out;
    }

    function rangeFor(el, start, end) {
        var range = document.createRange();
        var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var pos = 0, node, set = false;
        while ((node = tw.nextNode())) {
            var len = node.nodeValue.length;
            if (!set && start < pos + len) { range.setStart(node, start - pos); set = true; }
            if (set && end <= pos + len) { range.setEnd(node, end - pos); return range; }
            pos += len;
        }
        if (set) range.setEndAfter(el.lastChild || el);
        else range.selectNodeContents(el);
        return range;
    }

    function mark(item) {
        clearMark();
        if (!item) return;
        if (HAS_HL) CSS.highlights.set('ra-sent', new Highlight(rangeFor(item.el, item.start, item.end)));
        else { item.el.classList.add('ra-cur'); markedEl = item.el; }
        var r = item.el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (r.top < 80 || r.bottom > vh - 80) item.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    function clearMark() {
        if (HAS_HL) CSS.highlights.delete('ra-sent');
        if (markedEl) { markedEl.classList.remove('ra-cur'); markedEl = null; }
    }

    function speakFrom(i) {
        token++;
        var my = token;
        if (synth) synth.cancel();
        if (i >= items.length) { stop(); return; }
        idx = i;
        playing = true;
        var it = items[i];
        mark(it);
        render();
        var u = new SpeechSynthesisUtterance(it.text);
        if (voice) u.voice = voice;
        u.lang = voice ? voice.lang : 'en-US';
        u.rate = rate;
        u.onend = function () { if (my === token && playing) speakFrom(idx + 1); };
        u.onerror = function (e) {
            if (my !== token) return;
            if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
            speakFrom(idx + 1);
        };
        synth.speak(u);
    }

    function pause() {
        playing = false;
        token++;
        if (synth) synth.cancel();
        render();
    }
    function stop() {
        pause();
        clearMark();
        idx = 0;
        if (ui) ui.bar.classList.remove('ra-on');
        render();
    }

    function icon(cls) {
        var i = document.createElement('i');
        i.className = cls;
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function render() {
        if (!ui) return;
        var on = ui.bar.classList.contains('ra-on');
        ui.listen.style.display = on ? 'none' : '';
        ui.controls.style.display = on ? '' : 'none';
        ui.pp.textContent = '';
        ui.pp.appendChild(icon(playing ? 'fas fa-pause' : 'fas fa-play'));
        ui.pp.appendChild(document.createTextNode(playing ? ' Pause' : ' Resume'));
        ui.pp.setAttribute('aria-label', playing ? 'Pause' : 'Resume');
    }

    function attach(host, contentRoot) {
        stop();
        root = contentRoot;
        if (!synth || !window.SpeechSynthesisUtterance) return null;

        var bar = document.createElement('div');
        bar.className = 'ra-bar';

        var listen = document.createElement('button');
        listen.type = 'button';
        listen.className = 'ra-btn ra-listen';
        listen.appendChild(icon('fas fa-volume-up'));
        listen.appendChild(document.createTextNode(' Listen'));
        listen.title = 'Read this section aloud';
        listen.addEventListener('click', function () {
            items = collect(root);
            if (!items.length) return;
            bar.classList.add('ra-on');
            speakFrom(0);
        });
        bar.appendChild(listen);

        var controls = document.createElement('div');
        controls.className = 'ra-controls';

        var pp = document.createElement('button');
        pp.type = 'button';
        pp.className = 'ra-btn';
        pp.addEventListener('click', function () {
            if (playing) pause(); else speakFrom(idx);
        });
        controls.appendChild(pp);

        var back = document.createElement('button');
        back.type = 'button';
        back.className = 'ra-btn';
        back.setAttribute('aria-label', 'Back one sentence');
        back.title = 'Back one sentence';
        back.appendChild(icon('fas fa-step-backward'));
        back.addEventListener('click', function () { speakFrom(Math.max(0, idx - 1)); });
        controls.appendChild(back);

        var fwd = document.createElement('button');
        fwd.type = 'button';
        fwd.className = 'ra-btn';
        fwd.setAttribute('aria-label', 'Next sentence');
        fwd.title = 'Next sentence';
        fwd.appendChild(icon('fas fa-step-forward'));
        fwd.addEventListener('click', function () { speakFrom(Math.min(items.length - 1, idx + 1)); });
        controls.appendChild(fwd);

        var stopBtn = document.createElement('button');
        stopBtn.type = 'button';
        stopBtn.className = 'ra-btn';
        stopBtn.appendChild(icon('fas fa-stop'));
        stopBtn.appendChild(document.createTextNode(' Stop'));
        stopBtn.addEventListener('click', stop);
        controls.appendChild(stopBtn);

        var speed = document.createElement('select');
        speed.className = 'ra-speed';
        speed.setAttribute('aria-label', 'Speed');
        [['0.75', 'Slower'], ['1', 'Normal'], ['1.25', 'Faster']].forEach(function (o) {
            var opt = document.createElement('option');
            opt.value = o[0];
            opt.textContent = o[1];
            if (+o[0] === rate) opt.selected = true;
            speed.appendChild(opt);
        });
        speed.addEventListener('change', function () {
            rate = +speed.value || 1;
            try { localStorage.setItem(PREF_KEY, String(rate)); } catch (e) { /* private mode */ }
            if (playing) speakFrom(idx);
        });
        controls.appendChild(speed);

        bar.appendChild(controls);
        host.appendChild(bar);
        ui = { bar: bar, listen: listen, controls: controls, pp: pp };
        render();
        return bar;
    }

    window.addEventListener('hashchange', function () { if (playing) stop(); });
    window.addEventListener('pagehide', function () { if (synth) synth.cancel(); });

    return { attach: attach, stop: stop, _split: split };
})();
