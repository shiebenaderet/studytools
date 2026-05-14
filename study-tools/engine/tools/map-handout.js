// study-tools/engine/tools/map-handout.js
// Logic for the "Full map handout" tab in map-exporter.html.
// Builds a layered SVG (background, labels, title, legend) and exports as PNG.

(function() {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEWBOX = { w: 900, h: 700 };

  const ALLEGIANCE_COLORS = {
    union:       '#3b6cb3',
    confederate: '#a83232',
    border:      '#a37a30',
    territory:   '#7a8a7a',
  };
  const ALLEGIANCE_LABELS = {
    union:       'Union',
    confederate: 'Confederate',
    border:      'Border',
    territory:   'Territory',
  };

  const TITLE_TEXT = {
    map1861:     'United States in 1861',
    territorial: 'Territorial Expansion of the United States',
    fiftystates: 'The Fifty United States',
  };

  const TITLE_PLACEMENT = {
    // For 1861: top-left over Canadian border / upper Atlantic empty space.
    map1861:     { x: 10,  y: 10, anchor: 'start' },
    // For territorial: top-right over Atlantic east of the 13 colonies
    // (Oregon already occupies the top-left).
    territorial: { x: 890, y: 10, anchor: 'end'   },
    // 50-states: top-left works since the upper region is Canadian border /
    // empty water; Alaska/Hawaii are inset to the lower-left.
    fiftystates: { x: 10,  y: 10, anchor: 'start' },
  };

  // USPS 2-letter abbreviations for 50-states map handout labels. Keyed on
  // the lowercase state id used in fifty-states-data.js (no spaces).
  const FIFTY_STATES_ABBRS = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR',
    california: 'CA', colorado: 'CO', connecticut: 'CT', delaware: 'DE',
    florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
    illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS',
    kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
    massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
    missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    newhampshire: 'NH', newjersey: 'NJ', newmexico: 'NM', newyork: 'NY',
    northcarolina: 'NC', northdakota: 'ND', ohio: 'OH', oklahoma: 'OK',
    oregon: 'OR', pennsylvania: 'PA', rhodeisland: 'RI', southcarolina: 'SC',
    southdakota: 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
    vermont: 'VT', virginia: 'VA', washington: 'WA', westvirginia: 'WV',
    wisconsin: 'WI', wyoming: 'WY',
  };

  const handoutState = {
    mapKey:     'map1861',
    fillStyle:  'outlined',  // 'blank' | 'shaded' | 'outlined'
    labels:     true,
    showDate:   false,
    showTitle:  true,
    showLegend: true,
    size:       1200,
  };

  // ── Region access ──────────────────────────────────────────
  function getRegionsForHandout(mapKey) {
    if (mapKey === 'map1861') {
      return window.MAP_1861_REGIONS.map(r => ({
        id:           r.id,
        name:         r.name,
        paths:        r.paths,
        allegiance:   r.allegiance,
        abbr:         r.abbr,
        labelOffset:  r.labelOffset || { x: 0, y: 0 },
        isTiny:       r.isTiny || false,
        labelLeader:  r.labelLeader || null,
      }));
    }
    if (mapKey === 'fiftystates') {
      return window.FIFTY_STATES_DATA.map(r => ({
        id:           r.id,
        name:         r.name,
        paths:        r.paths,
        abbr:         FIFTY_STATES_ABBRS[r.id] || r.name,
        // 50-states data has no allegiance/color — use a single neutral
        // tone so the handout has a consistent look without trying to
        // invent a color scheme.
        color:        '#7a8a7a',
        labelOffset:  { x: 0, y: 0 },
        isTiny:       false,
        labelLeader:  null,
      }));
    }
    return window.TERRITORIAL_REGIONS.map(r => ({
      id:           r.id,
      name:         r.name,
      paths:        [r.path],
      color:        r.color,
      yearAcquired: r.yearAcquired,
      labelOffset:  r.labelOffset || { x: 0, y: 0 },
    }));
  }

  // ── Layer builders (stubbed; filled in later tasks) ────────
  function buildBackgroundLayer(regions, mapKey, fillStyle) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'background');

    for (const r of regions) {
      const regionColor = mapKey === 'map1861'
        ? ALLEGIANCE_COLORS[r.allegiance]
        : r.color;

      let fill, stroke, strokeWidth;
      switch (fillStyle) {
        case 'blank':
          fill = '#ffffff'; stroke = '#2a2a2a'; strokeWidth = 1.0;
          break;
        case 'shaded':
          fill = regionColor; stroke = '#2a2a2a'; strokeWidth = 0.8;
          break;
        case 'outlined':
        default:
          fill = '#ffffff'; stroke = regionColor; strokeWidth = 1.8;
          break;
      }

      for (const d of r.paths) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('fill', fill);
        p.setAttribute('stroke', stroke);
        p.setAttribute('stroke-width', String(strokeWidth));
        p.setAttribute('stroke-linejoin', 'round');
        g.appendChild(p);
      }
    }
    return g;
  }

  function getRegionBBox(region) {
    // Render paths into an offscreen SVG, measure, then remove.
    const probe = document.createElementNS(SVG_NS, 'svg');
    probe.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:900px;height:700px;';
    for (const d of region.paths) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      probe.appendChild(p);
    }
    document.body.appendChild(probe);
    let bbox;
    try { bbox = probe.getBBox(); }
    finally { document.body.removeChild(probe); }
    return bbox;
  }

  function buildLabelsLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'labels');
    g.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
    g.setAttribute('text-anchor', 'middle');
    g.setAttribute('fill', '#1a1a1a');

    for (const r of regions) {
      const lines = [];
      if (mapKey === 'map1861' || mapKey === 'fiftystates') {
        // Both state maps label by USPS abbreviation.
        if (r.abbr) lines.push(r.abbr);
      } else {
        // territorial map
        if (opts.showName !== false) lines.push(r.name);
        if (opts.showDate) lines.push(r.yearAcquired);
      }
      if (lines.length === 0) continue;

      const bbox = getRegionBBox(r);
      if (!bbox || bbox.width === 0) continue;

      const cx = bbox.x + bbox.width / 2 + (r.labelOffset?.x || 0);
      const cy = bbox.y + bbox.height / 2 + (r.labelOffset?.y || 0);

      // Auto-size: clamp to a sensible range based on bbox.
      const fitWidth = Math.min(bbox.width, bbox.height * 1.6);
      // Both state maps use short USPS abbreviations, which fit at ~0.35× the
      // bbox; territorial uses long region names that need a smaller ratio.
      const isStateMap = mapKey === 'map1861' || mapKey === 'fiftystates';
      let fontSize = isStateMap
        ? Math.max(6, Math.min(16, fitWidth * 0.35))
        : Math.max(8, Math.min(20, fitWidth * 0.13));

      // Tiny states (or auto-detected small bboxes) get a leader line out into
      // whitespace. If the data has an explicit labelLeader, use it; otherwise
      // fall back to "place to the right of the bbox".
      const isTinyByBbox = bbox.width < 14;
      if (isStateMap && (r.isTiny || isTinyByBbox)) {
        const leadX = r.labelLeader?.x ?? (bbox.x + bbox.width + 14);
        const leadY = r.labelLeader?.y ?? (cy + 4);

        // Anchor end of leader line just before the text so it doesn't visually
        // touch the letterforms. We draw to a point ~3px before leadX in the
        // direction the line is travelling.
        const dx = leadX - cx;
        const dy = leadY - cy;
        const len = Math.max(1, Math.hypot(dx, dy));
        const lineEndX = leadX - (dx / len) * 4;
        const lineEndY = leadY - (dy / len) * 4;

        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', String(cx));
        line.setAttribute('y1', String(cy));
        line.setAttribute('x2', String(lineEndX));
        line.setAttribute('y2', String(lineEndY));
        line.setAttribute('stroke', '#444');
        line.setAttribute('stroke-width', '0.6');
        g.appendChild(line);

        // Fixed legible font size for leader-line labels — they sit in whitespace
        // so we don't need to fit them inside the (tiny) state.
        const leaderFontSize = 12;

        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(leadX));
        t.setAttribute('y', String(leadY + leaderFontSize * 0.35));
        t.setAttribute('font-size', String(leaderFontSize));
        t.setAttribute('font-weight', '600');
        t.setAttribute('text-anchor', 'middle');
        t.textContent = lines.join(' ');
        g.appendChild(t);
        continue;
      }

      const lineHeight = fontSize * 1.1;
      const totalHeight = lineHeight * lines.length;
      const startY = cy - totalHeight / 2 + lineHeight * 0.85;

      lines.forEach((text, i) => {
        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(cx));
        t.setAttribute('y', String(startY + i * lineHeight));
        t.setAttribute('font-size', String(fontSize));
        t.setAttribute('font-weight', i === 0 ? '600' : '400');
        t.textContent = text;
        g.appendChild(t);
      });
    }
    return g;
  }

  function buildTitleLayer(mapKey) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'title');

    const text = TITLE_TEXT[mapKey];
    const place = TITLE_PLACEMENT[mapKey];
    if (!text || !place) return g;

    // Approximate text width to size the background rect. SVG can't measure
    // before render, but at font-size 18 a roughly-monospace estimate of
    // 0.55em per char is close enough for letterforms in this title.
    const fontSize = 18;
    const padX = 10, padY = 6;
    const estTextWidth = text.length * fontSize * 0.55;
    const boxW = estTextWidth + padX * 2;
    const boxH = fontSize + padY * 2;
    const boxX = place.anchor === 'end' ? place.x - boxW : place.x;
    const boxY = place.y;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(boxX));
    rect.setAttribute('y', String(boxY));
    rect.setAttribute('width', String(boxW));
    rect.setAttribute('height', String(boxH));
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('stroke', '#2a2a2a');
    rect.setAttribute('stroke-width', '0.8');
    rect.setAttribute('rx', '4');
    g.appendChild(rect);

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(boxX + boxW / 2));
    t.setAttribute('y', String(boxY + boxH / 2 + fontSize * 0.35));
    t.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
    t.setAttribute('font-size', String(fontSize));
    t.setAttribute('font-weight', '700');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', '#1a1a1a');
    t.textContent = text;
    g.appendChild(t);

    return g;
  }

  function buildLegendItems(regions, mapKey, opts) {
    if (mapKey === 'map1861') {
      // 3 slavery-status entries (Option A: by legal status in 1861).
      // Confederate + Border both permitted slavery — they share a row.
      // Color shown for each row matches the map's allegiance fill.
      return [
        { color: ALLEGIANCE_COLORS.confederate, label: 'Slavery permitted' },
        { color: ALLEGIANCE_COLORS.union,       label: 'Slavery prohibited' },
        { color: ALLEGIANCE_COLORS.territory,   label: 'Slavery undetermined' },
      ];
    }
    if (mapKey === 'fiftystates') {
      // No semantic categories on the plain 50-states map — return empty so
      // buildLegendLayer renders nothing rather than 50 identical rows.
      return [];
    }
    // Territorial: one entry per region, in the order they appear in the data
    // (which is roughly chronological).
    return regions.map(r => ({
      color: r.color,
      label: opts.showDate ? `${r.name} (${r.yearAcquired})` : r.name,
    }));
  }

  function buildLegendLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'legend');

    const items = buildLegendItems(regions, mapKey, opts);
    if (items.length === 0) return g;

    const fontSize = 11;
    const swatch = 12;
    const rowH = swatch + 4;
    const padX = 10, padY = 8;
    const labelWidth = Math.max(
      ...items.map(it => it.label.length * fontSize * 0.55)
    );
    const boxW = padX * 2 + swatch + 6 + labelWidth;
    const boxH = padY * 2 + rowH * items.length;

    // Bottom-right of the 900x700 viewBox.
    const boxX = 900 - boxW - 10;
    const boxY = 700 - boxH - 10;

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(boxX));
    rect.setAttribute('y', String(boxY));
    rect.setAttribute('width', String(boxW));
    rect.setAttribute('height', String(boxH));
    rect.setAttribute('fill', '#ffffff');
    rect.setAttribute('stroke', '#2a2a2a');
    rect.setAttribute('stroke-width', '0.8');
    rect.setAttribute('rx', '4');
    g.appendChild(rect);

    items.forEach((item, i) => {
      const rowY = boxY + padY + i * rowH;

      const sw = document.createElementNS(SVG_NS, 'rect');
      sw.setAttribute('x', String(boxX + padX));
      sw.setAttribute('y', String(rowY));
      sw.setAttribute('width', String(swatch));
      sw.setAttribute('height', String(swatch));
      // Empty swatches for the printable fill-in handout (blank/outlined map).
      // Colored swatches when the map itself is shaded (teacher's reference).
      sw.setAttribute('fill', opts.fillStyle === 'shaded' ? item.color : '#ffffff');
      sw.setAttribute('stroke', '#2a2a2a');
      sw.setAttribute('stroke-width', '0.5');
      g.appendChild(sw);

      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(boxX + padX + swatch + 6));
      t.setAttribute('y', String(rowY + swatch * 0.85));
      t.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
      t.setAttribute('font-size', String(fontSize));
      t.setAttribute('fill', '#1a1a1a');
      t.textContent = item.label;
      g.appendChild(t);
    });

    return g;
  }

  // ── Top-level builder ──────────────────────────────────────
  function buildHandoutSVG(state) {
    const regions = getRegionsForHandout(state.mapKey);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
    svg.appendChild(buildBackgroundLayer(regions, state.mapKey, state.fillStyle));

    // Labels layer runs if either the labels checkbox is on, OR (territorial
    // only) the showDate checkbox is on without labels.
    const wantLabels = state.labels || (state.mapKey === 'territorial' && state.showDate);
    if (wantLabels) {
      svg.appendChild(buildLabelsLayer(regions, state.mapKey, {
        showDate: state.showDate,
        showName: state.labels,
      }));
    }
    if (state.showTitle)  svg.appendChild(buildTitleLayer(state.mapKey));
    if (state.showLegend) svg.appendChild(buildLegendLayer(regions, state.mapKey, {
      showDate:  state.showDate,
      fillStyle: state.fillStyle,
    }));
    return svg;
  }

  // Expose for use by inline page script (UI wiring in later tasks).
  window.MapHandout = {
    state:           handoutState,
    buildHandoutSVG: buildHandoutSVG,
  };
})();
