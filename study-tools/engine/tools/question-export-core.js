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

  function buildManifestXml(assessmentId) {
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
      '    </resource>',
      '  </resources>',
      '</manifest>',
      ''
    ].join('\n');
  }

  function buildCanvasPackage(questions, opts) {
    opts = opts || {};
    var assessmentId = slugify((opts.unitId || 'quiz') + '-' + (opts.source || 'set'));
    var renderer = pickRenderer(opts.source);
    var prepped = questions.map(function (q) {
      if (opts.source === 'fib') {
        return Object.assign({}, q, { _accepted: [q.options[q.correctIndex]] });
      }
      return q;
    });
    var items = prepped.map(function (q, i) { return renderer(q, i + 1); });
    var assessmentXml = buildAssessmentXml(items, { assessmentId: assessmentId, title: opts.title, maxAttempts: opts.maxAttempts });
    var manifestXml = buildManifestXml(assessmentId);
    var fileMap = {};
    fileMap['imsmanifest.xml'] = manifestXml;
    fileMap[assessmentId + '/' + assessmentId + '.xml'] = assessmentXml;
    return { assessmentId: assessmentId, fileMap: fileMap };
  }
  var CANVAS_RULES = [
    { id: 'title-present', message: 'Quiz title is required.',
      check: function (qs, opts) { return (!opts.title || !String(opts.title).trim()) ? [-1] : []; } },
    { id: 'at-least-one-selected', message: 'Select at least one question.',
      check: function (qs) { return qs.length ? [] : [-1]; } },
    { id: 'mc-has-correct', message: 'Multiple-choice questions need at least one correct option.',
      check: function (qs, opts) {
        if (opts.source !== 'practice' && opts.source !== 'vocab') return [];
        return qs.filter(function (q) { return q.correctIndex < 0 || !q.options || !q.options[q.correctIndex]; }).map(function (q) { return q.id; });
      } },
    { id: 'short-answer-has-accepted', message: 'Short-answer (FIB) needs an accepted answer.',
      check: function (qs, opts) {
        if (opts.source !== 'fib') return [];
        return qs.filter(function (q) { return !q.options || !q.options[q.correctIndex] || !String(q.options[q.correctIndex]).trim(); }).map(function (q) { return q.id; });
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
  return { csvField: csvField, toCsv: toCsv, normalizeQuestions: normalizeQuestions, formatBlooket: formatBlooket, formatGimkit: formatGimkit, formatGimkitTyped: formatGimkitTyped, pickDistractors: pickDistractors, normalizeFib: normalizeFib, normalizeVocab: normalizeVocab, xmlEscape: xmlEscape, slugify: slugify, renderMCItem: renderMCItem, renderShortAnswerItem: renderShortAnswerItem, renderEssayItem: renderEssayItem, buildAssessmentXml: buildAssessmentXml, buildManifestXml: buildManifestXml, buildCanvasPackage: buildCanvasPackage, validateForCanvas: validateForCanvas, CANVAS_RULES: CANVAS_RULES };
});
