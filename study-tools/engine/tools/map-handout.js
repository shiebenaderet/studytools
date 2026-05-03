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
      if (mapKey === 'map1861') {
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
      let fontSize = mapKey === 'map1861'
        ? Math.max(6, Math.min(16, fitWidth * 0.35))
        : Math.max(8, Math.min(20, fitWidth * 0.13));

      // Tiny states get a leader line out into surrounding whitespace, with
      // their label placed there. We treat very small bboxes the same way.
      const isTinyByBbox = bbox.width < 14;
      if (mapKey === 'map1861' && (r.isTiny || isTinyByBbox)) {
        // Place label to the right + slightly down; draw a short leader.
        const leadX = bbox.x + bbox.width + 14;
        const leadY = cy + 4;
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', cx);
        line.setAttribute('y1', cy);
        line.setAttribute('x2', leadX - 2);
        line.setAttribute('y2', leadY - 4);
        line.setAttribute('stroke', '#444');
        line.setAttribute('stroke-width', '0.6');
        g.appendChild(line);

        const t = document.createElementNS(SVG_NS, 'text');
        t.setAttribute('x', String(leadX));
        t.setAttribute('y', String(leadY));
        t.setAttribute('font-size', String(Math.max(8, fontSize)));
        t.setAttribute('text-anchor', 'start');
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
    // Filled in Task 8
    return g;
  }

  function buildLegendLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'legend');
    // Filled in Task 9
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
    if (state.showLegend) svg.appendChild(buildLegendLayer(regions, state.mapKey, { showDate: state.showDate }));
    return svg;
  }

  // Expose for use by inline page script (UI wiring in later tasks).
  window.MapHandout = {
    state:           handoutState,
    buildHandoutSVG: buildHandoutSVG,
  };
})();
