// Maps Hub — chooser screen that launches one of the unit's hidden map activities.
// Reads a `mapsHub.maps` array from the unit config so units can opt in any
// number of maps without code changes here. Each entry: { id, title, description, icon }.
StudyEngine.registerActivity({
    id: 'maps-hub',
    name: 'Maps',
    icon: 'fas fa-map',
    description: 'Explore the maps that shaped this unit.',
    category: 'study',

    render(container, config) {
        container.textContent = '';
        container.className = 'cw-map-screen';

        var maps = (config.mapsHub && config.mapsHub.maps) || [];
        if (maps.length === 0) {
            var empty = document.createElement('p');
            empty.textContent = 'No maps configured for this unit.';
            container.appendChild(empty);
            return;
        }

        var wrapper = document.createElement('div');
        wrapper.className = 'cw-map-menu';

        var title = document.createElement('h2');
        title.textContent = (config.mapsHub && config.mapsHub.title) || 'Maps';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = (config.mapsHub && config.mapsHub.description) ||
            'Pick a map to explore.';
        wrapper.appendChild(desc);

        var modes = document.createElement('div');
        modes.className = 'cw-map-modes';
        maps.forEach(function(m) {
            var btn = buildMapCard(m);
            modes.appendChild(btn);
        });
        wrapper.appendChild(modes);

        container.appendChild(wrapper);
    }
});

function buildMapCard(m) {
    var card = document.createElement('button');
    card.className = 'cw-map-mode-card';

    var iconWrap = document.createElement('div');
    iconWrap.className = 'cw-map-mode-icon';
    var icon = document.createElement('i');
    icon.className = m.icon || 'fas fa-map';
    iconWrap.appendChild(icon);
    card.appendChild(iconWrap);

    var h = document.createElement('h3');
    h.textContent = m.title || m.id;
    card.appendChild(h);

    var p = document.createElement('p');
    p.textContent = m.description || '';
    card.appendChild(p);

    card.addEventListener('click', function() {
        // StudyEngine is declared with `const` at script top level, so it's
        // not a property of `window` — reference it directly.
        StudyEngine.activateActivity(m.id);
    });
    return card;
}
