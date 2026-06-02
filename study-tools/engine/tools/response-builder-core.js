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
  // Math.random. Simple index-rotation + swap based on the seed.
  api.scramblePlan = function (plan, seed) {
    var a = plan.slice();
    var s = (typeof seed === 'number' ? seed : 0) + 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff; // LCG step
      var j = s % (i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ResponseBuilderCore = api;
})();
