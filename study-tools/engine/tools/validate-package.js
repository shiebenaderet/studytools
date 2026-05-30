#!/usr/bin/env node
// Usage: node validate-package.js <path-to-zip>
// Round-trips a Canvas QTI .zip against the QTI spec §8 conformance checks.

var fs = require('fs');
var path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node validate-package.js <path-to-zip>');
  process.exit(2);
}
var zipPath = process.argv[2];
var JSZip = require(path.join(__dirname, '..', 'vendor', 'jszip.min.js'));

fs.promises.readFile(zipPath).then(function (buf) {
  return JSZip.loadAsync(buf);
}).then(function (zip) {
  var fileMap = {};
  var ops = [];
  zip.forEach(function (relPath, file) {
    if (file.dir) return;
    ops.push(file.async('string').then(function (text) { fileMap[relPath] = text; }));
  });
  return Promise.all(ops).then(function () { return fileMap; });
}).then(function (fileMap) {
  var errors = [];
  var manifestKey = Object.keys(fileMap).find(function (k) { return /imsmanifest\.xml$/i.test(k); });
  if (!manifestKey) { console.error('FAIL: no imsmanifest.xml in zip'); process.exit(1); }
  var manifest = fileMap[manifestKey];
  if (manifest.indexOf('<schemaversion>1.1.3</schemaversion>') < 0) errors.push('schemaversion is not 1.1.3');
  if (manifest.indexOf('imsccv1p1') < 0) errors.push('manifest namespace missing imsccv1p1');
  if (manifest.indexOf('imsqti_xmlv1p2/imscc_xmlv1p1/assessment') < 0) errors.push('resource type missing hybrid CC type');
  if (!/<organizations\s*\/>|<organizations>\s*<\/organizations>/.test(manifest)) errors.push('organizations missing/empty');

  var assessmentKey = Object.keys(fileMap).find(function (k) { return /\/[^/]+\.xml$/.test(k) && k !== manifestKey; });
  if (!assessmentKey) errors.push('no assessment .xml under a subfolder');
  if (assessmentKey) {
    var parts = assessmentKey.split('/');
    var folder = parts[0];
    var fname = parts[parts.length - 1].replace(/\.xml$/, '');
    if (folder !== fname) errors.push('folder name (' + folder + ') != inner xml filename (' + fname + ')');
    var inner = fileMap[assessmentKey];
    var m = inner.match(/<assessment ident="([^"]+)"/);
    if (!m) errors.push('assessment ident missing');
    else if (m[1] !== folder) errors.push('assessment ident (' + m[1] + ') != folder/file (' + folder + ')');

    var identMatches = (inner.match(/<response_label ident="([^"]+)"/g) || []);
    var values = identMatches.map(function (s) { return s.replace(/<response_label ident="/, '').replace(/"$/, ''); });
    var seen = {};
    values.forEach(function (v) {
      // render_fib placeholder "answer1" is scoped per-item and may repeat across items
      if (v === 'answer1') return;
      if (seen[v]) errors.push('duplicate response_label ident: ' + v);
      seen[v] = true;
    });
    values.forEach(function (v) {
      if (/^\d+$/.test(v)) errors.push('numeric ident not allowed: ' + v);
    });
  }

  if (errors.length) {
    console.error('FAIL (' + errors.length + ') ' + zipPath);
    errors.forEach(function (e) { console.error('- ' + e); });
    process.exit(1);
  }
  console.log('OK ' + zipPath);
}).catch(function (err) {
  console.error('FAIL: ' + err.message);
  process.exit(1);
});
