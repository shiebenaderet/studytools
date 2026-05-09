// Underground Railroad Map activity.
// Visual layers, back to front:
//   1. Routes (anonymous polylines, faded) — show the network's geography
//   2. Cities (20 clickable points) — interactive, with role/person/detail
//
// Single mode (Learn). The simulation already provides interactive practice;
// this map's job is to anchor the abolitionist vocab in real geography. No
// quiz mode is offered here.
StudyEngine.registerActivity({
    id: 'underground-railroad-map',
    name: 'Underground Railroad',
    icon: 'fas fa-map-signs',
    description: 'See the network of routes and people that led enslaved Americans to freedom.',
    category: 'study',
    hidden: true, // launched via the maps-hub chooser

    _container: null,
    _config: null,
    _selectedCity: null,
    _showStateLabels: false,

    // Visual color-coding by city role in the network
    _categoryColors: {
        slavery: '#7A1F1F',   // dark red — origin point, where people escape FROM
        station: '#c97a2c',   // amber — middle of network, conductor stations
        canada:  '#2d8659'    // green — terminus, freedom
    },

    // Manual label offsets to fix clusters — tuned for 14px labels.
    // Default for unlisted cities is { x: 0, y: -18 } (above the dot).
    _labelOffsets: {
        // Detroit / Chatham almost overlap horizontally — stack vertically
        'chatham':    { x: 0, y: 24 },
        'detroit':    { x: 0, y: -18 },
        // Cleveland / Oberlin cluster — push labels apart horizontally
        'cleveland':  { x: 38, y: 4 },
        'oberlin':    { x: -32, y: 4 },
        // Rochester / Syracuse / Buffalo / Albany strip across NY:
        // alternate above/below so labels don't crash into each other
        'buffalo':    { x: 0, y: -18 },   // above
        'rochester':  { x: 0, y: 24 },    // below
        'syracuse':   { x: 0, y: -18 },   // above
        'albany':     { x: 0, y: 24 },    // below
        'toronto':    { x: 0, y: -18 },
        // Baltimore / Dover / DC coastal cluster
        'baltimore':  { x: -32, y: 4 },
        'washington': { x: 0, y: 26 },
        'dover':      { x: 28, y: 26 },
        // Cincinnati / Ripley overlap
        'cincinnati': { x: 0, y: -18 },   // above
        'ripley':     { x: 0, y: 24 },    // below
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        this._selectedCity = null;
        this._renderMap();
    },

    _renderMap() {
        var c = this._container;
        c.textContent = '';
        c.className = 'ugrr-map-screen';

        // Header
        var header = document.createElement('div');
        header.className = 'ugrr-map-header';

        var title = document.createElement('h2');
        title.className = 'ugrr-map-title';
        title.textContent = 'The Underground Railroad';
        header.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'ugrr-map-subtitle';
        subtitle.textContent = 'Routes from Harper\'s Atlas of American History (1920). Click any city to learn about the people who made it a station.';
        header.appendChild(subtitle);

        // State names toggle button
        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'ugrr-map-toggle-btn';
        toggleBtn.textContent = this._showStateLabels ? 'Hide state names' : 'Show state names';
        var self = this;
        toggleBtn.addEventListener('click', function() {
            self._showStateLabels = !self._showStateLabels;
            self._renderMap();
        });
        header.appendChild(toggleBtn);

        c.appendChild(header);

        // Map SVG
        var svgWrap = document.createElement('div');
        svgWrap.className = 'ugrr-map-svg-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var meta = window.UGRR_MAP_META || { viewBox: '0 0 900 725' };
        svg.setAttribute('viewBox', meta.viewBox);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('class', 'ugrr-map-svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Base map (UGRR-specific tighter bbox so the network reads better).
        // Drawn back to front: states → state labels → lakes → routes → cities.
        var base = window.UGRR_MAP_BASE || { states: [], lakes: [], rivers: [] };

        var statesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        statesGroup.setAttribute('class', 'ugrr-map-states');
        for (var s = 0; s < base.states.length; s++) {
            var state = base.states[s];
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', state.d);
            path.setAttribute('fill', state.admin === 'CA' ? '#4a7058' : '#5d8c6c');
            path.setAttribute('stroke', '#f4ead5');
            path.setAttribute('stroke-width', '0.6');
            path.setAttribute('stroke-linejoin', 'round');
            statesGroup.appendChild(path);
        }
        svg.appendChild(statesGroup);

        // State labels (shown only when toggled on)
        if (this._showStateLabels) {
            var stateLabelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            stateLabelGroup.setAttribute('class', 'ugrr-map-state-labels');
            for (var sl = 0; sl < base.states.length; sl++) {
                var st = base.states[sl];
                if (!st.abbr || st.cx == null || st.cy == null) continue;
                // Skip labels that fall outside the visible viewBox
                if (st.cx < 5 || st.cx > 895 || st.cy < 5 || st.cy > 720) continue;
                var stl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                stl.setAttribute('x', st.cx);
                stl.setAttribute('y', st.cy);
                stl.setAttribute('class', 'ugrr-map-state-label');
                stl.setAttribute('text-anchor', 'middle');
                stl.setAttribute('fill', '#3a4a3a');
                stl.setAttribute('font-size', '11');
                stl.setAttribute('font-weight', '700');
                stl.setAttribute('paint-order', 'stroke');
                stl.setAttribute('stroke', 'rgba(244,234,213,0.9)');
                stl.setAttribute('stroke-width', '3');
                stl.setAttribute('stroke-linejoin', 'round');
                stl.setAttribute('pointer-events', 'none');
                stl.textContent = st.abbr;
                stateLabelGroup.appendChild(stl);
            }
            svg.appendChild(stateLabelGroup);
        }

        var lakesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lakesGroup.setAttribute('class', 'ugrr-map-lakes');
        for (var l = 0; l < base.lakes.length; l++) {
            var lake = base.lakes[l];
            var lakePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            lakePath.setAttribute('d', lake.d);
            lakePath.setAttribute('fill', '#b3d8e8');
            lakePath.setAttribute('stroke', 'none');
            lakesGroup.appendChild(lakePath);
        }
        svg.appendChild(lakesGroup);

        // Defs — arrowhead marker for the directional flow lines.
        // markerUnits=userSpaceOnUse so arrows DON'T scale with stroke-width
        // (default behavior is to scale, which produces huge arrowheads).
        // refX is set to land the arrow tip well before the destination dot
        // so it doesn't cover the city.
        var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'ugrr-arrowhead');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '10');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('markerUnits', 'userSpaceOnUse');
        marker.setAttribute('orient', 'auto-start-reverse');
        var arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrowPath.setAttribute('d', 'M0,0 L10,5 L0,10 Z');
        arrowPath.setAttribute('fill', '#5a1a0a');
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Route layer 1: historical Harper's Atlas routes — faded watermark
        var routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        routeGroup.setAttribute('class', 'ugrr-map-routes');
        var routes = window.UGRR_MAP_ROUTES || [];
        for (var i = 0; i < routes.length; i++) {
            var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            poly.setAttribute('points', routes[i]);
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', '#7a4a2c');
            poly.setAttribute('stroke-width', '1');
            poly.setAttribute('stroke-linecap', 'round');
            poly.setAttribute('stroke-linejoin', 'round');
            poly.setAttribute('opacity', '0.18');
            poly.setAttribute('pointer-events', 'none');
            routeGroup.appendChild(poly);
        }
        svg.appendChild(routeGroup);

        // Route layer 2: hand-curated directional flows connecting our cities.
        // Heavy strokes with arrowheads — these tell the "people moved north" story.
        var flowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        flowGroup.setAttribute('class', 'ugrr-map-flows');
        var flows = window.UGRR_MAP_FLOWS || [];
        for (var f = 0; f < flows.length; f++) {
            var flow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            flow.setAttribute('d', flows[f].d);
            flow.setAttribute('fill', 'none');
            flow.setAttribute('stroke', '#5a1a0a');
            flow.setAttribute('stroke-width', '4');
            flow.setAttribute('stroke-linecap', 'round');
            flow.setAttribute('opacity', '0.92');
            flow.setAttribute('marker-end', 'url(#ugrr-arrowhead)');
            flow.setAttribute('pointer-events', 'none');
            flowGroup.appendChild(flow);
        }
        svg.appendChild(flowGroup);

        // City layer
        var cityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        cityGroup.setAttribute('class', 'ugrr-map-cities');

        var cities = window.UGRR_MAP_CITIES || [];
        for (var ci = 0; ci < cities.length; ci++) {
            this._renderCity(cityGroup, cities[ci]);
        }
        svg.appendChild(cityGroup);

        // Click outside dismisses tooltip
        var self = this;
        svg.addEventListener('click', function(e) {
            if (e.target === svg || e.target.tagName === 'polyline') {
                self._dismissCity();
            }
        });

        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        // Info panel below the map
        this._renderPanel();
    },

    _renderCity(parent, city) {
        var self = this;
        var category = city.category || 'station';
        var color = this._categoryColors[category] || this._categoryColors.station;

        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'ugrr-map-city ugrr-map-city-' + category);
        g.dataset.cityId = city.id;

        // Hitbox (transparent, larger than visible dot)
        var hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitbox.setAttribute('cx', city.x);
        hitbox.setAttribute('cy', city.y);
        hitbox.setAttribute('r', 16);
        hitbox.setAttribute('fill', 'transparent');
        hitbox.setAttribute('class', 'ugrr-map-city-hit');
        g.appendChild(hitbox);

        // Visible dot — fill colored by category
        var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', city.x);
        dot.setAttribute('cy', city.y);
        dot.setAttribute('r', 7);
        dot.setAttribute('fill', color);
        dot.setAttribute('stroke', '#fff');
        dot.setAttribute('stroke-width', '2');
        dot.setAttribute('class', 'ugrr-map-city-dot');
        g.appendChild(dot);

        // Label with cluster-aware offset
        var offset = this._labelOffsets[city.id] || { x: 0, y: -12 };
        var anchor = 'middle';
        if (offset.x > 6) anchor = 'start';
        else if (offset.x < -6) anchor = 'end';
        var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', city.x + offset.x);
        label.setAttribute('y', city.y + offset.y);
        label.setAttribute('class', 'ugrr-map-label');
        label.setAttribute('text-anchor', anchor);
        label.textContent = city.name;
        g.appendChild(label);

        g.addEventListener('click', function(e) {
            e.stopPropagation();
            self._selectCity(city);
        });

        parent.appendChild(g);
    },

    _selectCity(city) {
        this._selectedCity = city;
        var dots = this._container.querySelectorAll('.ugrr-map-city');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('selected', dots[i].dataset.cityId === city.id);
        }
        this._renderPanel();
    },

    _dismissCity() {
        this._selectedCity = null;
        var dots = this._container.querySelectorAll('.ugrr-map-city');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.remove('selected');
        }
        this._renderPanel();
    },

    _renderPanel() {
        var existing = document.getElementById('ugrr-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'ugrr-map-panel';
        panel.className = 'ugrr-map-panel';

        // Legend is ALWAYS visible at the top of the panel — students can decode
        // the colors at any time, whether or not a city is selected.
        var legend = document.createElement('div');
        legend.className = 'ugrr-map-legend';
        legend.appendChild(this._legendItem('slavery', 'Slave state'));
        legend.appendChild(this._legendItem('station', 'Free state'));
        legend.appendChild(this._legendItem('canada', 'Canada (free)'));
        panel.appendChild(legend);

        if (!this._selectedCity) {
            var hint = document.createElement('p');
            hint.className = 'ugrr-map-panel-hint';
            hint.textContent = 'Click any city to read about the people who turned it into a station of the Underground Railroad. The faded lines show the major routes that escapees actually traveled, drawn from a 1920s atlas of historical maps.';
            panel.appendChild(hint);
        } else {
            var c = this._selectedCity;

            var nameRow = document.createElement('div');
            nameRow.className = 'ugrr-map-panel-name-row';

            var name = document.createElement('h3');
            name.className = 'ugrr-map-panel-name';
            name.textContent = c.name + ', ' + c.state;
            nameRow.appendChild(name);

            var role = document.createElement('span');
            role.className = 'ugrr-map-panel-role';
            role.textContent = c.role;
            nameRow.appendChild(role);
            panel.appendChild(nameRow);

            var personLabel = document.createElement('div');
            personLabel.className = 'ugrr-map-panel-section-label';
            personLabel.textContent = 'Who';
            panel.appendChild(personLabel);

            var personText = document.createElement('p');
            personText.className = 'ugrr-map-panel-person';
            personText.textContent = c.person;
            panel.appendChild(personText);

            var detailLabel = document.createElement('div');
            detailLabel.className = 'ugrr-map-panel-section-label';
            detailLabel.textContent = 'What made it matter';
            panel.appendChild(detailLabel);

            var detailText = document.createElement('p');
            detailText.className = 'ugrr-map-panel-detail';
            detailText.textContent = c.detail;
            panel.appendChild(detailText);

            var close = document.createElement('button');
            close.className = 'ugrr-map-panel-close';
            close.textContent = 'Close';
            close.addEventListener('click', this._dismissCity.bind(this));
            panel.appendChild(close);
        }

        this._container.appendChild(panel);
    },

    _legendItem(category, label) {
        var item = document.createElement('div');
        item.className = 'ugrr-map-legend-item';
        var dot = document.createElement('span');
        dot.className = 'ugrr-map-legend-dot';
        dot.style.background = this._categoryColors[category];
        item.appendChild(dot);
        var t = document.createElement('span');
        t.textContent = label;
        item.appendChild(t);
        return item;
    },

    deactivate() {
        this._selectedCity = null;
    }
});
