// Shared map drawing for the teacher tools (Map Exporter and Question Exporter).
// Needs the map data scripts loaded first: map-1861-data.js,
// map-exporter-territorial.js, fifty-states-data.js and thirteen-colonies-map.js.
// Every function takes the map key, so neither page's state is read here.
(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var VIEWBOX = { w: 900, h: 700 };
  var COLONY_REGION_COLOR = { 'New England Colonies': '#3b6cb3', 'Middle Colonies': '#5b8a3a', 'Southern Colonies': '#a83232' };
  var ALLEGIANCE_GROUP = { union: 'Union', confederate: 'Confederate', border: 'Border States', territory: 'Territories' };

  var MAPS = [
    { key: 'map1861', title: '1861 Civil War Map' },
    { key: 'territorial', title: 'Territorial Expansion' },
    { key: 'fiftystates', title: '50 US States' },
    { key: 'colonies13', title: '13 Colonies' }
  ];

  // The colonies map keeps its own frame (thirteen-colonies-map.js), not 900x700.
  function viewBox(mapKey) {
    if (mapKey === 'colonies13') {
      var v = (window.THIRTEEN_COLONIES_VIEWBOX || '0 0 1000 930').split(/\s+/).map(Number);
      return { w: v[2], h: v[3] };
    }
    return VIEWBOX;
  }

  function allegianceColor(a) {
    switch (a) {
      case 'union':       return '#3b6cb3';
      case 'confederate': return '#a83232';
      case 'border':      return '#a37a30';
      case 'territory':   return '#7a8a7a';
      default:            return '#8B4513';
    }
  }

  // Each region: { id, name, paths: [d...], color, group }.
  // group is the heading the Question Exporter sorts regions under.
  function getRegions(mapKey) {
    if (mapKey === 'map1861') {
      return (window.MAP_1861_REGIONS || []).map(function (r) {
        return { id: r.id, name: r.name, paths: r.paths, color: allegianceColor(r.allegiance),
                 group: ALLEGIANCE_GROUP[r.allegiance] || 'Other' };
      });
    }
    if (mapKey === 'colonies13') {
      return (window.THIRTEEN_COLONIES_DATA || []).map(function (r) {
        return { id: r.id, name: r.name, paths: r.paths, color: COLONY_REGION_COLOR[r.region] || '#d4883a',
                 group: r.region || 'Colonies' };
      });
    }
    if (mapKey === 'fiftystates') {
      // No natural color scheme, so every state uses the default highlight tone.
      return (window.FIFTY_STATES_DATA || []).map(function (r) {
        return { id: r.id, name: r.name, paths: r.paths, color: '#d4883a', group: 'States' };
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    // Territorial expansion uses a single path string.
    return (window.TERRITORIAL_REGIONS || []).map(function (r) {
      return { id: r.id, name: r.name, paths: [r.path], color: r.color, group: 'Territorial Regions' };
    });
  }

  function buildHighlightedSVG(mapKey, region, allRegions) {
    var box = viewBox(mapKey);
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', '0 0 ' + box.w + ' ' + box.h);

    // Colonies: the coastline and the land around them, so they don't float like islands.
    if (mapKey === 'colonies13' && window.THIRTEEN_COLONIES_LAND) {
      var defs = document.createElementNS(SVG_NS, 'defs');
      var clip = document.createElementNS(SVG_NS, 'clipPath');
      clip.setAttribute('id', 'mx-frame');
      var cr = document.createElementNS(SVG_NS, 'rect');
      cr.setAttribute('width', box.w); cr.setAttribute('height', box.h);
      clip.appendChild(cr); defs.appendChild(clip); svg.appendChild(defs);
      var sea = document.createElementNS(SVG_NS, 'rect');
      sea.setAttribute('width', box.w); sea.setAttribute('height', box.h); sea.setAttribute('fill', '#dbe9f0');
      svg.appendChild(sea);
      var land = document.createElementNS(SVG_NS, 'path');
      land.setAttribute('d', window.THIRTEEN_COLONIES_LAND);
      land.setAttribute('fill', '#f6f2ea'); land.setAttribute('stroke', '#9aa5ab'); land.setAttribute('stroke-width', '1.2');
      land.setAttribute('clip-path', 'url(#mx-frame)');
      svg.appendChild(land);
    }

    // Every other region in muted gray.
    var bg = document.createElementNS(SVG_NS, 'g');
    allRegions.forEach(function (r) {
      if (r.id === region.id) return;
      r.paths.forEach(function (d) {
        var p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('fill', '#e8e2d4');
        p.setAttribute('stroke', '#b8ad94');
        p.setAttribute('stroke-width', '0.6');
        bg.appendChild(p);
      });
    });
    svg.appendChild(bg);

    // The highlighted region on top, with a strong fill and a thicker stroke.
    var fg = document.createElementNS(SVG_NS, 'g');
    region.paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', region.color || '#d4883a');
      p.setAttribute('stroke', '#2a2a2a');
      p.setAttribute('stroke-width', '1.4');
      fg.appendChild(p);
    });
    svg.appendChild(fg);
    return svg;
  }

  // Bounding box of a region's paths, measured in a hidden SVG.
  function regionBBox(mapKey, region) {
    var box = viewBox(mapKey);
    var probe = document.createElementNS(SVG_NS, 'svg');
    probe.setAttribute('viewBox', '0 0 ' + box.w + ' ' + box.h);
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:' + box.w + 'px;height:' + box.h + 'px;';
    region.paths.forEach(function (d) {
      var p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      probe.appendChild(p);
    });
    document.body.appendChild(probe);
    try { return probe.getBBox(); } finally { document.body.removeChild(probe); }
  }

  // Small regions (Rhode Island, Delaware) are a few pixels wide on a full
  // map, so a ring is drawn around them. Only for Canvas question images.
  function addCallout(svg, mapKey, region) {
    var box = viewBox(mapKey);
    var bb = regionBBox(mapKey, region);
    if (Math.max(bb.width, bb.height) > box.w * 0.05) return false;
    var r = Math.max(bb.width, bb.height) / 2 + box.w * 0.022;
    var ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', bb.x + bb.width / 2);
    ring.setAttribute('cy', bb.y + bb.height / 2);
    ring.setAttribute('r', r);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#2a2a2a');
    ring.setAttribute('stroke-width', box.w * 0.004);
    svg.appendChild(ring);
    return true;
  }

  function svgToCanvas(svgElement, targetWidth) {
    return new Promise(function (resolve, reject) {
      var xml = new XMLSerializer().serializeToString(svgElement);
      var url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      var vb = svgElement.getAttribute('viewBox').split(/\s+/).map(Number);
      var W = targetWidth;
      var H = Math.round(targetWidth * (vb[3] / vb[2]));
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) { canvas.toBlob(function (b) { resolve(b); }, 'image/png'); });
  }

  function svgToPNG(svgElement, targetWidth) {
    return svgToCanvas(svgElement, targetWidth).then(canvasToBlob);
  }

  // Crop to the non-white box (any channel under 240) plus padding, so the
  // highlighted region isn't tiny on screen in Canvas.
  function cropCanvas(canvas, pad) {
    pad = pad == null ? 0.05 : pad;
    var ctx = canvas.getContext('2d');
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1;
    for (var y = 0; y < canvas.height; y++) {
      for (var x = 0; x < canvas.width; x++) {
        var i = (y * canvas.width + x) * 4;
        if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return canvas;
    var px = Math.round((x1 - x0) * pad), py = Math.round((y1 - y0) * pad);
    var cx = Math.max(0, x0 - px), cy = Math.max(0, y0 - py);
    var cw = Math.min(canvas.width, x1 + px + 1) - cx, ch = Math.min(canvas.height, y1 + py + 1) - cy;
    var out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    var octx = out.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, cw, ch);
    octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return out;
  }

  // One cropped PNG of a region highlighted on its map, for a Canvas question.
  function renderRegionPng(mapKey, regionId, opts) {
    opts = opts || {};
    var regions = getRegions(mapKey);
    var region = regions.filter(function (r) { return r.id === regionId; })[0];
    if (!region) return Promise.reject(new Error('No region ' + regionId + ' on map ' + mapKey));
    var svg = buildHighlightedSVG(mapKey, region, regions);
    if (opts.callout !== false) addCallout(svg, mapKey, region);
    return svgToCanvas(svg, opts.width || 1000).then(function (canvas) {
      return canvasToBlob(cropCanvas(canvas, opts.pad));
    });
  }

  window.MapRender = {
    MAPS: MAPS,
    viewBox: viewBox,
    allegianceColor: allegianceColor,
    getRegions: getRegions,
    buildHighlightedSVG: buildHighlightedSVG,
    svgToPNG: svgToPNG,
    cropCanvas: cropCanvas,
    regionBBox: regionBBox,
    renderRegionPng: renderRegionPng
  };
})();
