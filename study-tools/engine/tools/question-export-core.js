(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.QExport = api;
})(this, function () {
  function defaultShuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pickDistractors(items, correctValue, category, n, shuffleFn) {
    shuffleFn = shuffleFn || defaultShuffle;
    var seen = {}; seen[correctValue] = true;
    function collect(pool) {
      var out = [];
      shuffleFn(pool).forEach(function (it) {
        if (out.length >= n) return;
        if (seen[it.value]) return;
        seen[it.value] = true; out.push(it.value);
      });
      return out;
    }
    var sameCat = items.filter(function (it) { return it.category === category; });
    var result = collect(sameCat);
    if (result.length < n) {
      var others = items.filter(function (it) { return it.category !== category; });
      result = result.concat(collect(others).slice(0, n - result.length));
    }
    return result.slice(0, n);
  }
  function csvField(v) {
    v = String(v == null ? '' : v);
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvField).join(','); }).join('\r\n') + '\r\n';
  }
  function normalizeQuestions(config) {
    var qs = (config && config.practiceQuestions) || [];
    var out = [];
    qs.forEach(function (q, i) {
      if (!q || !Array.isArray(q.options) || typeof q.correct !== 'number') return;
      if (q.correct < 0 || q.correct >= q.options.length) return;
      if (q.options.length < 2) return;
      var opts = q.options.slice(0, 4);
      while (opts.length < 4) opts.push('');
      out.push({ id: i, question: q.question || '', options: opts, correctIndex: q.correct, topic: q.topic || 'Uncategorized' });
    });
    return out;
  }
  function normalizeFib(config, shuffleFn) {
    var items = (config && config.fillInBlankSentences) || [];
    var pool = items.map(function (it) { return { value: it.answer, category: it.category || 'Uncategorized' }; });
    var out = [];
    items.forEach(function (it, i) {
      if (!it || !it.sentence || !it.answer) return;
      var cat = it.category || 'Uncategorized';
      var distractors = pickDistractors(pool, it.answer, cat, 3, shuffleFn);
      var options = [it.answer].concat(distractors);
      while (options.length < 4) options.push('');
      var order = (shuffleFn || defaultShuffle)([0, 1, 2, 3]);
      var shuffled = order.map(function (idx) { return options[idx]; });
      out.push({ id: i, question: it.sentence, options: shuffled, correctIndex: order.indexOf(0), topic: cat });
    });
    return out;
  }
  function normalizeVocab(config, opts, shuffleFn) {
    opts = opts || {};
    var direction = opts.direction || 'definition-term';
    var includeEncounter = !!opts.includeEncounter;
    var vocab = (config && config.vocabulary) || [];
    var filtered = vocab.filter(function (v) {
      if (!v || !v.term || !v.definition) return false;
      if (v.tier === 'encounter' && !includeEncounter) return false;
      return true;
    });
    var pool = filtered.map(function (v) {
      return { value: direction === 'term-definition' ? v.definition : v.term, category: v.category || 'Uncategorized' };
    });
    var out = [];
    filtered.forEach(function (v, i) {
      var cat = v.category || 'Uncategorized';
      var promptVal = direction === 'term-definition' ? v.term : v.definition;
      var correctVal = direction === 'term-definition' ? v.definition : v.term;
      var distractors = pickDistractors(pool, correctVal, cat, 3, shuffleFn);
      var options = [correctVal].concat(distractors);
      while (options.length < 4) options.push('');
      var order = (shuffleFn || defaultShuffle)([0, 1, 2, 3]);
      var shuffled = order.map(function (idx) { return options[idx]; });
      out.push({ id: i, question: promptVal, options: shuffled, correctIndex: order.indexOf(0), topic: cat });
    });
    return out;
  }
  // Timeline: "When did this happen?" with 4 year choices. The choices show
  // the starting year only ("Feb 1763" and "1828-1833" become 1763 and 1828),
  // so a month or a range can't give the answer away. Wrong answers are the
  // years of the nearest other events, never the same year as the answer.
  function timelineYear(v) {
    var m = String(v == null ? '' : v).match(/\d{3,4}/);
    return m ? parseInt(m[0], 10) : null;
  }
  function normalizeTimeline(config, shuffleFn) {
    shuffleFn = shuffleFn || defaultShuffle;
    var events = (config && config.timelineEvents) || [];
    var years = [];
    events.forEach(function (e) {
      var y = e && timelineYear(e.year);
      if (y != null && years.indexOf(y) < 0) years.push(y);
    });
    var out = [];
    events.forEach(function (e, i) {
      if (!e || !e.title) return;
      var y = timelineYear(e.year);
      if (y == null) return;
      var near = years.filter(function (x) { return x !== y; })
        .sort(function (a, b) { return Math.abs(a - y) - Math.abs(b - y) || a - b; })
        .slice(0, 6);
      var distractors = shuffleFn(near).slice(0, 3);
      // Fewer than 3 other years in the unit: fill with nearby years.
      for (var step = 1; distractors.length < 3; step++) {
        [y - step, y + step].forEach(function (c) {
          if (distractors.length < 3 && distractors.indexOf(c) < 0) distractors.push(c);
        });
      }
      var options = [String(y)].concat(distractors.map(String));
      var order = shuffleFn([0, 1, 2, 3]);
      out.push({
        id: i,
        question: 'When did this happen? ' + e.title,
        options: order.map(function (idx) { return options[idx]; }),
        correctIndex: order.indexOf(0),
        topic: (Math.floor(y / 10) * 10) + 's'
      });
    });
    return out;
  }

  // Map regions: "Which region is highlighted on the map below?" with the
  // region's picture and 4 names from the same map. regions is the list from
  // MapRender.getRegions(mapKey): [{ id, name, group }].
  var MAP_PROMPT = 'Which region is highlighted on the map below?';
  function mapImageFile(regionId) {
    return String(regionId).replace(/[^A-Za-z0-9_-]+/g, '-') + '.png';
  }
  function normalizeMapRegions(regions, mapKey, shuffleFn) {
    shuffleFn = shuffleFn || defaultShuffle;
    regions = regions || [];
    var pool = regions.map(function (r) { return { value: r.name, category: r.group || 'Regions' }; });
    return regions.map(function (r, i) {
      var distractors = pickDistractors(pool, r.name, r.group || 'Regions', 3, shuffleFn);
      var options = [r.name].concat(distractors);
      while (options.length < 4) options.push('');
      var order = shuffleFn([0, 1, 2, 3]);
      return {
        id: i,
        question: MAP_PROMPT,
        options: order.map(function (idx) { return options[idx]; }),
        correctIndex: order.indexOf(0),
        topic: r.group || 'Regions',
        _image: { mapKey: mapKey, regionId: r.id, file: mapImageFile(r.id), alt: 'Map with highlighted region' }
      };
    });
  }

  var BLOOKET_TIME = 20;
  function formatBlooket(questions) {
    var rows = [['Question #','Question Text','Answer 1','Answer 2','Answer 3','Answer 4','Time Limit (sec)','Correct Answer(s)']];
    questions.forEach(function (q, i) {
      rows.push([i + 1, q.question, q.options[0], q.options[1], q.options[2], q.options[3], BLOOKET_TIME, q.correctIndex + 1]);
    });
    return toCsv(rows);
  }
  function formatGimkitTyped(questions) {
    var rows = [['Question', 'Answer']];
    questions.forEach(function (q) { rows.push([q.question, q.options[q.correctIndex]]); });
    return toCsv(rows);
  }
  function formatGimkit(questions) {
    var rows = [['Question','Correct Answer','Incorrect Answer 1','Incorrect Answer 2','Incorrect Answer 3']];
    questions.forEach(function (q) {
      var wrong = q.options.filter(function (_, idx) { return idx !== q.correctIndex; });
      rows.push([q.question, q.options[q.correctIndex], wrong[0] || '', wrong[1] || '', wrong[2] || '']);
    });
    return toCsv(rows);
  }
  function xmlEscape(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  function slugify(v) {
    var s = String(v == null ? '' : v).normalize('NFKD').replace(/[̀-ͯ]/g, '');
    s = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'untitled';
  }
  function renderMCItem(q, idx) {
    var itemId = 'q' + idx;
    var labels = q.options.map(function (opt, i) {
      var lid = itemId + '_a' + i;
      return '            <response_label ident="' + lid + '">\n' +
             '              <material><mattext texttype="text/plain">' + xmlEscape(opt) + '</mattext></material>\n' +
             '            </response_label>';
    }).join('\n');
    var correctLid = itemId + '_a' + q.correctIndex;
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/html">' + xmlEscape(q.question) + '</mattext></material>',
      '        <response_lid ident="response1" rcardinality="Single">',
      '          <render_choice>',
                  labels,
      '          </render_choice>',
      '        </response_lid>',
      '      </presentation>',
      '      <resprocessing>',
      '        <outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>',
      '        <respcondition continue="No">',
      '          <conditionvar><varequal respident="response1">' + correctLid + '</varequal></conditionvar>',
      '          <setvar action="Set" varname="SCORE">100</setvar>',
      '        </respcondition>',
      '      </resprocessing>',
      '    </item>'
    ].join('\n');
  }
  // Image questions follow the verified Canvas pattern: escaped <img> inside a
  // text/html mattext, src on %24IMS-CC-FILEBASE%24/<id>/images/.
  function renderImageMCItem(q, idx, assessmentId) {
    var html = '<p>' + xmlEscape(q.question) + '</p>' +
      '<p><img src="%24IMS-CC-FILEBASE%24/' + assessmentId + '/images/' + q._image.file + '" alt="' +
      xmlEscape(q._image.alt || 'Map with highlighted region') + '"/></p>';
    var item = renderMCItem(Object.assign({}, q, { question: '' }), idx);
    return item.replace('<mattext texttype="text/html"></mattext>', '<mattext texttype="text/html">' + xmlEscape(html) + '</mattext>');
  }
  function renderShortAnswerItem(q, idx) {
    var itemId = 'q' + idx;
    var accepted = (q._accepted && q._accepted.length)
      ? q._accepted
      : [q.options && q.options[q.correctIndex]].filter(function (x) { return x; });
    var conds = accepted.map(function (ans) {
      return '        <respcondition continue="No" case="No">\n' +
             '          <conditionvar><varequal respident="response1">' + xmlEscape(ans) + '</varequal></conditionvar>\n' +
             '          <setvar action="Set" varname="SCORE">100</setvar>\n' +
             '        </respcondition>';
    }).join('\n');
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>short_answer_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/html">' + xmlEscape(q.question) + '</mattext></material>',
      '        <response_str ident="response1" rcardinality="Single">',
      '          <render_fib><response_label ident="answer1" rshuffle="No"/></render_fib>',
      '        </response_str>',
      '      </presentation>',
      '      <resprocessing>',
      '        <outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>',
                conds,
      '      </resprocessing>',
      '    </item>'
    ].join('\n');
  }
  function renderEssayItem(q, idx) {
    var itemId = 'q' + idx;
    var ess = q._essay || {};
    var blocks = [String(q.question || '').trim()];
    if (ess.keyTerms && ess.keyTerms.length) {
      blocks.push('');
      blocks.push('Key terms to consider: ' + ess.keyTerms.join(', '));
    }
    if (ess.sentenceStarters && ess.sentenceStarters.length) {
      blocks.push('');
      blocks.push('Suggested sentence starters:');
      ess.sentenceStarters.forEach(function (s) { blocks.push('- ' + s); });
    }
    var combined = blocks.join('\n');
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>essay_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/plain">' + xmlEscape(combined) + '</mattext></material>',
      '        <response_str ident="response1" rcardinality="Single">',
      '          <render_fib><response_label ident="answer1" rshuffle="No"/></render_fib>',
      '        </response_str>',
      '      </presentation>',
      '    </item>'
    ].join('\n');
  }
  function pickRenderer(source) {
    if (source === 'shortAnswer') return renderEssayItem;
    if (source === 'fib') return renderShortAnswerItem;
    return renderMCItem;
  }

  function buildAssessmentXml(items, opts) {
    var assessmentId = opts.assessmentId;
    var title = xmlEscape(opts.title || assessmentId);
    var attempts = parseInt(opts.maxAttempts, 10) || 1;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      '  <assessment ident="' + assessmentId + '" title="' + title + '">',
      '    <qtimetadata>',
      '      <qtimetadatafield><fieldlabel>cc_maxattempts</fieldlabel><fieldentry>' + attempts + '</fieldentry></qtimetadatafield>',
      '    </qtimetadata>',
      '    <section ident="root_section">',
            items.join('\n'),
      '    </section>',
      '  </assessment>',
      '</questestinterop>',
      ''
    ].join('\n');
  }

  function buildManifestXml(assessmentId, imageFiles) {
    var resId = 'res_' + assessmentId;
    var manId = 'manifest_' + assessmentId;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<manifest identifier="' + manId + '"',
      '  xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"',
      '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">',
      '  <metadata>',
      '    <schema>IMS Content</schema>',
      '    <schemaversion>1.1.3</schemaversion>',
      '  </metadata>',
      '  <organizations/>',
      '  <resources>',
      '    <resource identifier="' + resId + '" type="imsqti_xmlv1p2/imscc_xmlv1p1/assessment">',
      '      <file href="' + assessmentId + '/' + assessmentId + '.xml"/>',
    ].concat((imageFiles || []).map(function (f) {
      return '      <file href="' + assessmentId + '/images/' + f + '"/>';
    })).concat([
      '    </resource>',
      '  </resources>',
      '</manifest>',
      ''
    ]).join('\n');
  }

  // Map quizzes get the map in the id, so two maps from one unit don't collide.
  function canvasAssessmentId(opts) {
    opts = opts || {};
    var parts = [opts.unitId || 'quiz', opts.source || 'set'];
    if (opts.mapKey) parts.push(opts.mapKey);
    return slugify(parts.join('-'));
  }
  function buildCanvasPackage(questions, opts) {
    opts = opts || {};
    var assessmentId = canvasAssessmentId(opts);
    var renderer = pickRenderer(opts.source);
    var prepped = questions.map(function (q) {
      if (opts.source === 'fib') {
        return Object.assign({}, q, { _accepted: [q.options[q.correctIndex]] });
      }
      return q;
    });
    var items = prepped.map(function (q, i) {
      return q._image ? renderImageMCItem(q, i + 1, assessmentId) : renderer(q, i + 1);
    });
    // opts.images: { 'file.png': Blob or bytes } drawn by the page before building.
    var images = opts.images || {};
    var imageFiles = [];
    prepped.forEach(function (q) {
      if (q._image && imageFiles.indexOf(q._image.file) < 0) imageFiles.push(q._image.file);
    });
    var assessmentXml = buildAssessmentXml(items, { assessmentId: assessmentId, title: opts.title, maxAttempts: opts.maxAttempts });
    var manifestXml = buildManifestXml(assessmentId, imageFiles);
    var fileMap = {};
    fileMap['imsmanifest.xml'] = manifestXml;
    fileMap[assessmentId + '/' + assessmentId + '.xml'] = assessmentXml;
    imageFiles.forEach(function (f) {
      if (images[f]) fileMap[assessmentId + '/images/' + f] = images[f];
    });
    return { assessmentId: assessmentId, fileMap: fileMap };
  }
  var COLOR_WORDS = /\b(red|blue|green|yellow|orange|purple|pink|gray|grey|shaded|colored|coloured)\b/i;
  var CANVAS_RULES = [
    { id: 'title-present', message: 'Quiz title is required.',
      check: function (qs, opts) { return (!opts.title || !String(opts.title).trim()) ? [-1] : []; } },
    { id: 'at-least-one-selected', message: 'Select at least one question.',
      check: function (qs) { return qs.length ? [] : [-1]; } },
    { id: 'mc-has-correct', message: 'Multiple-choice questions need at least one correct option.',
      check: function (qs, opts) {
        if (['practice', 'vocab', 'timeline', 'mapRegions'].indexOf(opts.source) < 0) return [];
        return qs.filter(function (q) { return q.correctIndex < 0 || !q.options || !q.options[q.correctIndex]; }).map(function (q) { return q.id; });
      } },
    { id: 'short-answer-has-accepted', message: 'Short-answer (FIB) needs an accepted answer.',
      check: function (qs, opts) {
        if (opts.source !== 'fib') return [];
        return qs.filter(function (q) { return !q.options || !q.options[q.correctIndex] || !String(q.options[q.correctIndex]).trim(); }).map(function (q) { return q.id; });
      } },
    { id: 'map-prompt-color-neutral', message: 'Map questions must not name a color (highlight colors shift in Canvas). Say "highlighted".',
      check: function (qs, opts) {
        if (opts.source !== 'mapRegions') return [];
        return qs.filter(function (q) { return COLOR_WORDS.test(q.question || ''); }).map(function (q) { return q.id; });
      } },
    { id: 'essay-no-scoring', message: 'Essay questions must not carry scoring data.',
      check: function (qs, opts) {
        if (opts.source !== 'shortAnswer') return [];
        return qs.filter(function (q) { return q._scoring || (q.options && q.options.length); }).map(function (q) { return q.id; });
      } }
  ];

  function validateForCanvas(questions, opts) {
    opts = opts || {};
    var errors = [];
    CANVAS_RULES.forEach(function (r) {
      var ids = r.check(questions, opts);
      if (ids && ids.length) errors.push({ ruleId: r.id, message: r.message, questionIds: ids.filter(function (x) { return x !== -1; }) });
    });
    return { ok: errors.length === 0, errors: errors };
  }
  function selfCheckPackage(pkg) {
    var errors = [];
    var manifest = pkg.fileMap['imsmanifest.xml'];
    if (!manifest) errors.push('Missing imsmanifest.xml');
    var innerPath = pkg.assessmentId + '/' + pkg.assessmentId + '.xml';
    if (!pkg.fileMap[innerPath]) errors.push('Missing assessment xml at ' + innerPath);
    if (manifest && manifest.indexOf('<file href="' + innerPath + '"') < 0) {
      errors.push('Manifest does not reference ' + innerPath);
    }
    var inner = pkg.fileMap[innerPath] || '';
    if (inner.indexOf('<assessment ident="' + pkg.assessmentId + '"') < 0) {
      errors.push('Assessment ident does not match folder/file: ' + pkg.assessmentId);
    }
    // Every image in the zip is listed in the manifest, and every <img> points at one.
    Object.keys(pkg.fileMap).forEach(function (path) {
      if (path.indexOf(pkg.assessmentId + '/images/') !== 0) return;
      if (!manifest || manifest.indexOf('<file href="' + path + '"/>') < 0) errors.push('Image not listed in manifest: ' + path);
    });
    var srcs = inner.match(/%24IMS-CC-FILEBASE%24\/[^&"]+/g) || [];
    srcs.forEach(function (src) {
      var path = src.replace('%24IMS-CC-FILEBASE%24/', '');
      if (!pkg.fileMap[path]) errors.push('Question image missing from package: ' + path);
    });
    var identMatches = (inner.match(/<response_label ident="([^"]+)"/g) || []);
    var values = identMatches.map(function (m) { return m.replace(/<response_label ident="/, '').replace(/"$/, ''); });
    var seen = {};
    values.forEach(function (v) {
      // render_fib placeholder "answer1" is scoped per-item and may repeat across items
      if (v === 'answer1') return;
      if (seen[v]) errors.push('Duplicate response_label ident in package: ' + v);
      seen[v] = true;
    });
    values.forEach(function (v) {
      if (/^\d+$/.test(v)) errors.push('Numeric ident not allowed: ' + v);
    });
    return errors;
  }
  return { csvField: csvField, toCsv: toCsv, normalizeQuestions: normalizeQuestions, formatBlooket: formatBlooket, formatGimkit: formatGimkit, formatGimkitTyped: formatGimkitTyped, pickDistractors: pickDistractors, normalizeFib: normalizeFib, normalizeVocab: normalizeVocab, normalizeTimeline: normalizeTimeline, timelineYear: timelineYear, normalizeMapRegions: normalizeMapRegions, mapImageFile: mapImageFile, MAP_PROMPT: MAP_PROMPT, renderImageMCItem: renderImageMCItem, canvasAssessmentId: canvasAssessmentId, xmlEscape: xmlEscape, slugify: slugify, renderMCItem: renderMCItem, renderShortAnswerItem: renderShortAnswerItem, renderEssayItem: renderEssayItem, buildAssessmentXml: buildAssessmentXml, buildManifestXml: buildManifestXml, buildCanvasPackage: buildCanvasPackage, validateForCanvas: validateForCanvas, CANVAS_RULES: CANVAS_RULES, selfCheckPackage: selfCheckPackage };
});
