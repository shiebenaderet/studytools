// Shared renderer for "key term -> definition + example" detail panels.
// Extracted from short-answer.js so the response-builder wizard reuses the exact
// same behavior. DOM creation only (no innerHTML).
(function () {
  var api = {};

  // panel: the container element to fill. term: the term string. config: the unit config.
  api.render = function (panel, term, config) {
    while (panel.firstChild) panel.removeChild(panel.firstChild);
    panel.style.display = 'block';

    var vocab = (config && config.vocabulary) || [];
    var termLower = (term || '').toLowerCase();
    var entry = vocab.find(function(v) { return (v.term || '').toLowerCase() === termLower; });

    var heading = document.createElement('div');
    heading.className = 'key-term-details-heading';
    heading.textContent = term;
    panel.appendChild(heading);

    if (!entry) {
      var missing = document.createElement('div');
      missing.className = 'key-term-details-missing';
      missing.textContent = 'No definition on file for this term yet.';
      panel.appendChild(missing);
      return;
    }

    if (entry.definition) {
      var def = document.createElement('div');
      def.className = 'key-term-details-def';
      def.textContent = entry.definition;
      panel.appendChild(def);
    }

    if (entry.simpleExplanation) {
      var simple = document.createElement('div');
      simple.className = 'key-term-details-simple';
      simple.textContent = entry.simpleExplanation;
      panel.appendChild(simple);
    }

    if (entry.example) {
      var ex = document.createElement('div');
      ex.className = 'key-term-details-example';
      var exLabel = document.createElement('strong');
      exLabel.textContent = 'Example: ';
      ex.appendChild(exLabel);
      ex.appendChild(document.createTextNode(entry.example));
      panel.appendChild(ex);
    }

    // Optional: deep link into the textbook section that mentions this term.
    // Reuses the same map flashcards build, so behavior matches "Read in
    // textbook" in flashcards.
    var unitId = config && config.unit && config.unit.id;
    var textbook = unitId ? MasteryManager._textbookCache[unitId] : null;
    if (textbook && typeof MasteryManager.buildTermSectionMap === 'function') {
      var tbProgress = ProgressManager.getActivityProgress(unitId, 'textbook') || {};
      var sectionMap = MasteryManager.buildTermSectionMap(config, textbook, tbProgress.readingLevel || 'standard');
      var sectionInfo = sectionMap[entry.term];
      if (sectionInfo) {
        var actions = document.createElement('div');
        actions.className = 'key-term-details-actions';
        var tbBtn = document.createElement('button');
        tbBtn.type = 'button';
        tbBtn.className = 'key-term-details-tb-btn';
        var tbIcon = document.createElement('i');
        tbIcon.className = 'fas fa-book-open';
        tbBtn.appendChild(tbIcon);
        tbBtn.appendChild(document.createTextNode(' Read in textbook'));
        tbBtn.addEventListener('click', function() {
          StudyEngine.activateActivity('textbook', [sectionInfo.segmentId, sectionInfo.sectionId]);
        });
        actions.appendChild(tbBtn);
        panel.appendChild(actions);
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.TermDetails = api;
})();
