// Notebook Companion: what a student should put in their notebook before the quiz.
//
// Teacher request (2026-11-16): a Tools page that, from how a student has been
// studying, lists the core vocabulary to check off as it goes in the notebook,
// the practice questions they keep missing, an outline frame for each
// short-answer question (the quiz uses the same ones), and which textbook
// sections to read or reread over the coming weeks.
//
// Everything here is pure: it reads config, textbook and progress objects and
// returns plain data, so the rules can be tested in Node. The page itself is
// drawn by notebook-companion.js.
(function () {
  var api = {};
  var DAY = 86400000;

  // The quiz's local midnight, as a timestamp (null if none or bad).
  function quizTime(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d.getTime() : null;
  }
  api.quizTime = quizTime;

  function startOfDay(t) {
    var d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  // Core vocabulary: must-know terms, or every term in a unit without tiers.
  api.coreTerms = function (config) {
    var vocab = (config && config.vocabulary) || [];
    var tiered = vocab.some(function (v) { return v.tier; });
    return vocab.filter(function (v) { return !tiered || !v.tier || v.tier === 'must-know'; });
  };

  // Chapters in first-appearance order of the vocabulary.
  api.categories = function (config) {
    var seen = {}, out = [];
    ((config && config.vocabulary) || []).forEach(function (v) {
      if (v.category && !seen[v.category]) { seen[v.category] = true; out.push(v.category); }
    });
    return out;
  };

  // The vocabulary checklist, grouped by chapter.
  //   checks:   activity_notebook.terms ({ term: { on, at } })
  //   mastered: flashcard mastered terms
  //   weak:     weakness_tracker.terms ({ term: misses })
  api.vocabChecklist = function (config, checks, mastered, weak, openCategories) {
    checks = checks || {}; mastered = mastered || []; weak = weak || {};
    var open = openCategories || api.categories(config);
    var terms = api.coreTerms(config);
    return api.categories(config).map(function (cat) {
      var list = terms.filter(function (v) { return v.category === cat; }).map(function (v) {
        return {
          term: v.term,
          definition: v.definition,
          inNotebook: !!(checks[v.term] && checks[v.term].on),
          mastered: mastered.indexOf(v.term) !== -1,
          misses: weak[v.term] || 0
        };
      });
      return { category: cat, open: open.indexOf(cat) !== -1, terms: list };
    }).filter(function (g) { return g.terms.length; });
  };

  // Same id rule as MasteryManager.questionId.
  function qid(q) { return ((q && q.question) || '').substring(0, 80); }
  api.questionId = qid;

  // Practice questions on the student's wrong list, in config order.
  api.missedQuestions = function (config, ptMastery) {
    var wrong = (ptMastery && ptMastery.wrong) || [];
    var mastered = (ptMastery && ptMastery.mastered) || [];
    return ((config && config.practiceQuestions) || []).filter(function (q) {
      var id = qid(q);
      return wrong.indexOf(id) !== -1 && mastered.indexOf(id) === -1;
    }).map(function (q) {
      return {
        question: q.question,
        answer: q.options ? q.options[q.correct] : '',
        explanation: q.explanation || '',
        category: q.topic || q.category || ''
      };
    });
  };

  function segmentFor(textbook, category) {
    var segs = (textbook && textbook.segments) || [];
    for (var i = 0; i < segs.length; i++) {
      if ((segs[i].category || segs[i].title) === category) return segs[i];
    }
    return null;
  }
  api.segmentFor = segmentFor;

  function lower(s) { return String(s || '').toLowerCase(); }

  // Sections of a chapter that teach any of the given terms; the whole chapter
  // if none do. Each is { segId, secId, heading }.
  api.sectionsFor = function (textbook, category, terms) {
    var seg = segmentFor(textbook, category);
    if (!seg) return [];
    var want = (terms || []).map(lower);
    var hits = seg.sections.filter(function (s) {
      return (s.vocabTerms || []).some(function (t) { return want.indexOf(lower(t)) !== -1; });
    });
    return (hits.length ? hits : seg.sections).map(function (s) {
      return { segId: seg.id, secId: s.id, heading: s.heading };
    });
  };

  // One outline frame per short-answer question.
  //   drafts: { index: savedDraft } from activity_short-answer-<n>
  api.outlines = function (config, textbook, drafts) {
    drafts = drafts || {};
    return ((config && config.shortAnswerQuestions) || []).map(function (q, i) {
      var roles = (q.plan || []).map(function (p) { return p.role; });
      if (!roles.length) roles = ['claim', 'evidence', 'evidence', 'reasoning'];
      var n = 0;
      var parts = roles.map(function (r) {
        if (r === 'evidence') { n++; return 'Evidence ' + n; }
        return r.charAt(0).toUpperCase() + r.slice(1);
      });
      var d = drafts[i];
      return {
        index: i,
        question: q.question,
        category: q.topic || '',
        keyTerms: q.keyTerms || [],
        parts: parts,
        hasDraft: !!(d && d.answer && String(d.answer).trim()),
        reread: api.sectionsFor(textbook, q.topic, q.keyTerms)
      };
    });
  };

  // ── Reread schedule ──────────────────────────────────────────────────
  //
  // After a section is first read, it comes back about 2 days later, about 7
  // days later, and in the 2 days before the quiz. A reread counts toward a
  // step if it happens no more than a day early. Steps that would fall after
  // the quiz, or crowd the pre-quiz step, are dropped. A section that teaches
  // a term the student has missed twice or more since last reading it is due
  // now, whatever the schedule says.
  api.STEPS = [2, 7];
  api.QUIZ_LEAD = 2;
  api.WEAK_MISSES = 2;

  api.targets = function (firstRead, quiz) {
    var base = startOfDay(firstRead);
    var pre = quiz ? quiz - api.QUIZ_LEAD * DAY : null;
    var out = [];
    api.STEPS.forEach(function (d) {
      var t = base + d * DAY;
      if (pre !== null && t > pre - DAY) return;
      out.push(t);
    });
    if (pre !== null && pre > base) out.push(pre);
    return out;
  };

  // The next step not yet done, or null when every step is done.
  api.nextTarget = function (firstRead, rereads, quiz) {
    var rs = (rereads || []).slice().sort(function (a, b) { return a - b; });
    var used = -Infinity;
    var ts = api.targets(firstRead, quiz);
    for (var i = 0; i < ts.length; i++) {
      var hit = null;
      for (var j = 0; j < rs.length; j++) {
        if (rs[j] > used && rs[j] >= ts[i] - DAY) { hit = rs[j]; break; }
      }
      if (hit === null) return { at: ts[i], step: i, last: i === ts.length - 1, beforeQuiz: quiz !== null && ts[i] === quiz - api.QUIZ_LEAD * DAY };
      used = hit;
    }
    return null;
  };

  // opts: { config, textbook, tbProgress, weak, openCategories, now }
  //   weak: the weakness_tracker object ({ terms, at })
  // Returns { read: [...], reread: [...], upcoming: [...] }, each item
  //   { segId, secId, heading, category, reason, at }
  api.readingPlan = function (opts) {
    var config = opts.config, textbook = opts.textbook;
    var now = opts.now || Date.now();
    var quiz = quizTime(config && config.unit && config.unit.quizDate);
    var plan = { read: [], reread: [], upcoming: [] };
    if (!textbook || !textbook.segments) return plan;
    if (quiz !== null && now >= quiz + DAY) return plan;

    var tb = opts.tbProgress || {};
    var sectionsRead = tb.sectionsRead || {};
    var readAt = tb.readAt || {};
    var rereads = tb.rereads || {};
    var weak = opts.weak || {};
    var weakTerms = weak.terms || {};
    var weakAt = weak.at || {};
    var open = opts.openCategories || null;
    var schedule = (config && config.categorySchedule) || {};
    var today = startOfDay(now);

    textbook.segments.forEach(function (seg) {
      var cat = seg.category || seg.title;
      if (open && open.indexOf(cat) === -1) return;
      seg.sections.forEach(function (s) {
        var key = seg.id + '/' + s.id;
        var item = { segId: seg.id, secId: s.id, heading: s.heading, category: cat };
        if (sectionsRead[key] !== true) {
          item.reason = 'Not read yet';
          plan.read.push(item);
          return;
        }
        var rs = rereads[key] || [];
        var lastTouch = Math.max(readAt[key] || 0, rs.length ? Math.max.apply(null, rs) : 0);

        // Terms this section teaches that the student keeps missing since
        // they last read it.
        var missed = (s.vocabTerms || []).filter(function (t) {
          return (weakTerms[t] || 0) >= api.WEAK_MISSES && (weakAt[t] || 0) > lastTouch;
        });
        if (missed.length) {
          item.reason = 'You keep missing ' + missed.join(', ');
          item.at = today;
          plan.reread.push(item);
          return;
        }

        // Read before read dates were kept: count from the chapter's open date.
        var first = readAt[key] || quizTime(schedule[cat]);
        if (!first) return;
        var next = api.nextTarget(first, rs, quiz);
        if (!next) return;
        item.at = next.at;
        item.reason = next.beforeQuiz ? 'Quiz review' : next.step === 0 ? 'First reread' : 'Second reread';
        if (next.at <= now) plan.reread.push(item);
        else plan.upcoming.push(item);
      });
    });
    plan.upcoming.sort(function (a, b) { return a.at - b.at; });
    return plan;
  };

  // Whether a section's reread is due now (for the textbook's button).
  api.isRereadDue = function (opts, segId, secId) {
    var plan = api.readingPlan(opts);
    return plan.reread.some(function (i) { return i.segId === segId && i.secId === secId; });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.NotebookCore = api;
})();
