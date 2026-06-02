// Pure decision logic for the response-builder wizard's Step 4 (Claim/Evidence/
// Reasoning plan builder). No DOM, no Math.random, no Date.now — so it stays
// deterministic and testable like question-export-core.js / map-quiz-guard-core.js.
(function () {
  var api = {};

  var COACHING = {
    claim: 'A claim is your main point: the one-sentence answer to the question.',
    evidence: 'Evidence is a specific example or fact from the unit that proves your claim.',
    reasoning: 'Reasoning is the sentence that explains why your evidence adds up to your claim.'
  };

  // True when a piece belongs in a row of the given role.
  api.checkPlacement = function (piece, rowRole) {
    if (!piece || !rowRole) return false;
    return piece.role === rowRole;
  };

  // The ordered row roles for a plan: claim first, one evidence row per evidence
  // piece, reasoning last. Driven by the data so a plan can have 1–3 evidence.
  api.rowRolesFor = function (plan) {
    var roles = [];
    var evidence = 0;
    for (var i = 0; i < plan.length; i++) {
      if (plan[i].role === 'evidence') evidence++;
    }
    roles.push('claim');
    for (var e = 0; e < evidence; e++) roles.push('evidence');
    roles.push('reasoning');
    return roles;
  };

  // placements is aligned to rowRoles; each entry is the placed piece or null.
  api.isPlanComplete = function (rowRoles, placements) {
    if (!placements || placements.length !== rowRoles.length) return false;
    for (var i = 0; i < rowRoles.length; i++) {
      if (!api.checkPlacement(placements[i], rowRoles[i])) return false;
    }
    return true;
  };

  api.roleCoaching = function (role) {
    return COACHING[role] || '';
  };

  // Deterministic shuffle (seeded by an integer) so the tested core never calls
  // Math.random. Simple Fisher–Yates driven by an LCG.
  function shuffleOnce(plan, seed) {
    var a = plan.slice();
    var s = (seed & 0x7fffffff) + 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff; // LCG step
      var j = s % (i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function sameOrder(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // Deterministic scramble that NEVER returns the input order when the plan has
  // 2+ pieces. The wizard seeds this with the question's index (fixed per
  // question), so an identity result would pre-arrange the answer for that
  // question every time. Re-roll by advancing the seed until the order differs;
  // a final deterministic swap guarantees termination even if the loop can't
  // find one. A plan of length 0 or 1 can't differ from itself, so return as-is.
  api.scramblePlan = function (plan, seed) {
    var base = (typeof seed === 'number' ? seed : 0);
    if (plan.length < 2) return plan.slice();
    var result = shuffleOnce(plan, base);
    // Re-roll on identity. Bounded by plan.length re-rolls; if every attempt
    // still matches (vanishingly unlikely), fall through to a forced swap.
    for (var attempt = 0; attempt < plan.length && sameOrder(result, plan); attempt++) {
      result = shuffleOnce(plan, base + attempt + 1);
    }
    if (sameOrder(result, plan)) {
      var tmp = result[0]; result[0] = result[1]; result[1] = tmp;
    }
    return result;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ResponseBuilderCore = api;
})();
