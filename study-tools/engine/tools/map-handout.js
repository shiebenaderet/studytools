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

  function buildLabelsLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'labels');
    // Filled in Task 7
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
    if (state.labels)     svg.appendChild(buildLabelsLayer(regions, state.mapKey, { showDate: state.showDate }));
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
