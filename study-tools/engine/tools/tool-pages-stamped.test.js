#!/usr/bin/env node
// The teacher pages outside the student app (the exporters, the dashboard) are
// not covered by the service worker, and GitHub Pages lets browsers keep files
// for 10 minutes. A reload fetches the page fresh but can reuse a kept script,
// so a page could run with an older copy of its own code and stop working (Nov
// 16, 2026: the Question Exporter after the chapter-titles change). Each page
// must load its local scripts with a per-visit stamp instead of a plain
// <script src="...">.
// Run: node study-tools/engine/tools/tool-pages-stamped.test.js
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..', '..');
var PAGES = [
  'engine/tools/question-exporter.html',
  'engine/tools/map-exporter.html',
  'dashboard/index.html'
];
// Vendored libraries whose files never change in place may load plainly.
var ALLOWED = ['../engine/vendor/supabase-js.min.js'];

var failures = [];
PAGES.forEach(function (rel) {
  var html = fs.readFileSync(path.join(root, rel), 'utf8');
  var re = /<script\s+[^>]*src="([^"]+)"/g, m;
  while ((m = re.exec(html))) {
    var src = m[1];
    // Already stamped (a document.write loader building "...?v=" + stamp), remote, or allowed.
    if (/\?v=/.test(src) || /^https?:/.test(src) || ALLOWED.indexOf(src) !== -1) continue;
    failures.push(rel + ': loads ' + src + ' without a version stamp (load it through the page\'s stamped loader)');
  }
});

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('tool-pages-stamped: ' + PAGES.length + ' pages load their scripts with a stamp');
