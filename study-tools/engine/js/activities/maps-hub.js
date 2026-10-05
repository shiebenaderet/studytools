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
        var self = this;
        maps.forEach(function(m) {
            var btn = buildMapCard(m, function() { renderMapImage(container, config, m, function() { self.render(container, config); }); });
            modes.appendChild(btn);
        });
        wrapper.appendChild(modes);

        container.appendChild(wrapper);
    }
});

function buildMapCard(m, openImage) {
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
        // An entry with an `image` is a still map shown right here; anything
        // else names a map activity. StudyEngine is declared with `const` at
        // script top level, so it's not a property of `window`.
        if (m.image) openImage();
        else StudyEngine.activateActivity(m.id);
    });
    return card;
}

// A still map (a handout map, a primary-source map): the picture, its caption,
// and one question with its Look at / Start with, the way the handouts ask it.
// Entry: { id, title, description, icon, image, caption, credit, question, lookAt, startWith }.
// `image` is relative to the unit folder.
function renderMapImage(container, config, m, back) {
    container.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'map-still';

    var backBtn = document.createElement('button');
    backBtn.className = 'map-still-back';
    var bi = document.createElement('i'); bi.className = 'fas fa-arrow-left';
    backBtn.appendChild(bi);
    backBtn.appendChild(document.createTextNode(' All maps'));
    backBtn.addEventListener('click', back);
    wrap.appendChild(backBtn);

    var h = document.createElement('h2');
    h.textContent = m.title || '';
    wrap.appendChild(h);

    var src = /^(https?:)?\//.test(m.image) ? m.image : '../units/' + config.unit.id + '/' + m.image;
    var fig = document.createElement('figure');
    var a = document.createElement('a');
    a.href = src; a.target = '_blank'; a.rel = 'noopener';
    a.title = 'Open the full-size map';
    var img = document.createElement('img');
    img.src = src;
    img.alt = m.caption || m.title || 'Map';
    a.appendChild(img);
    fig.appendChild(a);
    if (m.caption || m.credit) {
        var cap = document.createElement('figcaption');
        cap.textContent = m.caption || '';
        if (m.credit) {
            var cr = document.createElement('span');
            cr.className = 'map-still-credit';
            cr.textContent = ' ' + m.credit;
            cap.appendChild(cr);
        }
        fig.appendChild(cap);
    }
    wrap.appendChild(fig);

    if (m.question) {
        var qb = document.createElement('div');
        qb.className = 'map-still-q';
        var qh = document.createElement('div');
        qh.className = 'map-still-qtext';
        qh.textContent = m.question;
        qb.appendChild(qh);
        [['Look at: ', m.lookAt], ['Start with: ', m.startWith]].forEach(function(pair) {
            if (!pair[1]) return;
            var line = document.createElement('div');
            var b = document.createElement('strong'); b.textContent = pair[0];
            line.appendChild(b);
            line.appendChild(document.createTextNode(pair[1]));
            qb.appendChild(line);
        });
        wrap.appendChild(qb);
    }
    container.appendChild(wrap);
}
