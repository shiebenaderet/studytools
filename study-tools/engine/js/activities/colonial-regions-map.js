// Colonial Regions map. Reuses SVG data from thirteen-colonies-map.js
// (THIRTEEN_COLONIES_DATA, THIRTEEN_COLONIES_VIEWBOX, THIRTEEN_COLONIES_LAND).
// Three modes: Learn (color-coded by region), Quiz (identify which region each
// colony belongs to), and Color (pick 3 colors, paint colonies by region).
StudyEngine.registerActivity({
    id: 'colonial-regions-map',
    name: 'Colonial Regions',
    icon: 'fas fa-palette',
    description: 'Learn the three colonial regions: New England, Middle, and Southern.',
    category: 'study',
    hidden: true,

    _container: null,
    _config: null,
    _mode: null,

    _REGIONS: [
        { id: 'new-england', name: 'New England Colonies', colonies: ['massachusetts', 'new-hampshire', 'connecticut', 'rhode-island'] },
        { id: 'middle', name: 'Middle Colonies', colonies: ['new-york', 'new-jersey', 'pennsylvania', 'delaware'] },
        { id: 'southern', name: 'Southern Colonies', colonies: ['maryland', 'virginia', 'north-carolina', 'south-carolina', 'georgia'] }
    ],

    _REGION_COLORS: {
        'new-england': { fill: '#4a90d9', hover: '#3570b0', label: 'New England' },
        'middle':      { fill: '#f4b400', hover: '#c99200', label: 'Middle' },
        'southern':    { fill: '#2ecc71', hover: '#1fa85a', label: 'Southern' }
    },

    _COLOR_PALETTE: [
        { id: 'blue',   hex: '#4a90d9', name: 'Blue' },
        { id: 'gold',   hex: '#f4b400', name: 'Gold' },
        { id: 'green',  hex: '#2ecc71', name: 'Green' },
        { id: 'red',    hex: '#e74c3c', name: 'Red' },
        { id: 'purple', hex: '#9b59b6', name: 'Purple' },
        { id: 'orange', hex: '#e67e22', name: 'Orange' }
    ],

    _quizRegionOrder: null,
    _quizRegionIndex: 0,
    _quizSelected: null,
    _quizScore: 0,
    _quizTotal: 0,
    _quizStartTime: null,
    _quizLocked: false,

    _colorAssignments: null,
    _colorCurrentRegion: null,
    _colorRegionIndex: 0,
    _colorScore: 0,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._showMenu();
    },

    deactivate() {
        this._container = null;
        this._config = null;
        this._mode = null;
    },

    _regionForColony(colonyId) {
        for (var i = 0; i < this._REGIONS.length; i++) {
            if (this._REGIONS[i].colonies.indexOf(colonyId) !== -1) return this._REGIONS[i];
        }
        return null;
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
        title.textContent = 'Colonial Regions';
        wrap.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = 'The thirteen colonies were divided into three regions: New England, Middle, and Southern. Learn which colony belongs where.';
        wrap.appendChild(desc);

        var modes = document.createElement('div');
        modes.className = 'cw-map-modes';
        var self = this;

        modes.appendChild(this._modeCard(
            'Learn', 'See each colony colored by its region. Click to explore.',
            'fas fa-book-open', function() { self._startLearn(); }
        ));
        modes.appendChild(this._modeCard(
            'Color', 'Pick three colors and paint each colony’s region from memory.',
            'fas fa-palette', function() { self._startColor(); }
        ));
        modes.appendChild(this._modeCard(
            'Quiz', 'Name the region for each colony. Track your score.',
            'fas fa-bullseye', function() { self._startQuiz(); }
        ));
        wrap.appendChild(modes);

        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'colonial-regions-map') || {};
        if (typeof saved.bestScore === 'number') {
            var best = document.createElement('div');
            best.className = 'cw-map-best';
            best.textContent = 'Personal best: ' + saved.bestScore + '/13' +
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
        this._renderMap('learn');
    },

    // ─── Color Mode ───────────────────────────────────────

    _startColor() {
        this._mode = 'color-pick';
        this._colorAssignments = {};
        this._colorRegionIndex = 0;
        this._colorScore = 0;
        this._renderColorPicker();
    },

    _renderColorPicker() {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cr-color-pick';

        var wrap = document.createElement('div');
        wrap.className = 'cw-map-menu';

        var title = document.createElement('h2');
        title.textContent = 'Choose Your Colors';
        wrap.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = 'Pick one color for each region. Then you’ll paint the colonies from memory.';
        wrap.appendChild(desc);

        var self = this;
        var chosen = {};

        var regionPickers = document.createElement('div');
        regionPickers.className = 'cr-region-pickers';

        this._REGIONS.forEach(function(region) {
            var row = document.createElement('div');
            row.className = 'cr-picker-row';

            var label = document.createElement('div');
            label.className = 'cr-picker-label';
            label.textContent = region.name;
            row.appendChild(label);

            var swatches = document.createElement('div');
            swatches.className = 'cr-swatches';

            self._COLOR_PALETTE.forEach(function(color) {
                var swatch = document.createElement('button');
                swatch.className = 'cr-swatch';
                swatch.style.backgroundColor = color.hex;
                swatch.title = color.name;
                swatch.dataset.colorId = color.id;

                swatch.addEventListener('click', function() {
                    var prev = chosen[region.id];
                    if (prev) {
                        var allSwatches = regionPickers.querySelectorAll('.cr-swatch');
                        for (var i = 0; i < allSwatches.length; i++) {
                            if (allSwatches[i].dataset.colorId === prev && allSwatches[i].closest('.cr-picker-row') === row) {
                                allSwatches[i].classList.remove('selected');
                            }
                        }
                    }
                    chosen[region.id] = color.id;
                    swatch.classList.add('selected');
                    updateGoBtn();
                });

                swatches.appendChild(swatch);
            });

            row.appendChild(swatches);
            regionPickers.appendChild(row);
        });

        wrap.appendChild(regionPickers);

        var goBtn = document.createElement('button');
        goBtn.className = 'cw-map-results-btn primary cr-go-btn';
        goBtn.textContent = 'Start Coloring';
        goBtn.disabled = true;
        goBtn.addEventListener('click', function() {
            self._colorAssignments = {};
            self._REGIONS.forEach(function(r) {
                var colorObj = self._COLOR_PALETTE.find(function(c) { return c.id === chosen[r.id]; });
                self._colorAssignments[r.id] = colorObj;
            });
            self._mode = 'color';
            self._colorRegionIndex = 0;
            self._colorScore = 0;
            self._renderMap('color');
        });
        wrap.appendChild(goBtn);

        function updateGoBtn() {
            var allPicked = self._REGIONS.every(function(r) { return chosen[r.id]; });
            var uniqueColors = new Set(Object.values(chosen));
            goBtn.disabled = !(allPicked && uniqueColors.size === 3);
            if (allPicked && uniqueColors.size < 3) {
                goBtn.textContent = 'Each region needs a different color';
            } else {
                goBtn.textContent = 'Start Coloring';
            }
        }

        var backBtn = document.createElement('button');
        backBtn.className = 'cw-map-results-btn cr-back-btn';
        backBtn.textContent = 'Back to Menu';
        backBtn.addEventListener('click', function() { self._showMenu(); });
        wrap.appendChild(backBtn);

        c.appendChild(wrap);
    },

    // ─── Quiz Mode ────────────────────────────────────────

    _startQuiz() {
        this._mode = 'quiz';
        var colonies = (window.THIRTEEN_COLONIES_DATA || []).slice();
        for (var i = colonies.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = colonies[i]; colonies[i] = colonies[j]; colonies[j] = t;
        }
        this._quizColonies = colonies;
        this._quizIndex = 0;
        this._quizScore = 0;
        this._quizTotal = colonies.length;
        this._quizLocked = false;
        this._quizStartTime = Date.now();
        this._renderMap('quiz');
    },

    // ─── Map Rendering ───────────────────────────────────

    _renderMap(mode) {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cw-map-' + mode + ' fs-map cr-map';

        var header = document.createElement('div');
        header.className = 'cw-map-header';
        var backBtn = document.createElement('button');
        backBtn.className = 'cw-map-back-btn';
        var backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Map menu'));
        backBtn.addEventListener('click', this._showMenu.bind(this));
        header.appendChild(backBtn);
        var headerInfo = document.createElement('div');
        headerInfo.className = 'cw-map-header-info';
        headerInfo.id = 'cr-map-header-info';
        header.appendChild(headerInfo);
        c.appendChild(header);

        var svgWrap = document.createElement('div');
        svgWrap.className = 'cw-map-svg-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', window.THIRTEEN_COLONIES_VIEWBOX || '0 0 1000 930');

        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clip.setAttribute('id', 'cr-frame');
        var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '1000'); rect.setAttribute('height', '1157');
        clip.appendChild(rect); defs.appendChild(clip); svg.appendChild(defs);

        var ocean = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        ocean.setAttribute('width', '1000'); ocean.setAttribute('height', '1157');
        ocean.setAttribute('fill', '#b3d8e8'); ocean.setAttribute('pointer-events', 'none');
        svg.appendChild(ocean);

        var land = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        land.setAttribute('d', window.THIRTEEN_COLONIES_LAND || '');
        land.setAttribute('fill', '#F3EFE6'); land.setAttribute('stroke', '#7d8a92');
        land.setAttribute('stroke-width', '1.5'); land.setAttribute('pointer-events', 'none');
        land.setAttribute('clip-path', 'url(#cr-frame)');
        svg.appendChild(land);

        svg.style.background = 'transparent';
        svg.style.overflow = 'hidden';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('class', 'fs-map-svg');

        var statesData = window.THIRTEEN_COLONIES_DATA || [];
        var self = this;
        for (var s = 0; s < statesData.length; s++) {
            this._renderColony(svg, statesData[s], mode);
        }

        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        if (mode === 'learn') this._renderLearnLegend();
        else if (mode === 'color') this._renderColorPanel();
        else if (mode === 'quiz') this._renderQuizPanel();
    },

    _renderColony(parent, colony, mode) {
        var self = this;
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'fs-state cr-colony');
        g.dataset.stateId = colony.id;

        if (colony.hitbox) {
            var hb;
            if (colony.hitbox.type === 'ellipse') {
                hb = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                hb.setAttribute('cx', colony.hitbox.cx);
                hb.setAttribute('cy', colony.hitbox.cy);
                hb.setAttribute('rx', colony.hitbox.rx);
                hb.setAttribute('ry', colony.hitbox.ry);
            } else if (colony.hitbox.type === 'path') {
                hb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                hb.setAttribute('d', colony.hitbox.d);
            }
            if (hb) {
                hb.setAttribute('class', 'fs-state-hitbox');
                hb.setAttribute('fill', 'transparent');
                g.appendChild(hb);
            }
        }

        var region = this._regionForColony(colony.id);
        var regionId = region ? region.id : null;

        for (var i = 0; i < colony.paths.length; i++) {
            var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', colony.paths[i]);
            p.setAttribute('class', 'fs-state-path');
            if (mode === 'learn' && regionId) {
                p.style.fill = this._REGION_COLORS[regionId].fill;
            }
            g.appendChild(p);
        }

        // Labels always visible in learn and color modes
        if ((mode === 'learn' || mode === 'color') && colony.labelBox) {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', colony.labelBox.x + colony.labelBox.w / 2);
            t.setAttribute('y', colony.labelBox.y + colony.labelBox.h / 2 + 4);
            t.setAttribute('class', 'fs-state-label');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('pointer-events', 'none');
            t.textContent = this._shortLabel(colony.name);
            g.appendChild(t);
        }

        if (mode === 'learn') {
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._selectLearnColony(colony);
            });
            g.addEventListener('mouseenter', function() { g.classList.add('hover'); });
            g.addEventListener('mouseleave', function() { g.classList.remove('hover'); });
        } else if (mode === 'color') {
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._onColorClick(colony);
            });
            g.addEventListener('mouseenter', function() { g.classList.add('hover'); });
            g.addEventListener('mouseleave', function() { g.classList.remove('hover'); });
        } else if (mode === 'quiz') {
            // In quiz mode, colony names are shown as labels
            if (colony.labelBox) {
                var tq = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tq.setAttribute('x', colony.labelBox.x + colony.labelBox.w / 2);
                tq.setAttribute('y', colony.labelBox.y + colony.labelBox.h / 2 + 4);
                tq.setAttribute('class', 'fs-state-label');
                tq.setAttribute('text-anchor', 'middle');
                tq.setAttribute('pointer-events', 'none');
                tq.textContent = this._shortLabel(colony.name);
                g.appendChild(tq);
            }
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._onQuizColonyClick(colony);
            });
        }

        parent.appendChild(g);
    },

    _shortLabel(name) {
        var short = {
            'Rhode Island': 'RI', 'Connecticut': 'CT', 'Massachusetts': 'MA',
            'New Hampshire': 'NH', 'New Jersey': 'NJ',
            'Delaware': 'DE', 'Maryland': 'MD'
        };
        return short[name] || name;
    },

    // ─── Learn mode ──────────────────────────────────────

    _selectLearnColony(colony) {
        var groups = this._container.querySelectorAll('.cr-colony');
        for (var i = 0; i < groups.length; i++) {
            groups[i].classList.toggle('selected', groups[i].dataset.stateId === colony.id);
        }
        this._renderLearnPanel(colony);
    },

    _renderLearnLegend() {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel cr-legend-panel';

        var heading = document.createElement('h3');
        heading.className = 'cw-map-panel-name';
        heading.textContent = 'Colonial Regions';
        panel.appendChild(heading);

        var self = this;
        this._REGIONS.forEach(function(region) {
            var row = document.createElement('div');
            row.className = 'cr-legend-row';
            var swatch = document.createElement('span');
            swatch.className = 'cr-legend-swatch';
            swatch.style.backgroundColor = self._REGION_COLORS[region.id].fill;
            row.appendChild(swatch);
            var text = document.createElement('span');
            text.textContent = region.name + ' (' + region.colonies.length + ')';
            row.appendChild(text);
            panel.appendChild(row);
        });

        var hint = document.createElement('p');
        hint.className = 'cw-map-panel-hint';
        hint.textContent = 'Click any colony to see which region it belongs to.';
        panel.appendChild(hint);

        this._container.appendChild(panel);
    },

    _renderLearnPanel(colony) {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel';

        if (colony) {
            var region = this._regionForColony(colony.id);
            var name = document.createElement('h3');
            name.className = 'cw-map-panel-name';
            name.textContent = colony.name;
            panel.appendChild(name);

            var regionText = document.createElement('p');
            regionText.className = 'cw-map-panel-desc';
            if (region) {
                var swatch = document.createElement('span');
                swatch.className = 'cr-legend-swatch';
                swatch.style.backgroundColor = this._REGION_COLORS[region.id].fill;
                regionText.appendChild(swatch);
                regionText.appendChild(document.createTextNode(' ' + region.name));
            }
            panel.appendChild(regionText);

            var others = document.createElement('p');
            others.className = 'cr-panel-others';
            if (region) {
                var otherNames = [];
                var data = window.THIRTEEN_COLONIES_DATA || [];
                for (var i = 0; i < region.colonies.length; i++) {
                    if (region.colonies[i] !== colony.id) {
                        var d = data.find(function(c) { return c.id === region.colonies[i]; });
                        if (d) otherNames.push(d.name);
                    }
                }
                others.textContent = 'Also in this region: ' + otherNames.join(', ');
            }
            panel.appendChild(others);
        } else {
            var hint = document.createElement('p');
            hint.className = 'cw-map-panel-hint';
            hint.textContent = 'Click any colony to learn its region.';
            panel.appendChild(hint);
        }

        this._container.appendChild(panel);
    },

    // ─── Color mode ──────────────────────────────────────

    _onColorClick(colony) {
        if (this._colorRegionIndex >= this._REGIONS.length) return;

        var currentRegion = this._REGIONS[this._colorRegionIndex];
        var correct = currentRegion.colonies.indexOf(colony.id) !== -1;
        var g = this._container.querySelector('.cr-colony[data-state-id="' + colony.id + '"]');

        if (g && g.classList.contains('cr-painted')) return;

        if (correct) {
            this._colorScore++;
            if (g) {
                var paths = g.querySelectorAll('.fs-state-path');
                var color = this._colorAssignments[currentRegion.id];
                for (var i = 0; i < paths.length; i++) {
                    paths[i].style.fill = color.hex;
                }
                g.classList.add('cr-painted');
            }
            this._showColorFeedback(true, colony.name + ' — correct!');

            var paintedInRegion = 0;
            var self = this;
            currentRegion.colonies.forEach(function(cId) {
                var el = self._container.querySelector('.cr-colony[data-state-id="' + cId + '"]');
                if (el && el.classList.contains('cr-painted')) paintedInRegion++;
            });

            if (paintedInRegion === currentRegion.colonies.length) {
                this._colorRegionIndex++;
                if (this._colorRegionIndex >= this._REGIONS.length) {
                    setTimeout(function() { if (self._mode === 'color' && self._container) self._renderColorResults(); }, 800);
                } else {
                    var nextRegion = this._REGIONS[this._colorRegionIndex];
                    this._showColorFeedback(true, currentRegion.name + ' complete! Now paint the ' + nextRegion.name + '.');
                    this._renderColorPanel();
                }
            }
        } else {
            if (g) g.classList.add('fs-flash-wrong');
            var actualRegion = this._regionForColony(colony.id);
            var msg = colony.name + ' is a ' + (actualRegion ? actualRegion.name.replace(' Colonies', '') : '') + ' colony.';
            this._showColorFeedback(false, msg);
            var self = this;
            setTimeout(function() {
                if (g) g.classList.remove('fs-flash-wrong');
            }, 1200);
        }
    },

    _showColorFeedback(correct, text) {
        var existing = this._container.querySelector('.cw-map-feedback');
        if (existing) existing.remove();

        var msg = document.createElement('div');
        msg.className = 'cw-map-feedback ' + (correct ? 'correct' : 'wrong');
        msg.textContent = text;
        this._container.appendChild(msg);

        setTimeout(function() { msg.remove(); }, 1800);
    },

    _renderColorPanel() {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel cr-color-panel';

        if (this._colorRegionIndex >= this._REGIONS.length) return;

        var region = this._REGIONS[this._colorRegionIndex];
        var color = this._colorAssignments[region.id];

        var heading = document.createElement('h3');
        heading.className = 'cw-map-panel-name';
        heading.textContent = 'Paint the ' + region.name;
        panel.appendChild(heading);

        var instruction = document.createElement('p');
        instruction.className = 'cw-map-panel-desc';
        var swatch = document.createElement('span');
        swatch.className = 'cr-legend-swatch';
        swatch.style.backgroundColor = color.hex;
        instruction.appendChild(swatch);
        instruction.appendChild(document.createTextNode(' Click each colony that belongs to this region.'));
        panel.appendChild(instruction);

        var progress = document.createElement('p');
        progress.className = 'cr-color-progress';
        var self = this;
        var painted = 0;
        region.colonies.forEach(function(cId) {
            var el = self._container.querySelector('.cr-colony[data-state-id="' + cId + '"]');
            if (el && el.classList.contains('cr-painted')) painted++;
        });
        progress.textContent = painted + ' of ' + region.colonies.length + ' found';
        panel.appendChild(progress);

        // Legend of completed regions
        for (var i = 0; i < this._colorRegionIndex; i++) {
            var doneRegion = this._REGIONS[i];
            var doneColor = this._colorAssignments[doneRegion.id];
            var row = document.createElement('div');
            row.className = 'cr-legend-row cr-legend-done';
            var sw = document.createElement('span');
            sw.className = 'cr-legend-swatch';
            sw.style.backgroundColor = doneColor.hex;
            row.appendChild(sw);
            var txt = document.createElement('span');
            txt.textContent = doneRegion.name + ' ✓';
            row.appendChild(txt);
            panel.appendChild(row);
        }

        this._container.appendChild(panel);
    },

    _renderColorResults() {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel cr-results-panel';

        var heading = document.createElement('h2');
        heading.className = 'cw-map-results-heading';
        heading.textContent = this._colorScore === 13 ? 'Perfect!' : 'All Regions Painted!';
        panel.appendChild(heading);

        var summary = document.createElement('p');
        summary.className = 'cw-map-results-summary';
        summary.textContent = this._colorScore + ' of 13 colonies painted correctly on the first try.';
        panel.appendChild(summary);

        // Show final legend
        var self = this;
        this._REGIONS.forEach(function(region) {
            var color = self._colorAssignments[region.id];
            var row = document.createElement('div');
            row.className = 'cr-legend-row';
            var sw = document.createElement('span');
            sw.className = 'cr-legend-swatch';
            sw.style.backgroundColor = color.hex;
            row.appendChild(sw);
            var txt = document.createElement('span');
            txt.textContent = region.name;
            row.appendChild(txt);
            panel.appendChild(row);
        });

        var actions = document.createElement('div');
        actions.className = 'cw-map-results-actions';
        var again = document.createElement('button');
        again.className = 'cw-map-results-btn primary';
        again.textContent = 'Try Again';
        again.addEventListener('click', function() { self._startColor(); });
        actions.appendChild(again);
        var menu = document.createElement('button');
        menu.className = 'cw-map-results-btn';
        menu.textContent = 'Back to Menu';
        menu.addEventListener('click', function() { self._showMenu(); });
        actions.appendChild(menu);
        panel.appendChild(actions);

        this._container.appendChild(panel);
    },

    // ─── Quiz mode ───────────────────────────────────────

    _onQuizColonyClick(colony) {
        if (this._quizLocked || this._quizIndex >= this._quizColonies.length) return;

        var current = this._quizColonies[this._quizIndex];
        if (colony.id !== current.id) return;

        // Colony clicked — now show region buttons
        this._highlightQuizColony(colony.id);
    },

    _highlightQuizColony(colonyId) {
        var g = this._container.querySelector('.cr-colony[data-state-id="' + colonyId + '"]');
        if (g) g.classList.add('selected');
        this._renderQuizRegionButtons(colonyId);
    },

    _renderQuizRegionButtons(colonyId) {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel cr-quiz-panel';

        var colony = this._quizColonies[this._quizIndex];

        var prompt = document.createElement('div');
        prompt.className = 'cw-map-prompt';
        var promptLabel = document.createElement('div');
        promptLabel.className = 'cw-map-prompt-label';
        promptLabel.textContent = 'Which region?';
        prompt.appendChild(promptLabel);
        var promptName = document.createElement('div');
        promptName.className = 'cw-map-prompt-name';
        promptName.textContent = colony.name;
        prompt.appendChild(promptName);
        panel.appendChild(prompt);

        var buttons = document.createElement('div');
        buttons.className = 'cr-region-buttons';
        var self = this;

        this._REGIONS.forEach(function(region) {
            var btn = document.createElement('button');
            btn.className = 'cr-region-btn';
            btn.style.borderLeftColor = self._REGION_COLORS[region.id].fill;
            btn.textContent = region.name;
            btn.addEventListener('click', function() {
                self._checkQuizAnswer(colony, region);
            });
            buttons.appendChild(btn);
        });

        panel.appendChild(buttons);
        this._container.appendChild(panel);
    },

    _checkQuizAnswer(colony, chosenRegion) {
        if (this._quizLocked) return;
        this._quizLocked = true;

        var correctRegion = this._regionForColony(colony.id);
        var correct = correctRegion && correctRegion.id === chosenRegion.id;
        if (correct) this._quizScore++;

        var g = this._container.querySelector('.cr-colony[data-state-id="' + colony.id + '"]');
        if (g) {
            g.classList.remove('selected');
            if (correct) {
                g.classList.add('fs-flash-correct');
                var paths = g.querySelectorAll('.fs-state-path');
                for (var i = 0; i < paths.length; i++) {
                    paths[i].style.fill = this._REGION_COLORS[correctRegion.id].fill;
                }
            } else {
                g.classList.add('fs-flash-wrong');
            }
        }

        var feedbackText = correct
            ? 'Correct! ' + colony.name + ' is a ' + correctRegion.name.replace(' Colonies', '') + ' colony.'
            : colony.name + ' is actually a ' + (correctRegion ? correctRegion.name.replace(' Colonies', '') : '') + ' colony.';

        var msg = document.createElement('div');
        msg.className = 'cw-map-feedback ' + (correct ? 'correct' : 'wrong');
        msg.textContent = feedbackText;
        this._container.appendChild(msg);

        var self = this;
        var run = this._quizStartTime;
        setTimeout(function() {
            msg.remove();
            // The student may have left the quiz during the feedback window.
            if (self._mode !== 'quiz' || self._quizStartTime !== run || !self._container) return;
            if (g) {
                g.classList.remove('fs-flash-correct', 'fs-flash-wrong');
                g.classList.add('fs-answered');
                if (correctRegion) {
                    var paths = g.querySelectorAll('.fs-state-path');
                    for (var i = 0; i < paths.length; i++) {
                        paths[i].style.fill = self._REGION_COLORS[correctRegion.id].fill;
                    }
                }
            }
            self._quizIndex++;
            self._quizLocked = false;
            self._renderQuizPanel();
        }, 1400);
    },

    _renderQuizPanel() {
        var existing = document.getElementById('cr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cr-map-panel';
        panel.className = 'cw-map-panel cr-quiz-panel';

        var info = document.getElementById('cr-map-header-info');
        if (info) {
            info.textContent = '';
            var scoreEl = document.createElement('span');
            scoreEl.className = 'cw-map-score';
            scoreEl.textContent = 'Score: ' + this._quizScore + ' / ' + this._quizTotal;
            info.appendChild(scoreEl);
            var progEl = document.createElement('span');
            progEl.className = 'cw-map-progress';
            progEl.textContent = 'Colony ' + Math.min(this._quizIndex + 1, this._quizTotal) + ' of ' + this._quizTotal;
            info.appendChild(progEl);
        }

        if (this._quizIndex >= this._quizColonies.length) {
            this._renderQuizResults(panel);
        } else {
            var total = this._quizTotal;
            var done = this._quizIndex;
            var progWrap = document.createElement('div');
            progWrap.className = 'fs-progress';
            var progLabel = document.createElement('div');
            progLabel.className = 'fs-progress-label';
            progLabel.textContent = done + ' of ' + total + ' colonies asked';
            progWrap.appendChild(progLabel);
            var progBar = document.createElement('div');
            progBar.className = 'fs-progress-bar';
            var progFill = document.createElement('div');
            progFill.className = 'fs-progress-fill';
            progFill.style.width = ((done / total) * 100).toFixed(1) + '%';
            progBar.appendChild(progFill);
            progWrap.appendChild(progBar);
            panel.appendChild(progWrap);

            var current = this._quizColonies[this._quizIndex];
            var prompt = document.createElement('div');
            prompt.className = 'cw-map-prompt';
            var promptLabel = document.createElement('div');
            promptLabel.className = 'cw-map-prompt-label';
            promptLabel.textContent = 'Find on the map, then name its region:';
            prompt.appendChild(promptLabel);
            var promptName = document.createElement('div');
            promptName.className = 'cw-map-prompt-name';
            promptName.textContent = current.name;
            prompt.appendChild(promptName);
            panel.appendChild(prompt);
        }

        this._container.appendChild(panel);
    },

    _renderQuizResults(panel) {
        var elapsed = Math.floor((Date.now() - this._quizStartTime) / 1000);
        var total = this._quizTotal;
        var pct = Math.round((this._quizScore / total) * 100);

        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'colonial-regions-map') || {};
        var prevBest = typeof saved.bestScore === 'number' ? saved.bestScore : -1;
        var prevTime = saved.bestTime || null;
        ProgressManager.saveActivityProgress(unitId, 'colonial-regions-map', {
            bestScore: Math.max(prevBest, this._quizScore),
            bestTime: pct === 100 ? (prevTime === null ? elapsed : Math.min(prevTime, elapsed)) : prevTime,
            attempts: (saved.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        });

        var heading = document.createElement('h2');
        heading.className = 'cw-map-results-heading';
        heading.textContent = pct === 100 ? 'Perfect Score!' : 'Quiz Complete';
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
        again.addEventListener('click', function() { self._startQuiz(); });
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
