# Textbook Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate flashcard categories behind reading the corresponding textbook chapter. Add reading level prompt, unlock progress visibility, and "Read in textbook" deep-links on flashcards.

**Architecture:** `MasteryManager` gains textbook-read checks. Flashcards show a gate screen or filtered terms based on chapter completion. Textbook gets a first-time reading level selector. Term-to-section mapping enables deep-linking from flashcard back face to the textbook.

**Tech Stack:** Vanilla JS, JSON config, CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `study-tools/engine/js/core/mastery.js` | Modify | Add `isChapterRead()`, `getChapterSectionIds()`, update `getUnlockedCategories()` to require chapter-read |
| `study-tools/engine/js/activities/textbook.js` | Modify | Add reading level prompt screen for first-time users |
| `study-tools/engine/js/activities/flashcards.js` | Modify | Gate screen, unlock progress indicator, locked categories in filter, "Read in textbook" link |
| `study-tools/engine/css/styles.css` | Modify | Styles for level prompt, gate screen, locked filter options, textbook link |

---

### Task 1: Add textbook-read check to MasteryManager

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js`

- [ ] **Step 1: Add `getChapterSectionIds` method**

This method loads textbook data and returns the section IDs for a given category's chapter. It needs the textbook JSON, which must be fetched async the first time and cached.

Add a `_textbookCache` property and these methods to `MasteryManager`:

```javascript
_textbookCache: {},

/**
 * Returns the textbook segment data for a unit, fetching and caching if needed.
 * Returns null if the unit has no textbook.
 */
async _loadTextbook(unitId) {
    if (this._textbookCache[unitId] !== undefined) return this._textbookCache[unitId];
    try {
        var resp = await fetch('../units/' + unitId + '/textbook.json');
        if (!resp.ok) { this._textbookCache[unitId] = null; return null; }
        var data = await resp.json();
        this._textbookCache[unitId] = data.textbookContent || data;
        return this._textbookCache[unitId];
    } catch (e) {
        this._textbookCache[unitId] = null;
        return null;
    }
},

/**
 * Returns section IDs for a textbook segment matching the given category name.
 * Returns null if no textbook or no matching segment.
 */
getChapterSectionIds(textbookContent, categoryName) {
    if (!textbookContent || !textbookContent.segments) return null;
    for (var i = 0; i < textbookContent.segments.length; i++) {
        var seg = textbookContent.segments[i];
        if (seg.title === categoryName) {
            return { segmentId: seg.id, sectionIds: seg.sections.map(function(s) { return s.id; }) };
        }
    }
    return null;
},

/**
 * Returns true if all sections in the category's textbook chapter have been read.
 * Returns true if the unit has no textbook (backwards compat).
 */
isChapterRead(unitId, textbookContent, categoryName) {
    if (!textbookContent) return true;
    var chapter = this.getChapterSectionIds(textbookContent, categoryName);
    if (!chapter) return true;
    var tbProgress = ProgressManager.getActivityProgress(unitId, 'textbook') || {};
    var sectionsRead = tbProgress.sectionsRead || {};
    return chapter.sectionIds.every(function(secId) {
        return sectionsRead[chapter.segmentId + '/' + secId] === true;
    });
},
```

- [ ] **Step 2: Update `getUnlockedCategories` to check chapter-read prerequisite**

The current method unlocks categories sequentially based on mastery. Add a textbook-read check: a category only unlocks if its chapter has been read AND the previous category is mastered.

Since `_loadTextbook` is async but `getUnlockedCategories` is sync, we need to preload the textbook. Add a sync version that uses the cache:

```javascript
/**
 * Sync version: returns unlocked categories factoring in textbook reading.
 * Requires textbook to be preloaded via _loadTextbook first.
 * If textbook not cached, falls back to mastery-only gating.
 */
getUnlockedCategories(unitId, config) {
    const categories = this.getCategories(config);
    if (categories.length === 0) return [];
    if (sessionStorage.getItem('teacher-unlock') === 'true') return categories.slice();

    var textbook = this._textbookCache[unitId] !== undefined ? this._textbookCache[unitId] : null;

    const unlocked = [];
    for (let i = 0; i < categories.length; i++) {
        // Category 0: must have chapter read (if textbook exists)
        // Category N>0: previous category mastered AND this chapter read
        if (i === 0) {
            if (this.isChapterRead(unitId, textbook, categories[i])) {
                unlocked.push(categories[i]);
            } else {
                break;
            }
        } else {
            if (this.isCategoryMastered(unitId, config, categories[i - 1]) &&
                this.isChapterRead(unitId, textbook, categories[i])) {
                unlocked.push(categories[i]);
            } else {
                break;
            }
        }
    }
    return unlocked;
},
```

- [ ] **Step 3: Add preload call in app.js init**

In `app.js`, after loading the config but before rendering, preload the textbook:

```javascript
// Preload textbook for mastery gating (async, non-blocking for units without textbook)
await MasteryManager._loadTextbook(this.config.unit.id);
```

Add this line right before `this.applyTheme()` in the `init` method (around line 358).

- [ ] **Step 4: Add `buildTermSectionMap` for flashcard deep-links**

```javascript
/**
 * Builds a map of term -> { segmentId, sectionId } for deep-linking from flashcards.
 * Scans textbook content at the given reading level for each vocab term.
 */
buildTermSectionMap(config, textbookContent, readingLevel) {
    var map = {};
    if (!textbookContent || !textbookContent.segments || !config.vocabulary) return map;
    var level = readingLevel || 'standard';
    config.vocabulary.forEach(function(v) {
        var termLower = v.term.toLowerCase();
        for (var si = 0; si < textbookContent.segments.length; si++) {
            var seg = textbookContent.segments[si];
            for (var sci = 0; sci < seg.sections.length; sci++) {
                var sec = seg.sections[sci];
                var content = (sec.content && sec.content[level]) || '';
                if (content.toLowerCase().indexOf(termLower) !== -1) {
                    map[v.term] = { segmentId: seg.id, sectionId: sec.id };
                    return; // Found, move to next term
                }
            }
        }
    });
    return map;
},
```

- [ ] **Step 5: Add helper to get next unread chapter info**

```javascript
/**
 * Returns info about the next chapter that needs reading, or null if all read.
 * Used by flashcards to show "Read Chapter X: Title" gate message.
 */
getNextUnreadChapter(unitId, config) {
    var textbook = this._textbookCache[unitId];
    if (!textbook) return null;
    var categories = this.getCategories(config);
    for (var i = 0; i < categories.length; i++) {
        if (!this.isChapterRead(unitId, textbook, categories[i])) {
            var chapter = this.getChapterSectionIds(textbook, categories[i]);
            return chapter ? { category: categories[i], segmentId: chapter.segmentId, index: i + 1 } : null;
        }
        // If chapter is read but not mastered, stop here (can't advance past unmastered)
        if (!this.isCategoryMastered(unitId, config, categories[i])) break;
    }
    return null;
},
```

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/core/mastery.js study-tools/engine/js/core/app.js
git commit -m "feat: add textbook-read gating to MasteryManager"
```

---

### Task 2: Add reading level prompt to textbook

**Files:**
- Modify: `study-tools/engine/js/activities/textbook.js`
- Modify: `study-tools/engine/css/styles.css`

- [ ] **Step 1: Add level prompt screen**

In `textbook.js`, modify the `render` method. After loading progress (line 44-49), check if `readingLevel` has been explicitly set. If not, show the prompt instead of loading content:

```javascript
// Check if student has chosen a reading level
if (!this._progress.readingLevel) {
    this._showLevelPrompt();
    return;
}
```

Add the `_showLevelPrompt` method:

```javascript
_showLevelPrompt() {
    var self = this;
    var container = this._container;
    container.textContent = '';

    var prompt = document.createElement('div');
    prompt.className = 'tb-level-prompt';

    var icon = document.createElement('i');
    icon.className = 'fas fa-book-open';
    icon.style.cssText = 'font-size:2.5em;color:var(--primary);margin-bottom:16px;display:block;';
    prompt.appendChild(icon);

    var heading = document.createElement('h2');
    heading.textContent = 'Choose Your Reading Level';
    heading.style.cssText = 'color:var(--text-primary);margin-bottom:8px;';
    prompt.appendChild(heading);

    var subtext = document.createElement('p');
    subtext.textContent = 'Pick the level that feels right for you. You can change this anytime.';
    subtext.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;';
    prompt.appendChild(subtext);

    var cards = document.createElement('div');
    cards.className = 'tb-level-cards';

    this._LEVELS.forEach(function(level) {
        var card = document.createElement('button');
        card.className = 'tb-level-card';

        var cardIcon = document.createElement('i');
        cardIcon.className = level.icon;
        cardIcon.style.cssText = 'font-size:1.8em;color:var(--primary);margin-bottom:10px;display:block;';
        card.appendChild(cardIcon);

        var cardLabel = document.createElement('div');
        cardLabel.style.cssText = 'font-size:1.1em;font-weight:700;color:var(--text-primary);margin-bottom:6px;';
        cardLabel.textContent = level.label;
        card.appendChild(cardLabel);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size:0.85em;color:var(--text-secondary);line-height:1.4;';
        var descriptions = {
            simplified: 'Shorter sentences, simpler vocabulary',
            standard: 'Standard 8th grade reading level',
            advanced: 'More detail, deeper analysis'
        };
        desc.textContent = descriptions[level.id] || '';
        card.appendChild(desc);

        card.addEventListener('click', function() {
            self._readingLevel = level.id;
            self._progress.readingLevel = level.id;
            self._saveProgress();
            container.textContent = '';
            self._loadContent();
        });

        cards.appendChild(card);
    });

    prompt.appendChild(cards);
    container.appendChild(prompt);
},
```

- [ ] **Step 2: Handle existing students who have progress but no explicit readingLevel**

Students who already have textbook progress (with `sectionsRead` data) but no explicit `readingLevel` field should NOT see the prompt — they've already been using the textbook. Check for this:

```javascript
// Show level prompt only for brand-new textbook users
var hasExistingProgress = this._progress.sectionsRead && Object.keys(this._progress.sectionsRead).length > 0;
if (!this._progress.readingLevel && !hasExistingProgress) {
    this._showLevelPrompt();
    return;
}
```

- [ ] **Step 3: Add CSS for level prompt**

```css
.tb-level-prompt {
    text-align: center;
    padding: 60px 20px;
    max-width: 600px;
    margin: 0 auto;
}
.tb-level-cards {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
}
.tb-level-card {
    background: var(--bg-elevated);
    border: 2px solid var(--border-card);
    border-radius: 12px;
    padding: 24px 20px;
    width: 160px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
}
.tb-level-card:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/activities/textbook.js study-tools/engine/css/styles.css
git commit -m "feat: reading level prompt for first-time textbook users"
```

---

### Task 3: Update flashcards with gating, progress, and textbook links

**Files:**
- Modify: `study-tools/engine/js/activities/flashcards.js`
- Modify: `study-tools/engine/css/styles.css`

- [ ] **Step 1: Show gate screen when no categories are unlocked**

In `flashcards.js` `render()` method, after getting unlocked vocab (line 23), check if the list is empty because of the textbook gate. If so, show a gate screen instead of the cards:

After line 23 (`this._allUnlockedVocab = [...MasteryManager.getUnlockedVocabulary(config.unit.id, config)];`), add:

```javascript
// If no vocab available, check if it's because textbook hasn't been read
if (this._allUnlockedVocab.length === 0) {
    var nextChapter = MasteryManager.getNextUnreadChapter(config.unit.id, config);
    if (nextChapter) {
        this._showReadingGate(container, config, nextChapter);
        return;
    }
}
```

Add the gate screen method:

```javascript
_showReadingGate(container, config, nextChapter) {
    var gate = document.createElement('div');
    gate.className = 'fc-reading-gate';

    var icon = document.createElement('i');
    icon.className = 'fas fa-book-open';
    icon.style.cssText = 'font-size:2.5em;color:var(--primary);margin-bottom:16px;display:block;';
    gate.appendChild(icon);

    var heading = document.createElement('h2');
    heading.textContent = 'Read First, Then Study!';
    heading.style.cssText = 'color:var(--text-primary);margin-bottom:12px;';
    gate.appendChild(heading);

    var desc = document.createElement('p');
    desc.textContent = 'Before you start flashcards, read Chapter ' + nextChapter.index + ': ' + nextChapter.category + ' in the textbook. This will help you understand the terms!';
    desc.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;line-height:1.6;max-width:400px;margin-left:auto;margin-right:auto;';
    gate.appendChild(desc);

    var btn = document.createElement('button');
    btn.className = 'fc-reading-gate-btn';
    var btnIcon = document.createElement('i');
    btnIcon.className = 'fas fa-book-open';
    btn.appendChild(btnIcon);
    btn.appendChild(document.createTextNode(' Go to Textbook'));
    btn.addEventListener('click', function() {
        StudyEngine.activateActivity('textbook', [nextChapter.segmentId]);
    });
    gate.appendChild(btn);

    container.appendChild(gate);
},
```

- [ ] **Step 2: Add unlock progress indicator**

In `_renderCards()`, after the existing mastery progress bar block (lines 104-121), add a term unlock indicator when not all must-know terms are available:

```javascript
// Term unlock progress
var allMustKnow = config.vocabulary
    ? config.vocabulary.filter(function(v) { return !v.tier || v.tier === 'must-know'; })
    : [];
var unlockedMustKnow = this._allUnlockedVocab.filter(function(v) { return !v.tier || v.tier === 'must-know'; });
if (unlockedMustKnow.length < allMustKnow.length) {
    var termProgress = document.createElement('div');
    termProgress.className = 'fc-term-progress';
    termProgress.textContent = unlockedMustKnow.length + '/' + allMustKnow.length + ' key terms unlocked';

    var nextChapter = MasteryManager.getNextUnreadChapter(config.unit.id, config);
    if (nextChapter) {
        termProgress.textContent += ' \u2014 read the next chapter to unlock more!';
    }
    wrapper.appendChild(termProgress);
}
```

- [ ] **Step 3: Show locked categories greyed out in filter dropdown**

In `_renderCards()`, the category filter dropdown (lines 167-181) currently only shows unlocked categories. Add locked categories as disabled options:

After the existing `categories.forEach` loop that adds unlocked category options, add:

```javascript
// Add locked categories as disabled options
var allCategories = MasteryManager.getCategories(config);
allCategories.forEach(function(cat) {
    if (!categories.includes(cat) && cat !== 'Bonus') {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = cat + ' (read chapter first)';
        opt.disabled = true;
        opt.style.color = '#9ca3af';
        filterSelect.appendChild(opt);
    }
});
```

- [ ] **Step 4: Add "Read in textbook" link on flashcard back face**

In `_display()`, after the example text block (around line 429), add a textbook deep-link. The term-to-section map should be built once at render time.

In `render()`, after loading unlocked vocab, build the map:

```javascript
// Build term -> textbook section map for deep-linking
var textbook = MasteryManager._textbookCache[config.unit.id];
var tbProgress = ProgressManager.getActivityProgress(config.unit.id, 'textbook') || {};
this._termSectionMap = textbook
    ? MasteryManager.buildTermSectionMap(config, textbook, tbProgress.readingLevel || 'standard')
    : {};
```

In `_display()`, after the example block and before the "Explain it to me" button (around line 429), add:

```javascript
// "Read in textbook" link
var sectionInfo = this._termSectionMap[card.term];
if (sectionInfo) {
    var tbLink = document.createElement('button');
    tbLink.className = 'fc-textbook-link';
    var tbLinkIcon = document.createElement('i');
    tbLinkIcon.className = 'fas fa-book-open';
    tbLink.appendChild(tbLinkIcon);
    tbLink.appendChild(document.createTextNode(' Read in textbook'));
    tbLink.addEventListener('click', function(e) {
        e.stopPropagation();
        StudyEngine.activateActivity('textbook', [sectionInfo.segmentId, sectionInfo.sectionId]);
    });
    backContent.appendChild(tbLink);
}
```

- [ ] **Step 5: Add CSS for gate screen, progress indicator, and textbook link**

```css
/* Flashcard reading gate */
.fc-reading-gate {
    text-align: center;
    padding: 60px 20px;
}
.fc-reading-gate-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
}
.fc-reading-gate-btn:hover { transform: scale(1.03); }

/* Term unlock progress */
.fc-term-progress {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9em;
    padding: 8px 16px;
    background: var(--bg-surface);
    border-radius: 8px;
    margin-bottom: 12px;
}

/* Textbook link on flashcard back */
.fc-textbook-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--primary);
    font-size: 0.85em;
    cursor: pointer;
    padding: 6px 0;
    margin-top: 8px;
    font-weight: 500;
    opacity: 0.8;
    transition: opacity 0.2s;
}
.fc-textbook-link:hover { opacity: 1; text-decoration: underline; }
.fc-textbook-link i { font-size: 0.9em; }
```

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/flashcards.js study-tools/engine/css/styles.css
git commit -m "feat: flashcard reading gate, unlock progress, textbook deep-links"
```

---

### Task 4: Version bump and verification

- [ ] **Step 1: Bump version**

Update `study-tools/engine/version.json` to `8.8.0` with today's date.

- [ ] **Step 2: Verify the full flow**

Test the complete flow in browser:
1. Clear localStorage for the unit (or use incognito)
2. Open the study tool — flashcards should show "Read First, Then Study!" gate
3. Click "Go to Textbook" — should navigate to textbook
4. See reading level prompt (first time) — choose a level
5. Read all 5 sections in Chapter 1 (mark each as read)
6. Go back to flashcards — Category 1 terms should now appear
7. Check that the category filter shows locked categories greyed out
8. Check that "Read in textbook" link appears on flashcard back face
9. Click the link — should navigate to the correct textbook section
10. Master Category 1 terms — should prompt to read Chapter 2
11. Verify teacher-unlock bypass still works (sessionStorage)
12. Verify early-republic unit still works (no textbook = no gate)

- [ ] **Step 3: Commit and push**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version to 8.8.0 for textbook gating"
git push origin main
```
