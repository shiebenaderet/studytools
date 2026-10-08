// Colonial Geography challenge map.
// Uses CIVIL_WAR_MAP_BASE for state outlines, lakes, rivers (viewBox 0 0 900 725).
// Uses COLONIAL_GEO_* data for cities, Proclamation Line, and geographic features.
StudyEngine.registerActivity({
    id: 'colonial-geography-map',
    name: 'Colonial Geography',
    icon: 'fas fa-globe-americas',
    description: 'Explore the geography of colonial America: cities, rivers, lakes, mountains, and the Proclamation Line.',
    category: 'study',
    hidden: true,

    _container: null,
    _config: null,
    _mode: null,
    _svg: null,

    _REGION_FILLS: {
        'new-england': '#4a90d9',
        'middle': '#f4b400',
        'southern': '#2ecc71'
    },
    _CITY_TYPES: {
        'new-england': { color: '#2563eb', label: 'New England' },
        'middle':      { color: '#d97706', label: 'Middle' },
        'southern':    { color: '#059669', label: 'Southern' },
        'frontier':    { color: '#dc2626', label: 'Frontier' },
        'french':      { color: '#7c3aed', label: 'French' },
        'spanish':     { color: '#ea580c', label: 'Spanish' }
    },

    _quizItems: null,
    _quizIndex: 0,
    _quizScore: 0,
    _quizTotal: 0,
    _quizStartTime: null,
    _quizLocked: false,
    _selectedCity: null,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._showMenu();
    },

    // ─── Menu ─────────────────────────────────────────────

    _showMenu() {
        this._mode = 'menu';
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen';

        var wrap = document.createElement('div');
        wrap.className = 'cw-map-menu';

        var title = document.createElement('h2');
        title.textContent = 'Colonial Geography';
        wrap.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = 'The full map of colonial America: thirteen colonies, major cities, rivers, the Great Lakes, and the Proclamation Line of 1763. A bonus challenge map to deepen your geography.';
        wrap.appendChild(desc);

        var modes = document.createElement('div');
        modes.className = 'cw-map-modes';
        var self = this;

        modes.appendChild(this._modeCard(
            'Explore', 'See every feature labeled. Click cities and landmarks to learn about them.',
            'fas fa-book-open', function() { self._startLearn(); }
        ));
        modes.appendChild(this._modeCard(
            'City Quiz', 'Find each city on the map. How many can you get right?',
            'fas fa-map-marker-alt', function() { self._startQuiz('cities'); }
        ));
        modes.appendChild(this._modeCard(
            'Full Challenge', 'Cities, rivers, lakes, and mountains. The ultimate geography test.',
            'fas fa-trophy', function() { self._startQuiz('full'); }
        ));
        wrap.appendChild(modes);

        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'colonial-geography-map') || {};
        if (typeof saved.bestScore === 'number') {
            var best = document.createElement('div');
            best.className = 'cw-map-best';
            best.textContent = 'Personal best: ' + saved.bestScore + '/' + saved.bestTotal +
                (saved.bestTime ? ' in ' + this._formatTime(saved.bestTime) : '');
            wrap.appendChild(best);
        }

        c.appendChild(wrap);
    },

    _modeCard(title, desc, iconClass, onClick) {
        var card = document.createElement('button');
        card.className = 'cw-map-mode-card';
        var iconWrap = document.createElement('div');
        iconWrap.className = 'cw-map-mode-icon';
        var icon = document.createElement('i');
        icon.className = iconClass;
        iconWrap.appendChild(icon);
        card.appendChild(iconWrap);
        var h = document.createElement('h3');
        h.textContent = title;
        card.appendChild(h);
        var p = document.createElement('p');
        p.textContent = desc;
        card.appendChild(p);
        card.addEventListener('click', onClick);
        return card;
    },

    // ─── Learn Mode ───────────────────────────────────────

    _startLearn() {
        this._mode = 'learn';
        this._selectedCity = null;
        this._renderMap('learn');
    },

    // ─── Quiz Mode ────────────────────────────────────────

    _startQuiz(type) {
        this._mode = 'quiz';
        var items = [];
        var cities = window.COLONIAL_GEO_CITIES || [];
        cities.forEach(function(c) {
            items.push({ type: 'city', id: c.id, name: c.name, x: c.x, y: c.y, data: c });
        });

        if (type === 'full') {
            var features = window.COLONIAL_GEO_FEATURES || [];
            features.forEach(function(f) {
                items.push({ type: 'feature', id: f.id, name: f.name, x: f.x, y: f.y, data: f });
            });
            var base = window.CIVIL_WAR_MAP_BASE;
            if (base && base.lakes) {
                base.lakes.forEach(function(lake) {
                    var coords = lake.d.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g);
                    if (coords && coords.length > 0) {
                        var xs = coords.map(function(c) { return parseFloat(c.split(',')[0]); });
                        var ys = coords.map(function(c) { return parseFloat(c.split(',')[1]); });
                        var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
                        var cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
                        items.push({ type: 'lake', id: lake.name.toLowerCase().replace(/[^a-z]/g, '-'), name: lake.name, x: cx, y: cy, data: lake });
                    }
                });
            }
        }

        for (var i = items.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = items[i]; items[i] = items[j]; items[j] = t;
        }

        this._quizItems = items;
        this._quizIndex = 0;
        this._quizScore = 0;
        this._quizTotal = items.length;
        this._quizLocked = false;
        this._quizStartTime = Date.now();
        this._renderMap('quiz');
    },

    // ─── Map Rendering ───────────────────────────────────

    _renderMap(mode) {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cw-map-' + mode + ' fs-map cg-map';

        var header = document.createElement('div');
        header.className = 'cw-map-header';
        var backBtn = document.createElement('button');
        backBtn.className = 'cw-map-back-btn';
        var backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back'));
        backBtn.addEventListener('click', this._showMenu.bind(this));
        header.appendChild(backBtn);
        var headerInfo = document.createElement('div');
        headerInfo.className = 'cw-map-header-info';
        headerInfo.id = 'cg-map-header-info';
        header.appendChild(headerInfo);
        c.appendChild(header);

        var svgWrap = document.createElement('div');
        svgWrap.className = 'cw-map-svg-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 900 725');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('class', 'fs-map-svg cg-svg');
        svg.style.background = '#b3d8e8';
        svg.style.overflow = 'hidden';
        this._svg = svg;

        var base = window.CIVIL_WAR_MAP_BASE;
        if (base) {
            this._renderBaseMap(svg, base, mode);
        }

        this._renderProclamationLine(svg, mode);
        this._renderCities(svg, mode);
        if (mode === 'learn') {
            this._renderFeatureLabels(svg);
        }

        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        if (mode === 'learn') this._renderLearnPanel(null);
        else this._renderQuizPanel();
    },

    _renderBaseMap(svg, base, mode) {
        var colonies = window.COLONIAL_GEO_COLONIES || [];
        var regions = window.COLONIAL_GEO_REGIONS || {};
        var context = window.COLONIAL_GEO_CONTEXT || [];
        var self = this;

        // Draw all states
        if (base.states) {
            base.states.forEach(function(state) {
                var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('d', state.d);
                p.setAttribute('pointer-events', 'none');

                if (colonies.indexOf(state.name) !== -1) {
                    var regionId = regions[state.name];
                    p.setAttribute('fill', self._REGION_FILLS[regionId] || '#d4d4d4');
                    p.setAttribute('fill-opacity', '0.5');
                    p.setAttribute('stroke', '#555');
                    p.setAttribute('stroke-width', '1');
                    p.setAttribute('class', 'cg-colony');
                    p.dataset.colony = state.name;
                } else if (context.indexOf(state.name) !== -1 || state.admin === 'CA') {
                    p.setAttribute('fill', '#e8e0d0');
                    p.setAttribute('stroke', '#999');
                    p.setAttribute('stroke-width', '0.5');
                    p.setAttribute('class', 'cg-context');
                } else {
                    p.setAttribute('fill', '#e8e0d0');
                    p.setAttribute('stroke', '#999');
                    p.setAttribute('stroke-width', '0.5');
                    p.setAttribute('class', 'cg-context');
                }
                svg.appendChild(p);

                // Colony name labels in learn mode
                if (mode === 'learn' && colonies.indexOf(state.name) !== -1) {
                    var coords = state.d.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g);
                    if (coords) {
                        var xs = coords.map(function(c) { return parseFloat(c.split(',')[0]); });
                        var ys = coords.map(function(c) { return parseFloat(c.split(',')[1]); });
                        var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
                        var cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
                        var label = self._colonyAbbrev(state.name);
                        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        t.setAttribute('x', cx);
                        t.setAttribute('y', cy);
                        t.setAttribute('class', 'cg-colony-label');
                        t.setAttribute('text-anchor', 'middle');
                        t.setAttribute('dominant-baseline', 'central');
                        t.setAttribute('pointer-events', 'none');
                        t.textContent = label;
                        svg.appendChild(t);
                    }
                }
            });
        }

        // Draw Great Lakes
        if (base.lakes) {
            base.lakes.forEach(function(lake) {
                var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('d', lake.d);
                p.setAttribute('fill', '#7bbde0');
                p.setAttribute('stroke', '#5a9bbf');
                p.setAttribute('stroke-width', '0.75');
                p.setAttribute('pointer-events', 'none');
                p.setAttribute('class', 'cg-lake');
                svg.appendChild(p);

                if (mode === 'learn') {
                    var coords = lake.d.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g);
                    if (coords) {
                        var xs = coords.map(function(c) { return parseFloat(c.split(',')[0]); });
                        var ys = coords.map(function(c) { return parseFloat(c.split(',')[1]); });
                        var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2;
                        var cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
                        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        t.setAttribute('x', cx);
                        t.setAttribute('y', cy);
                        t.setAttribute('class', 'cg-lake-label');
                        t.setAttribute('text-anchor', 'middle');
                        t.setAttribute('dominant-baseline', 'central');
                        t.setAttribute('pointer-events', 'none');
                        t.textContent = lake.name;
                        svg.appendChild(t);
                    }
                }
            });
        }

        // Draw rivers
        if (base.rivers) {
            var riverNames = {};
            base.rivers.forEach(function(river) {
                var pts = river.points.split(' ').map(function(p) { return p.trim(); }).filter(function(p) { return p; });
                if (pts.length < 2) return;
                var d = 'M ' + pts.join(' L ');
                var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                p.setAttribute('d', d);
                p.setAttribute('fill', 'none');
                p.setAttribute('stroke', '#5a9bbf');
                p.setAttribute('stroke-width', '1.5');
                p.setAttribute('stroke-linecap', 'round');
                p.setAttribute('pointer-events', 'none');
                p.setAttribute('class', 'cg-river');
                svg.appendChild(p);

                // Place river name label once per river, at midpoint of longest segment
                if (mode === 'learn' && !riverNames[river.name] && pts.length >= 4) {
                    riverNames[river.name] = true;
                    var midIdx = Math.floor(pts.length / 2);
                    var midPt = pts[midIdx].split(',');
                    if (midPt.length === 2) {
                        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        t.setAttribute('x', parseFloat(midPt[0]));
                        t.setAttribute('y', parseFloat(midPt[1]) - 6);
                        t.setAttribute('class', 'cg-river-label');
                        t.setAttribute('text-anchor', 'middle');
                        t.setAttribute('pointer-events', 'none');
                        t.textContent = river.name + ' R.';
                        svg.appendChild(t);
                    }
                }
            });
        }
    },

    _renderProclamationLine(svg, mode) {
        var lineD = window.COLONIAL_GEO_PROCLAMATION_LINE;
        if (!lineD) return;

        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', lineD);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', '#dc2626');
        p.setAttribute('stroke-width', '2.5');
        p.setAttribute('stroke-dasharray', '8,4');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('pointer-events', 'none');
        p.setAttribute('class', 'cg-proclamation');
        svg.appendChild(p);

        if (mode === 'learn') {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', 510);
            t.setAttribute('y', 310);
            t.setAttribute('class', 'cg-proclamation-label');
            t.setAttribute('text-anchor', 'start');
            t.setAttribute('pointer-events', 'none');
            t.setAttribute('transform', 'rotate(-62, 510, 310)');
            t.textContent = 'Proclamation Line 1763';
            svg.appendChild(t);
        }
    },

    _renderCities(svg, mode) {
        var cities = window.COLONIAL_GEO_CITIES || [];
        var self = this;

        cities.forEach(function(city) {
            var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', 'cg-city');
            g.dataset.cityId = city.id;

            var typeInfo = self._CITY_TYPES[city.region] || { color: '#666' };

            // Clickable hitbox (larger than the dot)
            var hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitbox.setAttribute('cx', city.x);
            hitbox.setAttribute('cy', city.y);
            hitbox.setAttribute('r', mode === 'quiz' ? 15 : 10);
            hitbox.setAttribute('fill', 'transparent');
            hitbox.setAttribute('cursor', 'pointer');
            g.appendChild(hitbox);

            // City dot
            var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', city.x);
            dot.setAttribute('cy', city.y);
            dot.setAttribute('r', 4);
            dot.setAttribute('fill', typeInfo.color);
            dot.setAttribute('stroke', '#fff');
            dot.setAttribute('stroke-width', '1.5');
            dot.setAttribute('pointer-events', 'none');
            dot.setAttribute('class', 'cg-city-dot');
            g.appendChild(dot);

            // Label (learn mode only)
            if (mode === 'learn') {
                var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                t.setAttribute('x', city.x + 7);
                t.setAttribute('y', city.y + 3);
                t.setAttribute('class', 'cg-city-label');
                t.setAttribute('pointer-events', 'none');
                t.textContent = city.name;
                g.appendChild(t);
            }

            if (mode === 'learn') {
                g.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._selectCity(city);
                });
            } else if (mode === 'quiz') {
                g.addEventListener('click', function(e) {
                    var target = self._quizItems && self._quizItems[self._quizIndex];
                    if (!target || target.type !== 'city') return;
                    e.stopPropagation();
                    self._onQuizCityClick(city);
                });
            }

            svg.appendChild(g);
        });
    },

    _renderFeatureLabels(svg) {
        var features = window.COLONIAL_GEO_FEATURES || [];
        features.forEach(function(f) {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', f.x);
            t.setAttribute('y', f.y);
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('pointer-events', 'none');
            if (f.angle) {
                t.setAttribute('transform', 'rotate(' + f.angle + ', ' + f.x + ', ' + f.y + ')');
            }
            if (f.type === 'mountain') {
                t.setAttribute('class', 'cg-mountain-label');
            } else if (f.type === 'water') {
                t.setAttribute('class', 'cg-ocean-label');
            } else if (f.type === 'river') {
                t.setAttribute('class', 'cg-river-label');
            } else {
                t.setAttribute('class', 'cg-feature-label');
            }
            t.textContent = f.name;
            svg.appendChild(t);
        });
    },

    _colonyAbbrev(name) {
        var abbr = {
            'Massachusetts': 'MA', 'New Hampshire': 'NH', 'Connecticut': 'CT',
            'Rhode Island': 'RI', 'New York': 'NY', 'New Jersey': 'NJ',
            'Pennsylvania': 'PA', 'Delaware': 'DE', 'Maryland': 'MD',
            'Virginia': 'VA', 'North Carolina': 'NC', 'South Carolina': 'SC',
            'Georgia': 'GA'
        };
        return abbr[name] || name;
    },

    // ─── Learn mode interactions ─────────────────────────

    _selectCity(city) {
        this._selectedCity = city;
        var dots = this._container.querySelectorAll('.cg-city');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('selected', dots[i].dataset.cityId === city.id);
        }
        this._renderLearnPanel(city);
    },

    _renderLearnPanel(city) {
        var existing = document.getElementById('cg-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cg-map-panel';
        panel.className = 'cw-map-panel';

        if (!city) {
            // Show legend
            var heading = document.createElement('h3');
            heading.className = 'cw-map-panel-name';
            heading.textContent = 'Colonial Geography';
            panel.appendChild(heading);

            var legend = document.createElement('div');
            legend.className = 'cg-legend';

            var regionItems = [
                { color: this._REGION_FILLS['new-england'], label: 'New England Colonies' },
                { color: this._REGION_FILLS['middle'], label: 'Middle Colonies' },
                { color: this._REGION_FILLS['southern'], label: 'Southern Colonies' },
                { color: '#dc2626', label: 'Proclamation Line 1763', dash: true }
            ];
            var self = this;
            regionItems.forEach(function(item) {
                var row = document.createElement('div');
                row.className = 'cr-legend-row';
                var sw = document.createElement('span');
                sw.className = 'cr-legend-swatch';
                if (item.dash) {
                    sw.style.background = 'repeating-linear-gradient(90deg, ' + item.color + ' 0px, ' + item.color + ' 4px, transparent 4px, transparent 6px)';
                } else {
                    sw.style.backgroundColor = item.color;
                    sw.style.opacity = '0.5';
                }
                row.appendChild(sw);
                var txt = document.createElement('span');
                txt.textContent = item.label;
                row.appendChild(txt);
                legend.appendChild(row);
            });

            // City type legend
            Object.keys(this._CITY_TYPES).forEach(function(key) {
                var info = self._CITY_TYPES[key];
                var row = document.createElement('div');
                row.className = 'cr-legend-row';
                var dot = document.createElement('span');
                dot.className = 'cg-legend-dot';
                dot.style.backgroundColor = info.color;
                row.appendChild(dot);
                var txt = document.createElement('span');
                txt.textContent = info.label + ' city';
                row.appendChild(txt);
                legend.appendChild(row);
            });

            panel.appendChild(legend);

            var hint = document.createElement('p');
            hint.className = 'cw-map-panel-hint';
            hint.textContent = 'Click any city dot to learn about it.';
            panel.appendChild(hint);
        } else {
            var name = document.createElement('h3');
            name.className = 'cw-map-panel-name';
            name.textContent = city.name;
            panel.appendChild(name);

            var typeInfo = this._CITY_TYPES[city.region];
            if (typeInfo) {
                var badge = document.createElement('span');
                badge.className = 'cg-city-badge';
                badge.style.backgroundColor = typeInfo.color;
                badge.textContent = typeInfo.label;
                panel.appendChild(badge);
            }

            var desc = document.createElement('p');
            desc.className = 'cw-map-panel-desc';
            desc.textContent = city.description;
            panel.appendChild(desc);
        }

        this._container.appendChild(panel);
    },

    // ─── Quiz mode interactions ──────────────────────────

    _onQuizCityClick(city) {
        if (this._quizLocked || this._quizIndex >= this._quizItems.length) return;
        var target = this._quizItems[this._quizIndex];
        if (target.type !== 'city') return;

        var correct = city.id === target.id;
        if (correct) this._quizScore++;
        this._quizLocked = true;

        var g = this._container.querySelector('.cg-city[data-city-id="' + city.id + '"]');
        var targetG = this._container.querySelector('.cg-city[data-city-id="' + target.id + '"]');

        if (targetG) targetG.classList.add('cg-flash-correct');
        if (!correct && g) g.classList.add('cg-flash-wrong');

        var feedbackText = correct
            ? 'Correct! ' + target.name + '.'
            : 'That\'s ' + city.name + '. ' + target.name + ' is highlighted.';

        this._showFeedback(correct, feedbackText);

        var self = this;
        setTimeout(function() {
            if (targetG) { targetG.classList.remove('cg-flash-correct'); targetG.classList.add('cg-answered'); }
            if (!correct && g) g.classList.remove('cg-flash-wrong');
            self._quizIndex++;
            self._quizLocked = false;
            self._renderQuizPanel();
        }, 1400);
    },

    _showFeedback(correct, text) {
        var existing = this._container.querySelector('.cw-map-feedback');
        if (existing) existing.remove();

        var msg = document.createElement('div');
        msg.className = 'cw-map-feedback ' + (correct ? 'correct' : 'wrong');
        msg.textContent = text;
        this._container.appendChild(msg);
        setTimeout(function() { if (msg.parentNode) msg.remove(); }, 1500);
    },

    _renderQuizPanel() {
        var existing = document.getElementById('cg-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cg-map-panel';
        panel.className = 'cw-map-panel cw-map-panel-quiz';

        var info = document.getElementById('cg-map-header-info');
        if (info) {
            info.textContent = '';
            var scoreEl = document.createElement('span');
            scoreEl.className = 'cw-map-score';
            scoreEl.textContent = 'Score: ' + this._quizScore + ' / ' + this._quizTotal;
            info.appendChild(scoreEl);
            var progEl = document.createElement('span');
            progEl.className = 'cw-map-progress';
            progEl.textContent = Math.min(this._quizIndex + 1, this._quizTotal) + ' of ' + this._quizTotal;
            info.appendChild(progEl);
        }

        if (this._quizIndex >= this._quizItems.length) {
            this._renderQuizResults(panel);
        } else {
            var total = this._quizTotal;
            var done = this._quizIndex;
            var progWrap = document.createElement('div');
            progWrap.className = 'fs-progress';
            var progLabel = document.createElement('div');
            progLabel.className = 'fs-progress-label';
            progLabel.textContent = done + ' of ' + total + ' asked';
            progWrap.appendChild(progLabel);
            var progBar = document.createElement('div');
            progBar.className = 'fs-progress-bar';
            var progFill = document.createElement('div');
            progFill.className = 'fs-progress-fill';
            progFill.style.width = ((done / total) * 100).toFixed(1) + '%';
            progBar.appendChild(progFill);
            progWrap.appendChild(progBar);
            panel.appendChild(progWrap);

            var current = this._quizItems[this._quizIndex];
            var prompt = document.createElement('div');
            prompt.className = 'cw-map-prompt';
            var promptLabel = document.createElement('div');
            promptLabel.className = 'cw-map-prompt-label';
            promptLabel.textContent = current.type === 'city' ? 'Find this city:' : 'Find this feature:';
            prompt.appendChild(promptLabel);
            var promptName = document.createElement('div');
            promptName.className = 'cw-map-prompt-name';
            promptName.textContent = current.name;
            prompt.appendChild(promptName);
            panel.appendChild(prompt);

            // For non-city quiz items, show "Click anywhere near it" hint
            if (current.type !== 'city') {
                var hint = document.createElement('p');
                hint.className = 'cw-map-panel-hint';
                hint.textContent = 'Click on or near it on the map.';
                panel.appendChild(hint);

                // Add a click handler on the SVG for proximity-based answers
                this._setupProximityClick(current);
            }
        }

        this._container.appendChild(panel);
    },

    _setupProximityClick(target) {
        var self = this;
        var svg = this._svg;
        if (!svg) return;

        var handler = function(e) {
            if (self._quizLocked) return;
            var rect = svg.getBoundingClientRect();
            var svgX = ((e.clientX - rect.left) / rect.width) * 900;
            var svgY = ((e.clientY - rect.top) / rect.height) * 725;

            var dist = Math.sqrt(Math.pow(svgX - target.x, 2) + Math.pow(svgY - target.y, 2));
            var correct = dist < 40;

            if (correct) self._quizScore++;
            self._quizLocked = true;

            var feedbackText = correct
                ? 'Correct! ' + target.name + '.'
                : 'Not quite. ' + target.name + ' is shown now.';

            // Show a marker at the correct location
            var marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            marker.setAttribute('cx', target.x);
            marker.setAttribute('cy', target.y);
            marker.setAttribute('r', 8);
            marker.setAttribute('fill', correct ? '#22c55e' : '#ef4444');
            marker.setAttribute('stroke', '#fff');
            marker.setAttribute('stroke-width', '2');
            marker.setAttribute('class', 'cg-quiz-marker');
            svg.appendChild(marker);

            self._showFeedback(correct, feedbackText);

            svg.removeEventListener('click', handler);
            setTimeout(function() {
                if (marker.parentNode) marker.remove();
                self._quizIndex++;
                self._quizLocked = false;
                self._renderQuizPanel();
            }, 1400);
        };

        svg.addEventListener('click', handler);
    },

    _renderQuizResults(panel) {
        var elapsed = Math.floor((Date.now() - this._quizStartTime) / 1000);
        var total = this._quizTotal;
        var pct = Math.round((this._quizScore / total) * 100);

        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'colonial-geography-map') || {};
        var prevBest = typeof saved.bestScore === 'number' ? saved.bestScore : -1;
        var prevTime = saved.bestTime || null;
        ProgressManager.saveActivityProgress(unitId, 'colonial-geography-map', {
            bestScore: Math.max(prevBest, this._quizScore),
            bestTotal: total,
            bestTime: pct === 100 ? (prevTime === null ? elapsed : Math.min(prevTime, elapsed)) : prevTime,
            attempts: (saved.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        });

        var heading = document.createElement('h2');
        heading.className = 'cw-map-results-heading';
        heading.textContent = pct === 100 ? 'Perfect Score!' : (pct >= 80 ? 'Great Job!' : 'Quiz Complete');
        panel.appendChild(heading);

        var summary = document.createElement('p');
        summary.className = 'cw-map-results-summary';
        summary.textContent = this._quizScore + ' of ' + total + ' correct in ' + this._formatTime(elapsed) + '.';
        panel.appendChild(summary);

        var actions = document.createElement('div');
        actions.className = 'cw-map-results-actions';
        var self = this;
        var again = document.createElement('button');
        again.className = 'cw-map-results-btn primary';
        again.textContent = 'Try Again';
        again.addEventListener('click', function() { self._startQuiz(self._quizTotal > 18 ? 'full' : 'cities'); });
        actions.appendChild(again);
        var menu = document.createElement('button');
        menu.className = 'cw-map-results-btn';
        menu.textContent = 'Back to Menu';
        menu.addEventListener('click', function() { self._showMenu(); });
        actions.appendChild(menu);
        panel.appendChild(actions);

        this._container.appendChild(panel);
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
});
