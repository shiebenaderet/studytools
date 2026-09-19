# Vocabulary Tiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add must-know / encounter / bonus tiers to westward-expansion vocabulary so students focus on tested terms while still seeing enrichment content.

**Architecture:** Each vocab item gets a `"tier"` field (`"must-know"`, `"encounter"`, or `"bonus"`). `MasteryManager` gains tier-aware filtering methods. Mastery gating only counts must-know terms. Flashcards show all tiers but prioritize must-know (encounter/bonus appear at end of queue with a "Bonus" badge). Games/activities only use must-know terms. A new "Bonus" category (5th) holds the 23 fully-removed terms and unlocks when all 4 main categories are mastered.

**Tech Stack:** Vanilla JS, JSON config, CSS

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `study-tools/units/westward-expansion/config.json` | Modify | Add `tier` field to all 51 existing vocab items; add 2 new must-know terms (suffrage, popular sovereignty); move 23 removed terms to `"Bonus"` category with `tier: "bonus"`; rename "annex" to "Annexation", "the Alamo" to "Alamo", "Texas War for Independence" to "Texas Revolution"; remove 2 fill-in-blank sentences whose answers are removed terms |
| `study-tools/engine/js/core/mastery.js` | Modify | Add tier-aware filtering: `getUnlockedVocabulary` gains optional tier param; `isCategoryMastered` only counts must-know terms; new `getMustKnowVocabulary()` helper; Bonus category unlock logic |
| `study-tools/engine/js/activities/flashcards.js` | Modify | Show "Bonus" badge on encounter/bonus cards; sort queue so must-know terms come first; skip encounter/bonus for mastery counting |
| `study-tools/engine/css/styles.css` | Modify | Add `.fc-tier-badge` styles for the bonus indicator on flashcards |

---

## Term Classification Reference

**Must-Know (25 terms) — tier: "must-know"**

| Category | Terms |
|----------|-------|
| Jackson's America | Jacksonian Democracy, Spoils System, Nullification, Tariff, Secede, Indian Removal Act, Trail of Tears |
| Westward Trails | Manifest Destiny, Annexation (rename from "annex"), Oregon Trail, Texas Revolution (rename from "Texas War for Independence"), Alamo (rename from "the Alamo") |
| War & Compromise | Mexican-American War, Treaty of Guadalupe Hidalgo, Mexican Cession, Compromise of 1850, Fugitive Slave Act, Popular Sovereignty (NEW) |
| Two Americas | Seneca Falls Convention, Declaration of Sentiments, Suffrage (NEW), Cotton Gin, Plantation, Industrial Revolution, Abolition (NEW) |

Note: Popular Sovereignty, Suffrage, and Abolition are new terms that need full vocab entries created.

**Encounter (26 terms) — tier: "encounter"**

| Category | Terms |
|----------|-------|
| Jackson's America | Primary Source (NEW), Bias (NEW), Perspective (NEW), Kitchen Cabinet, Force Bill, Civil Servant, Mudslinging, Worcester v. Georgia, Five Civilized Tribes, Assimilation (NEW) |
| Westward Trails | Frontier (NEW), Santa Fe Trail (NEW), Mormon Trail (NEW), Emigrant (NEW), Pioneer (NEW), Republic of Texas (NEW), Tall Tale (NEW), Legend (NEW) |
| War & Compromise | James K. Polk, War of Aggression (NEW), Uncle Tom's Cabin, Free State / Slave State (rename from "free state / slave state"), Slave State (merged into existing) |
| Two Americas | Elizabeth Cady Stanton, Sojourner Truth, States' Rights (NEW) |

**Bonus (23 terms) — tier: "bonus", category: "Bonus"**

Moved from their original categories: Bank of the U.S., Sequoyah, territory, diplomacy, South Pass, Sam Houston, Santa Anna, Stephen F. Austin, Tejanos, 54-40 or fight!, Rio Grande, Nueces River, Bear Flag Republic, Gadsden Purchase, Wilmot Proviso, agrarian, push factor / pull factor, industrialist, deforestation, interchangeable parts, Erie Canal, Eli Whitney, Tredegar Iron Works

---

### Task 1: Update mastery.js — tier-aware filtering

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js`

- [ ] **Step 1: Update `isCategoryMastered` to only count must-know terms**

In `mastery.js`, the `isCategoryMastered` method currently checks ALL terms in a category. Change it to only require must-know terms (or all terms if no tier field exists, for backwards compatibility with early-republic).

```javascript
isCategoryMastered(unitId, config, categoryName) {
    if (!config.vocabulary) return false;
    var categoryTerms = config.vocabulary.filter(function(v) {
        return v.category === categoryName && (!v.tier || v.tier === 'must-know');
    });
    if (categoryTerms.length === 0) return false;
    var self = this;
    return categoryTerms.every(function(v) {
        return self.isTermMastered(unitId, config, v.term);
    });
},
```

- [ ] **Step 2: Update `getUnlockedCategories` to handle the Bonus category**

The Bonus category should only unlock when ALL four main categories are mastered. Since Bonus is the 5th category in the vocabulary array order, the existing sequential unlock logic already handles this — category 5 unlocks when category 4 is mastered. No code change needed here, just verify the logic works.

- [ ] **Step 3: Add `getMustKnowVocabulary` helper**

Add a new method that returns only must-know terms from unlocked categories. This is what games/activities will use.

```javascript
/**
 * Returns unlocked vocabulary filtered to must-know tier only.
 * Falls back to all vocab for units without tiers (backwards compat).
 */
getMustKnowVocabulary(unitId, config) {
    const unlocked = this.getUnlockedVocabulary(unitId, config);
    const hasTiers = unlocked.some(v => v.tier);
    if (!hasTiers) return unlocked;
    return unlocked.filter(v => !v.tier || v.tier === 'must-know');
},
```

- [ ] **Step 4: Update `getUnlockStatus` to report must-know counts**

The progress bar should show must-know mastery progress, not total term count.

```javascript
getUnlockStatus(unitId, config) {
    const categories = this.getCategories(config);
    const unlockedCategories = this.getUnlockedCategories(unitId, config);
    const hasTiers = config.vocabulary && config.vocabulary.some(v => v.tier);
    const coreVocab = hasTiers
        ? config.vocabulary.filter(v => !v.tier || v.tier === 'must-know')
        : config.vocabulary || [];
    const totalVocab = coreVocab.length;
    const unlockedVocab = this.getUnlockedVocabulary(unitId, config)
        .filter(v => !hasTiers || !v.tier || v.tier === 'must-know').length;
    return {
        categories,
        unlockedCategories,
        totalVocab,
        unlockedVocab,
        allUnlocked: categories.length > 0 && categories.length === unlockedCategories.length && this.isCategoryMastered(unitId, config, categories[categories.length - 1])
    };
},
```

- [ ] **Step 5: Update `getUnlockedFillInBlanks` to only match must-know terms**

```javascript
getUnlockedFillInBlanks(unitId, config) {
    if (!config.fillInBlankSentences) return [];
    const unlockedVocab = this.getMustKnowVocabulary(unitId, config);
    const unlockedTermsLower = unlockedVocab.map(v => v.term.toLowerCase());
    return config.fillInBlankSentences.filter(s => {
        const answer = (s.answer || '').toLowerCase();
        return unlockedTermsLower.includes(answer);
    });
},
```

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat: add tier-aware filtering to MasteryManager"
```

---

### Task 2: Update game activities to use must-know vocabulary

**Files:**
- Modify: `study-tools/engine/js/activities/flashcards.js`
- Modify: `study-tools/engine/css/styles.css`

All game activities that call `MasteryManager.getUnlockedVocabulary()` need to switch to `getMustKnowVocabulary()` — EXCEPT flashcards, which should show all tiers with visual differentiation.

- [ ] **Step 1: Update flashcards to show tier badge and sort queue**

In `flashcards.js`, update `_buildQueue` to put must-know terms first, then encounter, then bonus:

```javascript
_buildQueue() {
    const mustKnow = this._displayedVocab.filter(v => !v.tier || v.tier === 'must-know');
    const encounter = this._displayedVocab.filter(v => v.tier === 'encounter');
    const bonus = this._displayedVocab.filter(v => v.tier === 'bonus');
    this._queue = [
        ...StudyUtils.shuffle(mustKnow.map(v => v.term)),
        ...StudyUtils.shuffle(encounter.map(v => v.term)),
        ...StudyUtils.shuffle(bonus.map(v => v.term))
    ];
    this._roundIndex = 0;
},
```

- [ ] **Step 2: Add tier badge to flashcard display**

In `flashcards.js` `_display()` method, after the category badge block (around line 494-502), add a tier badge for encounter/bonus terms:

```javascript
// Tier badge for encounter/bonus terms
const existingTierBadge = scene.querySelector('.fc-tier-badge');
if (existingTierBadge) existingTierBadge.remove();
if (card.tier === 'encounter' || card.tier === 'bonus') {
    const tierBadge = document.createElement('div');
    tierBadge.className = 'fc-tier-badge';
    tierBadge.textContent = 'Bonus';
    scene.appendChild(tierBadge);
}
```

- [ ] **Step 3: Skip encounter/bonus terms from mastery tracking in flashcards**

In `flashcards.js` `_rate()` method, only add to `_mastered` and trigger category mastery check for must-know terms:

```javascript
_rate(rating) {
    const card = this._getCurrentTerm();
    if (!card) return;

    this._ratings[card.term] = rating;

    if (rating === 'again') {
        const insertAt = Math.min(this._roundIndex + 3, this._queue.length);
        this._queue.splice(insertAt, 0, card.term);
    } else if (rating === 'hard') {
        const insertAt = Math.min(this._roundIndex + 6, this._queue.length);
        this._queue.splice(insertAt, 0, card.term);
    } else if (rating === 'good' || rating === 'easy') {
        if (!this._mastered.includes(card.term)) {
            this._mastered.push(card.term);
            // Only check category mastery for must-know terms
            if (!card.tier || card.tier === 'must-know') {
                const config = StudyEngine.config;
                const unitId = config.unit.id;
                if (MasteryManager.isCategoryMastered(unitId, config, card.category)) {
                    MasteryManager.showMasteryNudge(config, card.category);
                }
            }
        }
    }

    this._saveProgress();
    this._roundIndex++;
    this._display();
},
```

- [ ] **Step 4: Update mastery progress counter to only count must-know terms**

In `flashcards.js` `_updateProgress()`, when showing the text-based progress (line 620), count only must-know mastered terms vs must-know total:

```javascript
if (total > 30) {
    const hasTiers = this._allUnlockedVocab.some(v => v.tier);
    const mustKnowTotal = hasTiers
        ? this._allUnlockedVocab.filter(v => !v.tier || v.tier === 'must-know').length
        : this._allUnlockedVocab.length;
    const mustKnowMastered = hasTiers
        ? this._mastered.filter(t => {
            const v = this._allUnlockedVocab.find(vv => vv.term === t);
            return v && (!v.tier || v.tier === 'must-know');
        }).length
        : this._mastered.length;
    progress.textContent = mustKnowMastered + ' of ' + mustKnowTotal + ' key terms mastered';
    progress.className = 'fc-progress fc-progress-text';
    return;
}
```

- [ ] **Step 5: Add CSS for tier badge**

In `styles.css`, add after the `.fc-cat-badge` styles (around line 1282):

```css
.fc-tier-badge {
    position: absolute;
    top: 12px;
    left: 14px;
    background: rgba(245, 158, 11, 0.25);
    color: #f59e0b;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.5px;
    z-index: 2;
    text-transform: uppercase;
}
body.light-mode .fc-front .fc-tier-badge {
    background: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.85);
}
body.light-mode .fc-back .fc-tier-badge {
    background: rgba(245, 158, 11, 0.15);
    color: #d97706;
}
```

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/flashcards.js study-tools/engine/css/styles.css
git commit -m "feat: flashcards show tier badges, prioritize must-know terms"
```

---

### Task 3: Update all game activities to use getMustKnowVocabulary

**Files:**
- Modify: Multiple activity files

Every activity that calls `MasteryManager.getUnlockedVocabulary()` for game content needs to switch to `getMustKnowVocabulary()`. Flashcards is excluded (handled in Task 2).

- [ ] **Step 1: Update lightning-round.js**

Find all calls to `MasteryManager.getUnlockedVocabulary(` and replace with `MasteryManager.getMustKnowVocabulary(`. There are calls around lines 254 and 332.

- [ ] **Step 2: Update hangman.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around line 156).

- [ ] **Step 3: Update wordle.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around line 26).

- [ ] **Step 4: Update sort-it-out.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around line 117).

- [ ] **Step 5: Update who-am-i.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around lines 90, 142).

- [ ] **Step 6: Update four-corners.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around lines 101-102).

- [ ] **Step 7: Update term-catcher.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around lines 209, 313).

- [ ] **Step 8: Update flip-match.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` (around line 130).

- [ ] **Step 9: Update typing-practice.js**

Replace `getUnlockedVocabulary` with `getMustKnowVocabulary` for snippet filtering.

- [ ] **Step 10: Update crossword.js**

Search for direct `config.vocabulary` access and replace with `MasteryManager.getMustKnowVocabulary(config.unit.id, config)`.

- [ ] **Step 11: Update tower-defense.js**

Search for direct `config.vocabulary` access and replace with `MasteryManager.getMustKnowVocabulary(config.unit.id, config)`.

- [ ] **Step 12: Update quiz-race.js**

Search for direct `config.vocabulary` access and replace with `MasteryManager.getMustKnowVocabulary(config.unit.id, config)`.

- [ ] **Step 13: Commit**

```bash
git add study-tools/engine/js/activities/
git commit -m "feat: all game activities use must-know vocabulary only"
```

---

### Task 4: Update westward-expansion config — tier assignments and renames

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

This is the biggest task — adding `tier` fields, renaming terms, moving removed terms to Bonus category, and creating new term entries.

- [ ] **Step 1: Add `"tier": "must-know"` to the 22 existing must-know terms**

Add the tier field to these existing terms (keeping their current categories):
- Jackson's America: Jacksonian Democracy, spoils system, tariff, secede, Trail of Tears, nullification, Indian Removal Act
- Westward Trails: manifest destiny, Oregon Trail
- War & Compromise: Mexican-American War, Mexican Cession, Treaty of Guadalupe Hidalgo, Compromise of 1850, Fugitive Slave Act
- Two Americas: Industrial Revolution, cotton gin, plantation, Seneca Falls Convention, Declaration of Sentiments

- [ ] **Step 2: Rename three existing must-know terms**

- `"annex"` → `"Annexation"` (update term, definition to match noun form, update typingSnippet and example) — category stays "Westward Trails", add `"tier": "must-know"`
- `"Texas War for Independence"` → `"Texas Revolution"` (update term field only, keep all content) — add `"tier": "must-know"`
- `"the Alamo"` → `"Alamo"` (update term field only) — add `"tier": "must-know"`

Also update any fill-in-blank sentences whose answers reference the old term names.

- [ ] **Step 3: Add `"tier": "encounter"` to existing encounter terms**

These terms already exist in the config — just add the tier field:
- Jackson's America: kitchen cabinet, Force Bill, civil servant, mudslinging, Worcester v. Georgia, Five Civilized Tribes
- War & Compromise: James K. Polk, Uncle Tom's Cabin
- Two Americas: Elizabeth Cady Stanton, Sojourner Truth

Also rename `"free state / slave state"` to `"Free State / Slave State"` and add `"tier": "encounter"`.

- [ ] **Step 4: Create new must-know term entries**

Create full vocab entries for these 3 new must-know terms:

**Popular Sovereignty** (War & Compromise):
```json
{
    "term": "Popular Sovereignty",
    "definition": "The idea that the people living in a territory should vote to decide whether to allow slavery there, rather than having Congress decide for them.",
    "simpleExplanation": "Instead of Congress picking if a new territory allows slavery, the actual people living there get to vote on it. Sounds fair, right? But it led to huge fights because both sides would rush settlers in to win the vote.",
    "example": "The Compromise of 1850 used popular sovereignty to let residents of new western territories decide the slavery question for themselves.",
    "category": "War & Compromise",
    "tier": "must-know",
    "typingSnippet": "Popular sovereignty was the idea that people in a new territory should vote to decide whether slavery would be allowed. It sounded democratic, but it led to violent conflict as both pro-slavery and anti-slavery settlers rushed into territories to influence the vote.",
    "wikiUrl": "https://en.wikipedia.org/wiki/Popular_sovereignty_in_the_United_States"
}
```

**Suffrage** (Two Americas):
```json
{
    "term": "Suffrage",
    "definition": "The right to vote in political elections.",
    "simpleExplanation": "The right to vote. For most of American history, only white men had suffrage. Women and people of color had to fight hard to win the right to vote. The women's suffrage movement started at Seneca Falls in 1848.",
    "example": "The Seneca Falls Convention demanded women's suffrage, but women would not win the right to vote nationally until the 19th Amendment in 1920.",
    "category": "Two Americas",
    "tier": "must-know",
    "typingSnippet": "Suffrage means the right to vote. In early America, only white men who owned property could vote. The women's suffrage movement began at the Seneca Falls Convention in 1848 and fought for decades before women finally won the right to vote in 1920.",
    "wikiUrl": "https://en.wikipedia.org/wiki/Suffrage"
}
```

**Abolition** (Two Americas):
```json
{
    "term": "Abolition",
    "definition": "The movement to end slavery completely in the United States.",
    "simpleExplanation": "The movement to completely end slavery. Abolitionists believed slavery was morally wrong and fought to free all enslaved people. Some used speeches and newspapers, while others helped enslaved people escape through the Underground Railroad.",
    "example": "The abolition movement gained strength in the 1830s as speakers like Frederick Douglass and writers like Harriet Beecher Stowe exposed the horrors of slavery.",
    "category": "Two Americas",
    "tier": "must-know",
    "typingSnippet": "Abolition was the movement to completely end slavery in the United States. Abolitionists included formerly enslaved people, religious leaders, and writers who spoke out against the cruelty of slavery. Their work helped turn public opinion against slavery before the Civil War.",
    "wikiUrl": "https://en.wikipedia.org/wiki/Abolitionism_in_the_United_States"
}
```

- [ ] **Step 5: Create new encounter term entries**

Create vocab entries for these new encounter terms (shorter entries — no typingSnippet needed):

Jackson's America encounter terms:
- **Primary Source**: A document, image, or object created during the time period being studied.
- **Bias**: A personal opinion or slant that can influence how someone presents information.
- **Perspective**: A person's point of view, shaped by their experiences, culture, and position in society.
- **Assimilation**: The process of adopting the culture, language, and customs of another group, often under pressure.

Westward Trails encounter terms:
- **Frontier**: The edge of settled land where American expansion was actively happening.
- **Santa Fe Trail**: An 800-mile trade route connecting Missouri to Santa Fe, New Mexico, used by merchants and traders.
- **Mormon Trail**: A 1,300-mile route used by members of the Church of Jesus Christ of Latter-day Saints to reach Salt Lake City, Utah.
- **Emigrant**: A person who leaves their home country or region to settle somewhere else.
- **Pioneer**: A person who is among the first to explore or settle a new area.
- **Republic of Texas**: The independent nation that existed from 1836 to 1845 after Texas won independence from Mexico.
- **Tall Tale**: An exaggerated, humorous story about frontier life, often featuring larger-than-life characters.
- **Legend**: A traditional story sometimes popularly regarded as historical but not fully verified.

War & Compromise encounter terms:
- **War of Aggression**: A term used by critics of the Mexican-American War who believed the U.S. started the conflict unfairly to seize Mexican land.

Two Americas encounter terms:
- **States' Rights**: The belief that individual states should have more power than the federal government, often used to defend slavery.

- [ ] **Step 6: Move 23 removed terms to Bonus category**

Change the `category` to `"Bonus"` and add `"tier": "bonus"` for these existing terms:
Bank of the U.S., Sequoyah, territory, diplomacy, South Pass, Sam Houston, Santa Anna, Stephen F. Austin, Tejanos, 54-40 or fight!, Rio Grande, Nueces River, Bear Flag Republic, Gadsden Purchase, Wilmot Proviso, agrarian, push factor / pull factor, industrialist, deforestation, interchangeable parts, Erie Canal, Eli Whitney, Tredegar Iron Works

- [ ] **Step 7: Update fill-in-blank sentences**

Remove or replace fill-in-blank sentences whose answers are now bonus/encounter terms:
- Remove: `"Sam Houston"` answer sentence (bonus term)
- Remove: `"Wilmot Proviso"` answer sentence (bonus term)
- Remove: `"Sojourner Truth"` answer sentence (encounter term)
- Remove: `"annex"` answer sentence (term was renamed to "Annexation" — update answer to match)

Update: Change `"annex"` answer to `"Annexation"` in the fill-in-blank that uses it, and adjust the sentence wording if needed.

Add new fill-in-blank sentences for the 3 new must-know terms:

```json
{
    "sentence": "_____ was the idea that the people living in a territory should vote to decide whether to allow slavery, rather than having Congress decide.",
    "answer": "Popular Sovereignty",
    "category": "War & Compromise"
},
{
    "sentence": "_____ means the right to vote in political elections, something women fought for decades to win.",
    "answer": "Suffrage",
    "category": "Two Americas"
},
{
    "sentence": "The _____ movement worked to completely end slavery in the United States through speeches, writing, and direct action.",
    "answer": "Abolition",
    "category": "Two Americas"
}
```

- [ ] **Step 8: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add tier fields, new terms, rename terms, Bonus category"
```

---

### Task 5: Update typing passages for renamed terms

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

- [ ] **Step 1: Update typing passages**

The typing passages reference removed and renamed terms. Update them:
- In the "Westward Trails" passage: replace "Texas War for Independence" with "Texas Revolution", "the Alamo" with "the Alamo" (keep as-is in prose, the term name is "Alamo"), "annex" usage is fine in prose context
- In the "War & Compromise" passage: Wilmot Proviso, Nueces River, Rio Grande, Bear Flag Republic, Gadsden Purchase appear — these are now bonus terms but the passage should still reference them since it's educational prose, not a term-matching exercise. No changes needed.
- In the "Jackson's America" passage: Bank of the U.S., Sequoyah references — same reasoning, keep in prose.

Only update: "Texas War for Independence" → "Texas Revolution" in the Westward Trails passage.

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "fix: update typing passage for renamed Texas Revolution term"
```

---

### Task 6: Verify and test

- [ ] **Step 1: Verify term counts**

Count terms in config to ensure: 25 must-know + 26 encounter + 23 bonus = 74 total terms. The original 56 minus 5 net removals (actually: 56 original + 18 new entries = 74).

Wait — let me recount:
- Original: 56 terms
- Removed entirely: 0 (all 23 "removed" terms move to Bonus)
- New must-know: 3 (Popular Sovereignty, Suffrage, Abolition)
- New encounter: 15 (Primary Source, Bias, Perspective, Assimilation, Frontier, Santa Fe Trail, Mormon Trail, Emigrant, Pioneer, Republic of Texas, Tall Tale, Legend, War of Aggression, States' Rights — wait, that's 14)

Let me recount encounter terms that need NEW entries:
- Jackson's America NEW: Primary Source, Bias, Perspective, Assimilation = 4
- Westward Trails NEW: Frontier, Santa Fe Trail, Mormon Trail, Emigrant, Pioneer, Republic of Texas, Tall Tale, Legend = 8
- War & Compromise NEW: War of Aggression = 1
- Two Americas NEW: States' Rights = 1
Total new encounter: 14

So: 56 original + 3 new must-know + 14 new encounter = 73 total terms.

Must-know: 25, Encounter: 26, Bonus: 23. That's 74. One discrepancy — checking... The "free state / slave state" term covers both "Free State" and "Slave State" from the encounter list as a single entry. So 25 + 25 + 23 = 73... but the user listed 26 encounter. Let me recount the user's encounter list:

Segment 3 encounter: James K. Polk, War of Aggression, Uncle Tom's Cabin, Free State, Slave State = 5 terms. But "Free State" and "Slave State" are currently one combined entry "free state / slave state". Keep as one entry = 4 encounter terms in segment 3.

So encounter = 10 + 8 + 4 + 3 = 25 encounter entries (since Free State/Slave State is one entry).

Total: 25 must-know + 25 encounter + 23 bonus = 73 entries.

Run: `grep -c '"term"' study-tools/units/westward-expansion/config.json`
Expected: 73

- [ ] **Step 2: Verify mastery filtering**

Open the app in browser, navigate to westward-expansion flashcards. Verify:
- Must-know terms appear first in the queue
- Encounter/bonus terms show "Bonus" badge
- Rating encounter terms good/easy does NOT trigger category mastery nudge
- Category progress bar shows must-know count only

- [ ] **Step 3: Verify game filtering**

Open a game activity (e.g., Who Am I). Verify only must-know terms appear.

- [ ] **Step 4: Verify Bonus category is locked**

Before mastering all 4 main categories, the Bonus category should not appear in flashcard filters. After mastering all 4, it should unlock.

- [ ] **Step 5: Final commit with version bump**

```bash
# Update version.json
git add study-tools/engine/version.json
git commit -m "chore: bump version for vocab tiers feature"
```
