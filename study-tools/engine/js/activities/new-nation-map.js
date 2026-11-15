// The New Nation map (Unit 3): the eastern United States around 1790.
// Explore shows every place labeled, with a list of the fifteen places to tap
// on a phone. The quiz asks for all fifteen in a random order and is timed; a
// perfect run counts for the leaderboard's map bonus.
//
// Data: window.NEW_NATION_MAP (js/data/new-nation-data.js) on top of
// window.CIVIL_WAR_MAP_BASE. Most drawing styles are shared with the colonial
// geography map (the cg-* classes).
// Progress: activity 'new-nation-map' = { bestScore, bestTotal, bestTime, attempts, lastPlayed }.
StudyEngine.registerActivity({
    id: 'new-nation-map',
    name: 'The New Nation Map',
    icon: 'fas fa-map-marked-alt',
    description: 'Find the states, cities, rivers and land that shaped the Constitution, on a map of the country around 1790.',
    category: 'study',

    _container: null,
    _config: null,
    _mode: null,
    _svg: null,
    _shapes: null,        // base-map state name -> [ring, ...]; ring = [[x, y], ...]
    _quizItems: null,
    _quizIndex: 0,
    _quizScore: 0,
    _quizStartTime: null,
    _quizLocked: false,
    _selected: null,

    _NS: 'http://www.w3.org/2000/svg',
    _US_FILL: '#e8c27a',
    _TERRITORY_FILL: '#9fc59a',
    _OTHER_FILL: '#ece6da',

    render(container, config) {
        this._container = container;
        this._config = config;
        this._shapes = null;
        this._showMenu();
    },

    deactivate() {
        this._container = null;
        this._config = null;
        this._mode = null;
        this._svg = null;
    },

    _data() { return window.NEW_NATION_MAP || { places: [] }; },

    _el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    },

    _svgEl(tag, attrs) {
        var e = document.createElementNS(this._NS, tag);
        Object.keys(attrs || {}).forEach(function(k) { e.setAttribute(k, attrs[k]); });
        return e;
    },

    // ─── Menu ─────────────────────────────────────────────

    _showMenu() {
        this._mode = 'menu';
        var c = this._container;
        if (!c) return;
        c.textContent = '';
        c.className = 'cw-map-screen';
        var self = this;

        var wrap = this._el('div', 'cw-map-menu');
        wrap.appendChild(this._el('h2', null, 'The New Nation'));
        wrap.appendChild(this._el('p', 'cw-map-menu-desc',
            'The United States around 1790: the states at the heart of the Constitution, the Northwest Territory, ' +
            'the first two capitals, and the rivers, lakes and mountains around them. Fifteen places in all.'));

        var modes = this._el('div', 'cw-map-modes');
        modes.appendChild(this._modeCard('Explore', 'Every place labeled. Tap one to read why it matters.',
            'fas fa-book-open', function() { self._startLearn(); }));
        modes.appendChild(this._modeCard('Map Quiz', 'Find all fifteen. Get every one right to post your time on the leaderboard.',
            'fas fa-stopwatch', function() { self._startQuiz(); }));
        wrap.appendChild(modes);

        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'new-nation-map') || {};
        if (typeof saved.bestScore === 'number') {
            wrap.appendChild(this._el('div', 'cw-map-best',
                'Best: ' + saved.bestScore + '/' + (saved.bestTotal || this._data().places.length) +
                (saved.bestTime ? ' · fastest perfect run ' + this._formatTime(saved.bestTime) : '')));
        }
        c.appendChild(wrap);
    },

    _modeCard(title, desc, iconClass, onClick) {
        var card = this._el('button', 'cw-map-mode-card');
        card.type = 'button';
        var iconWrap = this._el('div', 'cw-map-mode-icon');
        iconWrap.appendChild(this._el('i', iconClass));
        card.appendChild(iconWrap);
        card.appendChild(this._el('h3', null, title));
        card.appendChild(this._el('p', null, desc));
        card.addEventListener('click', onClick);
        return card;
    },

    // ─── Geometry ─────────────────────────────────────────

    // Parse each base-map shape into rings of points, once
    _loadShapes() {
        if (this._shapes) return this._shapes;
        var shapes = {};
        var base = window.CIVIL_WAR_MAP_BASE || {};
        var parse = function(d) {
            var rings = [];
            String(d).split(/M/i).forEach(function(part) {
                var pts = [];
                var re = /(-?\d+\.?\d*),(-?\d+\.?\d*)/g, m;
                while ((m = re.exec(part))) pts.push([parseFloat(m[1]), parseFloat(m[2])]);
                if (pts.length > 2) rings.push(pts);
            });
            return rings;
        };
        (base.states || []).forEach(function(st) { shapes[st.name] = parse(st.d); });
        this._lakeRings = (base.lakes || []).map(function(l) { return parse(l.d); });
        this._shapes = shapes;
        return shapes;
    },

    _inRings(rings, x, y) {
        var inside = false;
        (rings || []).forEach(function(ring) {
            for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
            }
        });
        return inside;
    },

    _box(names) {
        var shapes = this._loadShapes();
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        names.forEach(function(n) {
            (shapes[n] || []).forEach(function(ring) {
                ring.forEach(function(p) {
                    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
                    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
                });
            });
        });
        return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    },

    _riverPoints(name) {
        var pts = [];
        ((window.CIVIL_WAR_MAP_BASE || {}).rivers || []).forEach(function(river) {
            if (river.name !== name) return;
            river.points.trim().split(/\s+/).forEach(function(p) {
                var xy = p.split(',');
                if (xy.length === 2) pts.push([parseFloat(xy[0]), parseFloat(xy[1])]);
            });
        });
        return pts;
    },

    // Distance from a point to the nearest segment of a polyline
    _distToPath(pts, x, y) {
        if (!pts || !pts.length) return Infinity;
        if (pts.length === 1) return Math.hypot(x - pts[0][0], y - pts[0][1]);
        var best = Infinity;
        for (var i = 1; i < pts.length; i++) {
            var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
            var dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
            var t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
            best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
        }
        return best;
    },

    // The place a point falls in, for a state or territory question
    _regionAt(x, y) {
        var shapes = this._loadShapes();
        var places = this._data().places;
        for (var i = 0; i < places.length; i++) {
            var p = places[i];
            if (p.type !== 'state' && p.type !== 'territory') continue;
            for (var k = 0; k < p.states.length; k++) {
                if (this._inRings(shapes[p.states[k]], x, y)) return { place: p };
            }
        }
        var names = Object.keys(shapes);
        for (var n = 0; n < names.length; n++) {
            if (this._inRings(shapes[names[n]], x, y)) {
                var data = this._data();
                return { name: (data.partOf && data.partOf[names[n]]) || names[n] };
            }
        }
        return null;
    },

    _hitsPlace(place, x, y) {
        var r = place.hitRadius || 40;
        if (place.type === 'state' || place.type === 'territory') {
            var shapes = this._loadShapes(), self = this;
            return place.states.some(function(n) { return self._inRings(shapes[n], x, y); });
        }
        if (place.type === 'lakes') {
            this._loadShapes();
            var self2 = this;
            return this._lakeRings.some(function(rings) {
                if (self2._inRings(rings, x, y)) return true;
                return rings.some(function(ring) { return self2._distToPath(ring.concat([ring[0]]), x, y) < r; });
            });
        }
        if (place.type === 'river') return this._distToPath(this._riverPoints(place.hitRiver), x, y) < r;
        if (place.hitPath) return this._distToPath(place.hitPath, x, y) < r;
        return Math.hypot(x - place.x, y - place.y) < r;
    },

    // How far outside a state's border a tap still counts for it: about a
    // fingertip (12 screen pixels), whatever the screen size. Rhode Island,
    // Delaware and New Jersey are only 10 to 20 map units wide, which is a
    // few pixels on a phone.
    _tapTolerance() {
        var m = this._svg && this._svg.getScreenCTM();
        var scale = m ? Math.abs(m.a) : 1;
        return Math.max(6, Math.min(30, 12 / (scale || 1)));
    },

    _distToRegion(place, x, y) {
        var shapes = this._loadShapes(), self = this, best = Infinity;
        (place.states || []).forEach(function(n) {
            (shapes[n] || []).forEach(function(ring) {
                best = Math.min(best, self._distToPath(ring.concat([ring[0]]), x, y));
            });
        });
        return best;
    },

    _anchor(place) {
        if (typeof place.x === 'number') return { x: place.x, y: place.y };
        var at = (this._data().labelAt || {})[place.states[0]];
        return at ? { x: at[0], y: at[1] } : this._box(place.states);
    },

    // ─── Drawing ──────────────────────────────────────────

    _renderMap(mode) {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cw-map-' + mode + ' fs-map cg-map nn-map';
        var data = this._data();
        var self = this;

        var header = this._el('div', 'cw-map-header');
        var back = this._el('button', 'cw-map-back-btn');
        back.type = 'button';
        back.appendChild(this._el('i', 'fas fa-arrow-left'));
        back.appendChild(document.createTextNode(' Map menu'));
        back.addEventListener('click', function() { self._showMenu(); });
        header.appendChild(back);
        var info = this._el('div', 'cw-map-header-info');
        info.id = 'nn-map-header-info';
        header.appendChild(info);
        c.appendChild(header);

        var svgWrap = this._el('div', 'cw-map-svg-wrap');
        var svg = this._svgEl('svg', { viewBox: data.viewBox || '0 0 900 725', preserveAspectRatio: 'xMidYMid meet', 'class': 'fs-map-svg cg-svg nn-svg' });
        svg.style.background = '#b3d8e8';
        svg.style.overflow = 'hidden';
        this._svg = svg;

        this._drawLand(svg, mode);
        this._drawWater(svg, mode);
        this._drawCities(svg, mode);
        if (mode === 'learn') this._drawLabels(svg);

        svg.addEventListener('click', function(e) {
            if (mode === 'quiz') self._onQuizClick(e);
            else self._onLearnClick(e);
        });
        svg.style.cursor = mode === 'quiz' ? 'crosshair' : 'pointer';
        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        if (mode === 'learn') this._renderLearnPanel(null);
        else this._renderQuizPanel();
    },

    _drawLand(svg, mode) {
        var data = this._data();
        var original = data.originalStates || [];
        var partOf = data.partOf || {};
        var territory = (data.places.filter(function(p) { return p.type === 'territory'; })[0] || {}).states || [];
        var placeOf = {};
        data.places.forEach(function(p) { (p.states || []).forEach(function(n) { placeOf[n] = p.id; }); });
        var self = this;

        ((window.CIVIL_WAR_MAP_BASE || {}).states || []).forEach(function(st) {
            var isUS = original.indexOf(st.name) !== -1;
            var isTerr = territory.indexOf(st.name) !== -1;
            var fill = isUS ? self._US_FILL : isTerr ? self._TERRITORY_FILL : self._OTHER_FILL;
            var p = self._svgEl('path', {
                d: st.d, fill: fill, 'pointer-events': 'none',
                stroke: isTerr ? self._TERRITORY_FILL : isUS ? '#fff' : '#b9b2a4',
                'stroke-width': isUS ? '1.2' : '0.6',
                'class': 'nn-land' + (isUS ? ' nn-us' : '') + (isTerr ? ' nn-territory' : '')
            });
            if (partOf[st.name]) p.setAttribute('stroke-dasharray', '3,3');
            if (placeOf[st.name]) p.dataset.place = placeOf[st.name];
            svg.appendChild(p);
        });

        // One outline around the whole territory, so it reads as one place
        territory.forEach(function(n) {
            var st = ((window.CIVIL_WAR_MAP_BASE || {}).states || []).filter(function(s) { return s.name === n; })[0];
            if (!st) return;
            svg.appendChild(self._svgEl('path', { d: st.d, fill: 'none', stroke: '#4d7c48', 'stroke-width': '0.8', 'stroke-opacity': '0.35', 'pointer-events': 'none' }));
        });

        if (mode === 'learn') {
            var abbr = data.abbreviations || {};
            var labelAt = data.labelAt || {};
            Object.keys(abbr).forEach(function(name) {
                if (labelAt.hasOwnProperty(name) && !labelAt[name]) return;
                var pt = labelAt[name] ? { x: labelAt[name][0], y: labelAt[name][1] } : self._box([name]);
                var t = self._svgEl('text', { x: pt.x, y: pt.y, 'class': 'cg-colony-label', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'pointer-events': 'none' });
                t.textContent = abbr[name];
                svg.appendChild(t);
            });
        }
    },

    _drawWater(svg, mode) {
        var base = window.CIVIL_WAR_MAP_BASE || {};
        var self = this;
        (base.lakes || []).forEach(function(lake) {
            svg.appendChild(self._svgEl('path', { d: lake.d, fill: '#8cc4e4', stroke: '#4f90b5', 'stroke-width': '1', 'pointer-events': 'none', 'class': 'cg-lake nn-lake' }));
        });
        var ds = [];
        (base.rivers || []).forEach(function(r) {
            var pts = r.points.trim().split(/\s+/);
            if (pts.length >= 2) ds.push({ d: 'M ' + pts.join(' L '), name: r.name });
        });
        [['#fff', '4.5', '0.7'], ['#3b8ac4', '2.4', '1']].forEach(function(style) {
            ds.forEach(function(r) {
                svg.appendChild(self._svgEl('path', { d: r.d, fill: 'none', stroke: style[0], 'stroke-width': style[1], 'stroke-opacity': style[2],
                    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none', 'class': 'cg-river nn-river', 'data-river': r.name }));
            });
        });
        // The Appalachians, as a soft brown band, so there is something to find
        var mtn = this._data().places.filter(function(p) { return p.type === 'mountain'; })[0];
        if (mtn && mtn.hitPath) {
            svg.appendChild(self._svgEl('path', { d: 'M ' + mtn.hitPath.map(function(p) { return p.join(','); }).join(' L '),
                fill: 'none', stroke: '#a07850', 'stroke-width': '9', 'stroke-opacity': '0.35', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none', 'class': 'nn-mountains' }));
        }
    },

    _drawCities(svg, mode) {
        var self = this;
        this._data().places.forEach(function(p) {
            if (p.type !== 'city') return;
            var g = self._svgEl('g', { 'class': 'cg-city nn-city', 'pointer-events': 'none' });
            g.dataset.place = p.id;
            g.appendChild(self._svgEl('circle', { cx: p.x, cy: p.y, r: 5, fill: '#7c2d12', stroke: '#fff', 'stroke-width': '1.8', 'class': 'cg-city-dot' }));
            if (mode === 'learn') {
                var t = self._svgEl('text', { x: p.x + 8, y: p.y + (p.id === 'new-york-city' ? -4 : 9), 'class': 'cg-city-label' });
                t.textContent = p.name;
                g.appendChild(t);
            }
            svg.appendChild(g);
        });
    },

    _drawLabels(svg) {
        var data = this._data();
        var self = this;
        var cls = { river: 'cg-river-label', mountain: 'cg-mountain-label', water: 'cg-ocean-label', lakes: 'cg-lake-label nn-lakes-label', territory: 'cg-feature-label nn-territory-label' };
        data.places.forEach(function(p) {
            if (!cls[p.type]) return;
            var a = self._anchor(p);
            var t = self._svgEl('text', { x: a.x, y: a.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'pointer-events': 'none', 'class': cls[p.type] });
            if (p.angle) t.setAttribute('transform', 'rotate(' + p.angle + ', ' + a.x + ', ' + a.y + ')');
            t.textContent = p.name;
            svg.appendChild(t);
        });
        (data.contextLabels || []).forEach(function(l) {
            var t = self._svgEl('text', { x: l.x, y: l.y, 'text-anchor': 'middle', 'pointer-events': 'none', 'class': 'nn-context-label' });
            if (l.angle) t.setAttribute('transform', 'rotate(' + l.angle + ', ' + l.x + ', ' + l.y + ')');
            t.textContent = l.text;
            svg.appendChild(t);
        });
    },

    _svgPoint(e) {
        var pt = this._svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        return pt.matrixTransform(this._svg.getScreenCTM().inverse());
    },

    // Light up one place on the map: a state's shapes, a city dot, or a marker
    _highlight(place, kind) {
        if (!this._svg) return null;
        var marks = [];
        var cls = 'nn-flash-' + kind;
        if (place.type === 'state' || place.type === 'territory' || place.type === 'city') {
            Array.prototype.forEach.call(this._svg.querySelectorAll('[data-place="' + place.id + '"]'), function(el) {
                el.classList.add(cls);
                marks.push(function() { el.classList.remove(cls); });
            });
        } else {
            if (place.type === 'river') {
                Array.prototype.forEach.call(this._svg.querySelectorAll('.nn-river[data-river="' + place.hitRiver + '"]'), function(el) {
                    el.classList.add(cls);
                    marks.push(function() { el.classList.remove(cls); });
                });
            }
            if (place.type === 'lakes' || place.type === 'mountain') {
                var sel = place.type === 'lakes' ? '.nn-lake' : '.nn-mountains';
                Array.prototype.forEach.call(this._svg.querySelectorAll(sel), function(el) {
                    el.classList.add(cls);
                    marks.push(function() { el.classList.remove(cls); });
                });
            }
            var a = this._anchor(place);
            var ring = this._svgEl('circle', { cx: a.x, cy: a.y, r: 11, fill: 'none', stroke: kind === 'wrong' ? '#dc2626' : '#16a34a', 'stroke-width': '4', 'pointer-events': 'none', 'class': 'nn-ring' });
            this._svg.appendChild(ring);
            marks.push(function() { if (ring.parentNode) ring.remove(); });
        }
        return function() { marks.forEach(function(f) { f(); }); };
    },

    // ─── Explore ──────────────────────────────────────────

    _startLearn() {
        this._mode = 'learn';
        this._selected = null;
        this._renderMap('learn');
    },

    _onLearnClick(e) {
        var p = this._svgPoint(e);
        var places = this._data().places;
        var self = this;
        // Cities first (they sit inside states), then water and lines, then land
        var order = ['city', 'lakes', 'river', 'mountain', 'territory', 'state', 'water'];
        for (var o = 0; o < order.length; o++) {
            var hit = places.filter(function(pl) { return pl.type === order[o]; }).filter(function(pl) {
                if (pl.type === 'city') return Math.hypot(p.x - pl.x, p.y - pl.y) < 16;
                if (pl.type === 'river' || pl.type === 'mountain') return self._hitsPlace(pl, p.x, p.y) && self._distToPath(pl.type === 'river' ? self._riverPoints(pl.hitRiver) : pl.hitPath, p.x, p.y) < 14;
                return self._hitsPlace(pl, p.x, p.y);
            })[0];
            if (hit) { this._select(hit); return; }
        }
    },

    _select(place) {
        if (this._clearSelect) this._clearSelect();
        this._selected = place;
        this._clearSelect = this._highlight(place, 'select');
        this._renderLearnPanel(place);
    },

    _renderLearnPanel(place) {
        var old = document.getElementById('nn-map-panel');
        if (old) old.remove();
        var self = this;
        var panel = this._el('div', 'cw-map-panel nn-panel');
        panel.id = 'nn-map-panel';

        if (place) {
            panel.appendChild(this._el('h3', 'cw-map-panel-name', place.name));
            panel.appendChild(this._el('p', 'cw-map-panel-desc', place.fact));
        } else {
            panel.appendChild(this._el('h3', 'cw-map-panel-name', 'The United States around 1790'));
            var legend = this._el('div', 'cg-legend');
            [[this._US_FILL, 'The thirteen states (today\'s borders)'], [this._TERRITORY_FILL, 'The Northwest Territory'], [this._OTHER_FILL, 'Other land']].forEach(function(row) {
                var r = self._el('div', 'cr-legend-row');
                var sw = self._el('span', 'cr-legend-swatch');
                sw.style.backgroundColor = row[0];
                r.appendChild(sw);
                r.appendChild(self._el('span', null, row[1]));
                legend.appendChild(r);
            });
            panel.appendChild(legend);
            panel.appendChild(this._el('p', 'cw-map-panel-hint', 'The land south of the Ohio River was American too: Kentucky was still part of Virginia, and Tennessee was a territory.'));
            panel.appendChild(this._el('p', 'cw-map-panel-hint', 'Tap a place on the map, or in the list, to read why it matters.'));
        }

        // Every place as a button: easier than a small state on a phone
        var list = this._el('div', 'nn-place-list');
        list.setAttribute('aria-label', 'Places on the map');
        this._data().places.forEach(function(pl) {
            var b = self._el('button', 'nn-place-btn' + (place && place.id === pl.id ? ' active' : ''), pl.name);
            b.type = 'button';
            b.addEventListener('click', function() { self._select(pl); });
            list.appendChild(b);
        });
        panel.appendChild(list);

        var nl = this._data().nativeLand;
        if (nl) {
            // Styled like Go Deeper, so students recognize an outside link
            var box = this._el('div', 'gd-box nn-native-land');
            box.appendChild(this._el('div', 'gd-head', nl.title));
            box.appendChild(this._el('p', 'gd-intro', nl.text));
            var links = this._el('div', 'gd-links');
            nl.links.forEach(function(l) {
                var a = self._el('a', 'gd-chip gd-chip-reading');
                a.href = l.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('aria-label', l.label + ' (opens in a new tab)');
                a.appendChild(self._el('i', 'fas fa-map-location-dot'));
                var t = self._el('span', 'gd-chip-text');
                t.appendChild(self._el('span', 'gd-chip-title', l.label));
                a.appendChild(t);
                a.appendChild(self._el('i', 'fas fa-arrow-up-right-from-square gd-chip-ext'));
                links.appendChild(a);
            });
            box.appendChild(links);
            panel.appendChild(box);
        }
        this._container.appendChild(panel);
    },

    // ─── Quiz ─────────────────────────────────────────────

    _startQuiz() {
        this._mode = 'quiz';
        var items = this._data().places.slice();
        for (var i = items.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = items[i]; items[i] = items[j]; items[j] = t;
        }
        this._quizItems = items;
        this._quizIndex = 0;
        this._quizScore = 0;
        this._quizLocked = false;
        this._quizStartTime = Date.now();
        this._renderMap('quiz');
    },

    _CITY_TAP_RADIUS: 24,

    _onQuizClick(e) {
        if (this._quizLocked || !this._svg || !this._quizItems || this._quizIndex >= this._quizItems.length) return;
        var target = this._quizItems[this._quizIndex];
        var p = this._svgPoint(e);
        var correct, clickedName = null;

        if (target.type === 'city') {
            var cities = this._data().places.filter(function(pl) { return pl.type === 'city'; });
            var nearest = null, best = Infinity;
            cities.forEach(function(c) {
                var d = Math.hypot(p.x - c.x, p.y - c.y);
                if (d < best) { best = d; nearest = c; }
            });
            // A tap away from both dots is a miss-click, not a wrong answer
            if (!nearest || best > this._CITY_TAP_RADIUS) return;
            correct = nearest.id === target.id;
            if (!correct) clickedName = nearest.name;
        } else if (target.type === 'state' || target.type === 'territory') {
            var region = this._regionAt(p.x, p.y);
            var nearTarget = this._distToRegion(target, p.x, p.y) <= this._tapTolerance();
            if (region && region.place && region.place.id === target.id) correct = true;
            // Just outside the border of the state asked for still counts: small
            // states are smaller than a fingertip on a phone
            else if (nearTarget) correct = true;
            // A tap in the water away from it is a miss-click
            else if (!region) return;
            else { correct = false; clickedName = region.place ? region.place.name : region.name; }
        } else {
            correct = this._hitsPlace(target, p.x, p.y);
        }

        if (correct) this._quizScore++;
        this._quizLocked = true;
        var clear = this._highlight(target, correct ? 'correct' : 'wrong');
        this._showFeedback(correct, correct ? 'Correct! ' + target.name + '.'
            : (clickedName ? 'That\'s ' + clickedName + '. ' : 'Not quite. ') + target.name + ' is shown now.');

        var self = this;
        var run = this._quizStartTime;
        setTimeout(function() {
            if (clear) clear();
            if (self._mode !== 'quiz' || self._quizStartTime !== run || !self._container) return;
            self._quizIndex++;
            self._quizLocked = false;
            self._renderQuizPanel();
        }, 1400);
    },

    _showFeedback(correct, text) {
        var old = this._container.querySelector('.cw-map-feedback');
        if (old) old.remove();
        var msg = this._el('div', 'cw-map-feedback ' + (correct ? 'correct' : 'wrong'), text);
        msg.setAttribute('role', 'status');
        this._container.appendChild(msg);
        setTimeout(function() { if (msg.parentNode) msg.remove(); }, 1500);
    },

    _renderQuizPanel() {
        var old = document.getElementById('nn-map-panel');
        if (old) old.remove();
        var total = this._quizItems.length;
        var panel = this._el('div', 'cw-map-panel cw-map-panel-quiz');
        panel.id = 'nn-map-panel';

        var info = document.getElementById('nn-map-header-info');
        if (info) {
            info.textContent = '';
            info.appendChild(this._el('span', 'cw-map-score', 'Score: ' + this._quizScore + ' / ' + total));
            info.appendChild(this._el('span', 'cw-map-progress', Math.min(this._quizIndex + 1, total) + ' of ' + total));
        }

        if (this._quizIndex >= total) {
            this._renderResults(panel);
            this._container.appendChild(panel);
            return;
        }

        var prog = this._el('div', 'fs-progress');
        prog.appendChild(this._el('div', 'fs-progress-label', this._quizIndex + ' of ' + total + ' asked'));
        var bar = this._el('div', 'fs-progress-bar');
        var fill = this._el('div', 'fs-progress-fill');
        fill.style.width = (this._quizIndex / total * 100).toFixed(1) + '%';
        bar.appendChild(fill);
        prog.appendChild(bar);
        panel.appendChild(prog);

        var current = this._quizItems[this._quizIndex];
        var labels = { state: 'Find this state:', territory: 'Find this territory:', city: 'Find this city:', river: 'Find this river:', lakes: 'Find these:', mountain: 'Find these mountains:', water: 'Find this ocean:' };
        var prompt = this._el('div', 'cw-map-prompt');
        prompt.appendChild(this._el('div', 'cw-map-prompt-label', labels[current.type] || 'Find this place:'));
        prompt.appendChild(this._el('div', 'cw-map-prompt-name', current.name));
        panel.appendChild(prompt);
        if (current.type !== 'state' && current.type !== 'territory') {
            panel.appendChild(this._el('p', 'cw-map-panel-hint', current.type === 'city' ? 'Tap its dot.' : 'Tap on or near it.'));
        }
        this._container.appendChild(panel);
    },

    _renderResults(panel) {
        var elapsed = Math.floor((Date.now() - this._quizStartTime) / 1000);
        var total = this._quizItems.length;
        var perfect = this._quizScore === total;
        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'new-nation-map') || {};
        var prevTime = saved.bestTime || null;
        var newBestTime = perfect && (prevTime === null || elapsed < prevTime);
        // The leaderboard reads bestScore against maxScore (15) and bestTime
        ProgressManager.saveActivityProgress(unitId, 'new-nation-map', {
            bestScore: Math.max(typeof saved.bestScore === 'number' ? saved.bestScore : -1, this._quizScore),
            bestTotal: total,
            bestTime: perfect ? (prevTime === null ? elapsed : Math.min(prevTime, elapsed)) : prevTime,
            attempts: (saved.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        });
        if (perfect && typeof LeaderboardManager !== 'undefined') {
            try { LeaderboardManager.submitScore(); } catch (e) { /* the sync loop sends it later */ }
        }

        panel.appendChild(this._el('h2', 'cw-map-results-heading', perfect ? 'Perfect!' : this._quizScore >= total - 2 ? 'So close!' : 'Quiz complete'));
        panel.appendChild(this._el('p', 'cw-map-results-summary', this._quizScore + ' of ' + total + ' correct in ' + this._formatTime(elapsed) + '.'));
        if (newBestTime) panel.appendChild(this._el('p', 'cw-map-results-newbest', 'New fastest perfect run! It counts on the leaderboard.'));
        else if (!perfect) panel.appendChild(this._el('p', 'cw-map-panel-hint', 'Get all ' + total + ' right to post your time on the leaderboard.'));

        var actions = this._el('div', 'cw-map-results-actions');
        var self = this;
        var again = this._el('button', 'cw-map-results-btn primary', 'Try again');
        again.type = 'button';
        again.addEventListener('click', function() { self._startQuiz(); });
        actions.appendChild(again);
        var learn = this._el('button', 'cw-map-results-btn', 'Explore the map');
        learn.type = 'button';
        learn.addEventListener('click', function() { self._startLearn(); });
        actions.appendChild(learn);
        panel.appendChild(actions);
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60), s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    },

    getProgress() { return this._config ? ProgressManager.getActivityProgress(this._config.unit.id, 'new-nation-map') : null; },
    loadProgress() {}
});
