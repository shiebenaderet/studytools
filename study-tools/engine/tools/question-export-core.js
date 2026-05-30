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
  return { csvField: csvField, toCsv: toCsv, normalizeQuestions: normalizeQuestions, formatBlooket: formatBlooket, formatGimkit: formatGimkit, formatGimkitTyped: formatGimkitTyped, pickDistractors: pickDistractors, normalizeFib: normalizeFib, normalizeVocab: normalizeVocab, xmlEscape: xmlEscape, slugify: slugify, renderMCItem: renderMCItem, renderShortAnswerItem: renderShortAnswerItem };
});
