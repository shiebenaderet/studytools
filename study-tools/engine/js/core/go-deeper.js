// Go Deeper: curated links (a video, a challenge reading, a reference
// article) per vocabulary category, from config.goDeeper. Rendered at the top
// of each Resource Library category and at the end of each textbook chapter.
// Links open in a new tab; nothing is embedded, so no third-party script or
// player loads on the site (see privacy.html).
//
// config.goDeeper: [
//   { "category": "Causes of Unrest", "type": "video" | "reading" | "reference",
//     "title": "...", "source": "YouTube", "url": "https://...",
//     "level": "everyone" | "challenge", "minutes": 11 }
// ]
const GoDeeper = {
    TYPES: {
        video:     { icon: 'fas fa-play-circle', label: 'Watch' },
        reading:   { icon: 'fas fa-book-open',   label: 'Read' },
        reference: { icon: 'fas fa-landmark',    label: 'Look up' }
    },

    forCategory(config, category) {
        var all = (config && Array.isArray(config.goDeeper)) ? config.goDeeper : [];
        return all.filter(function(link) {
            return link && link.url && link.title && link.category === category;
        });
    },

    // Returns a DOM block or null when the category has no links.
    // `where` is 'resources' or 'textbook' and only changes the intro line.
    render(config, category, where) {
        var links = this.forCategory(config, category);
        if (links.length === 0) return null;

        var box = document.createElement('div');
        box.className = 'gd-box gd-' + where;

        var head = document.createElement('div');
        head.className = 'gd-head';
        var icon = document.createElement('i');
        icon.className = 'fas fa-compass';
        head.appendChild(icon);
        head.appendChild(document.createTextNode(where === 'textbook' ? ' Keep going' : ' Go deeper'));
        box.appendChild(head);

        var intro = document.createElement('p');
        intro.className = 'gd-intro';
        intro.textContent = where === 'textbook'
            ? 'Finished the chapter? These go further than the textbook does.'
            : 'More on ' + category + ', picked by your teacher.';
        box.appendChild(intro);

        var row = document.createElement('div');
        row.className = 'gd-links';
        var self = this;
        links.forEach(function(link) {
            row.appendChild(self._chip(link));
        });
        box.appendChild(row);
        return box;
    },

    _chip(link) {
        var type = this.TYPES[link.type] || this.TYPES.reference;
        var a = document.createElement('a');
        a.className = 'gd-chip gd-chip-' + (this.TYPES[link.type] ? link.type : 'reference');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        var icon = document.createElement('i');
        icon.className = type.icon;
        a.appendChild(icon);

        var text = document.createElement('span');
        text.className = 'gd-chip-text';
        var title = document.createElement('span');
        title.className = 'gd-chip-title';
        title.textContent = link.title;
        text.appendChild(title);

        var metaParts = [];
        if (link.source) metaParts.push(link.source);
        if (link.minutes) metaParts.push(link.minutes + ' min');
        if (link.level === 'challenge') metaParts.push('Challenge reading');
        if (metaParts.length) {
            var meta = document.createElement('span');
            meta.className = 'gd-chip-meta';
            meta.textContent = metaParts.join(' · ');
            text.appendChild(meta);
        }
        a.appendChild(text);

        var ext = document.createElement('i');
        ext.className = 'fas fa-external-link-alt gd-chip-ext';
        ext.setAttribute('aria-hidden', 'true');
        a.appendChild(ext);
        return a;
    }
};
