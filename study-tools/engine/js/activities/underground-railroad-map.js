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

    _container: null,
    _config: null,
    _selectedCity: null,

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

        // Base map: states + lakes (rivers omitted; the routes are the visual story here)
        // Drawn back to front: states → lakes → routes → cities.
        var base = window.CIVIL_WAR_MAP_BASE || { states: [], lakes: [], rivers: [] };

        // Reuse the Civil War map's CSS classes for the base layer — same
        // visual treatment, no duplicate CSS to maintain.
        var statesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        statesGroup.setAttribute('class', 'cw-map-states');
        for (var s = 0; s < base.states.length; s++) {
            var state = base.states[s];
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', state.d);
            path.setAttribute('class', 'cw-map-state cw-map-state-' + state.admin);
            statesGroup.appendChild(path);
        }
        svg.appendChild(statesGroup);

        var lakesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lakesGroup.setAttribute('class', 'cw-map-lakes');
        for (var l = 0; l < base.lakes.length; l++) {
            var lake = base.lakes[l];
            var lakePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            lakePath.setAttribute('d', lake.d);
            lakePath.setAttribute('class', 'cw-map-lake');
            lakesGroup.appendChild(lakePath);
        }
        svg.appendChild(lakesGroup);

        // Route layer (the historical escape paths from Harper's Atlas)
        var routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        routeGroup.setAttribute('class', 'ugrr-map-routes');
        var routes = window.UGRR_MAP_ROUTES || [];
        for (var i = 0; i < routes.length; i++) {
            var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            poly.setAttribute('points', routes[i]);
            poly.setAttribute('class', 'ugrr-map-route');
            routeGroup.appendChild(poly);
        }
        svg.appendChild(routeGroup);

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

        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'ugrr-map-city');
        g.dataset.cityId = city.id;

        // Hitbox (transparent, larger than visible dot)
        var hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitbox.setAttribute('cx', city.x);
        hitbox.setAttribute('cy', city.y);
        hitbox.setAttribute('r', 16);
        hitbox.setAttribute('fill', 'transparent');
        hitbox.setAttribute('class', 'ugrr-map-city-hit');
        g.appendChild(hitbox);

        // Visible dot
        var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', city.x);
        dot.setAttribute('cy', city.y);
        dot.setAttribute('r', 6);
        dot.setAttribute('class', 'ugrr-map-city-dot');
        g.appendChild(dot);

        // Label always shown for these 20 cities
        var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', city.x);
        label.setAttribute('y', city.y - 12);
        label.setAttribute('class', 'ugrr-map-label');
        label.setAttribute('text-anchor', 'middle');
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

        if (!this._selectedCity) {
            var hint = document.createElement('p');
            hint.className = 'ugrr-map-panel-hint';
            hint.textContent = 'Click any of the 20 highlighted cities to read about the people who turned it into a station of the Underground Railroad. The faded lines show the routes that escapees actually traveled, digitized from a 1920s atlas of historical maps.';
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

    deactivate() {
        this._selectedCity = null;
    }
});
