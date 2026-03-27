# Learn Mode Design

**Date:** 2026-03-26
**Status:** Approved
**Inspired by:** Seneca Learning's guided study approach

## Overview

Build a guided study activity ("Learn Mode") that presents content as a sequence of short, interactive slides. Instead of students choosing between separate flashcards, practice tests, and textbook reading, Learn Mode orchestrates all existing content into a single adaptive flow that teaches, tests, and deepens understanding based on each student's performance.

Built as a standard engine activity (`learn-mode.js`), reading from existing config data. No new content authoring required for v1. Enabled for westward-expansion first, portable to any unit.

## Entry & Session Setup

### Three Study Modes

**Study by Category** — student picks one of the unit's categories (e.g., "Jackson's America"). Shows mastery percentage for each category to help them choose.

**Full Unit** — works through all categories in sequence. Broken into category chunks with progress indicators between them.

**Smart Review** — system automatically selects content based on what the student has and hasn't mastered. Prioritizes weakest areas. Most adaptive option.

### Adaptive Pre-Assessment

Before learning begins, a quick quiz establishes what the student already knows:

- Draws from `practiceQuestions` and `fillInBlankSentences`
- **Must sample at least 1 question from every topic area** in the selected scope before declaring anything "known" (prevents false confidence from lucky guesses)
- Stops early if student is clearly struggling (3+ consecutive wrong answers, to avoid frustration)
- Typically 5-8 questions, takes 1-2 minutes
- Results stored with timestamp
- Known material is deprioritized in the session (not skipped entirely; may appear as quick reinforcement)

### Session Persistence

Progress is saved so students can resume a session if they leave mid-flow, or start fresh.

## Card Types (v1)

### 1. Term Card (Learn)

- Shows: term name, simple explanation, example sentence, image (if available)
- Warm gradient background matching unit theme
- Student taps "Got it" to continue
- No scoring; pure learning content
- Data source: `config.vocabulary` (term, simpleExplanation, example, imageUrl)

### 2. Key Idea Card (Context)

- Shows: 1-2 sentence takeaway from a textbook section
- Related vocabulary terms displayed as tags at the bottom
- Provides the "so what?" between term cards
- Student taps to continue
- Data source: `textbook.json` section `keyIdea` fields, `vocabTerms` arrays

### 3. Multiple Choice Question Card (Test)

- Pulls from `practiceQuestions` matching the current topic
- Student picks an answer, gets instant feedback
- Wrong answer: shows explanation, flags related terms for re-teaching
- Right answer: brief positive feedback, moves on
- Data source: `config.practiceQuestions`

### 4. Fill-in-Blank Card (Test)

- Shows sentence with blank, 3-4 word chips to choose from
- Chips are: correct answer + distractors from same category (shuffled)
- Tap to select, instant feedback
- No free typing; mobile-friendly
- Data source: `config.fillInBlankSentences`

### Future Card Types (v2)

- Image analysis cards (from source analysis data)
- True/False cards (generated from vocabulary definitions)
- Matching/sorting cards (drag terms to definitions or events to dates)

## Slide Sequencing

### Pattern

The session alternates between learning and testing:

1. Introduce 2-3 terms (Term Cards)
2. Test with 1 question (MC or Fill-in-Blank)
3. Show a Key Idea for context
4. Test again
5. Repeat

**Ratio:** roughly 60% learn, 40% test. Tests are interleaved frequently for active recall.

### Session Length

- **Category mode:** ~15-25 slides
- **Full Unit mode:** ~60-80 slides, broken into category chunks with progress indicators
- **Smart Review mode:** varies based on what the student needs

## Adaptive Depth (Tier System)

Each term has 3 tiers of explanation. The system moves between them based on performance.

### Tier 1: Standard (first encounter)

- Uses `simpleExplanation` from vocabulary config
- Every student sees this initially

### Tier 2: Scaffolded (triggered by wrong answer on related question)

- Uses `definition` field paired with the `example` field, reframed as "Think of it like..."
- Auto-derived from existing data for v1
- Shorter, more concrete, more accessible
- Optional: add a `scaffoldedExplanation` field later for terms where auto-generation falls short

### Tier 3: Deep Dive (triggered by consistent correct answers)

- Pulls `keyIdea` from the textbook section covering this term
- Adds a connection prompt: "How does this connect to [related term]?"
- Rewards mastery with richer context
- Appears as bonus slides, not required; a reward, not a gate

### Tier Transition Logic

- Start at Tier 1 for all terms
- Get a related question **wrong** → next appearance shows Tier 2
- Get it wrong **again** → stay at Tier 2, re-test with a different question format (if MC was wrong, try fill-in-blank)
- Get it **right** → mark as "learning." Next session, if right again → eligible for Tier 3
- Tier 3 content is supplemental/bonus

## Student Voice & Reflections

### Structured Reflection Prompts

Every 5-7 slides, the flow pauses with a reflection card. Example prompts:

- "What connection can you make between [term] and something in your life?"
- "What's still confusing about this topic?"
- "How would you explain [term] to a friend?"
- "What questions do you have for Mr. B about this?"

Student types a short response (1-3 sentences). Skip option available but participation is encouraged. **Reflections are not scored.** The system thanks the student and moves on.

### Always-Available "Wonder" Button

A lightbulb icon in the corner of every slide. Tapping opens a quick text field: "What are you wondering right now?" Student types a thought, it's saved, and the slide flow continues.

### Where Reflection Data Goes

- Saved to localStorage (and Supabase if cloud sync is enabled)
- Visible to the student in "My Study Guide"
- Visible to the teacher in the dashboard as a "Student Reflections" section, filterable by student, topic, or prompt type
- Useful for class discussions

## Pre/Post Assessment & Visible Progress

### Pre-Assessment

- Quick adaptive quiz before learning begins
- Samples at least 1 question from every topic area
- Stops after confident picture OR 3+ consecutive wrong
- Typically 5-8 questions, 1-2 minutes
- Results stored with timestamp

### Post-Assessment

- Same question pool, **different questions** than pre-assessment (no repeats)
- Same adaptive length logic
- Deliberately includes questions from topics the student got wrong in pre-assessment

### Growth Screen

Shown after post-assessment:

- Side-by-side comparison: "Before: 3/8 (38%) → After: 7/8 (88%)"
- Visual progress bar or animation showing the jump
- Per-topic breakdown
- Encouraging message: "You learned 4 new concepts in this session!"
- Reflection count: "You shared 3 thoughts; check your Study Guide to review them"

### Session History

- Pre/post scores saved per session
- Available in "My Study Guide" as a list: "Session 1: 38% → 88%, Session 2: 50% → 92%"
- Visible to teacher in dashboard

## Points & Incentives

### 1.5x Points Multiplier

Learn Mode earns 1.5x study time points compared to other activities. This makes it the most rewarding activity by design.

Implementation: in `ActivityTimer._addCappedStudyTime()`, check if the current activity is `learn-mode` and multiply credited time by 1.5.

### 30-Minute Daily Cap

Learn Mode has its own 30-minute daily cap (vs 15 minutes for all other activities). Combined with the 1.5x multiplier, Learn Mode can earn up to 45 minutes worth of points in a single day.

Implementation: in `ActivityTimer`, check activity ID against a cap override. If `learn-mode`, use 30 * 60 * 1000 instead of `DAILY_ACTIVITY_CAP_MS`.

### Completion Bonus

Completing a full session (reaching the post-assessment) earns a bonus point burst.

## Technical Architecture

### New File

`study-tools/engine/js/activities/learn-mode.js`

### Activity Registration

```javascript
StudyEngine.registerActivity({
    id: 'learn-mode',
    name: 'Learn Mode',
    icon: 'fas fa-brain',
    category: 'study',
    requires: ['vocabulary', 'practiceQuestions', 'fillInBlankSentences']
});
```

### Data Sources (all existing, no new content)

| Data | Source | Used For |
|------|--------|----------|
| Terms + explanations | `config.vocabulary` | Term cards, tier content |
| MC questions | `config.practiceQuestions` | Question cards, pre/post assessment |
| Fill-in-blank | `config.fillInBlankSentences` | Fill-in-blank cards |
| Key ideas | `textbook.json` section keyIdea fields | Key idea cards, Tier 3 content |
| Vocab terms per section | `textbook.json` section vocabTerms arrays | Linking terms to key ideas |

### Progress Storage (localStorage via ProgressManager)

- `learn-mode-sessions`: array of session objects (pre/post scores, date, mode, category)
- `learn-mode-tiers`: object mapping term names to current tier (1, 2, or 3)
- `learn-mode-reflections`: array of reflection objects (text, prompt, term/topic, timestamp)
- Standard activity progress (attempts, time spent) handled by existing engine

### Engine Changes

**ActivityTimer (app.js):**
- Add Learn Mode cap override: 30 minutes instead of 15
- Add 1.5x points multiplier for learn-mode activity

**Mastery (mastery.js):**
- Add `'learn-mode'` to `alwaysAccessible` list
- Content within Learn Mode respects mastery: only shows terms/questions from unlocked categories

**Config (westward-expansion config.json):**
- Add `"learn-mode"` to activities array

### No New Config Data Fields for v1

All three tiers derive from existing vocabulary fields:
- Tier 1: `simpleExplanation`
- Tier 2: `definition` + `example`
- Tier 3: textbook `keyIdea` for the section containing this term

## Implementation Stages

### Stage 1: Core Activity Shell
- Create `learn-mode.js` with activity registration
- Build session setup screen (mode selection: category, full unit, smart review)
- Add to westward-expansion activities list
- Add to `alwaysAccessible` in mastery.js

### Stage 2: Card Rendering
- Build Term Card component
- Build Key Idea Card component (requires textbook.json fetch)
- Build MC Question Card component
- Build Fill-in-Blank Card component
- Slide transition animations

### Stage 3: Session Flow & Sequencing
- Build slide sequencer (learn/test interleaving pattern)
- Pre-assessment flow with adaptive stopping
- Post-assessment flow (no repeat questions)
- Growth screen with before/after comparison
- Session persistence (resume or start fresh)

### Stage 4: Adaptive Depth
- Tier tracking per term
- Tier transition logic (wrong → Tier 2, right consistently → Tier 3)
- Tier 2 content derivation (definition + example reframing)
- Tier 3 content derivation (textbook keyIdea + connection prompt)
- Re-test with different format on repeated wrong answers

### Stage 5: Student Voice
- Structured reflection prompts (every 5-7 slides)
- Wonder button (always available)
- Reflection storage and retrieval
- Integration with My Study Guide display

### Stage 6: Points & Polish
- 1.5x points multiplier in ActivityTimer
- 30-minute daily cap override
- Session completion bonus
- Session history in My Study Guide
- Dashboard integration for teacher (reflections view)
- CSS polish, responsive layout, dark/light mode

## Known Issues & Edge Cases

### 1. Connections Questions Require Full Mastery
The "Connections" topic (3 questions) requires ALL categories to be mastered. Learn Mode pre-assessment must skip Connections if not all categories are unlocked.

### 2. Smart Review Cold Start
Smart Review needs prior mastery/session data to know what's weak. First-time users have none. Fallback: if no prior data, prompt the student to pick a category or start Full Unit instead of Smart Review.

### 3. Points Stacking
The 30-min Learn Mode cap is separate from 15-min caps on other activities. A student could earn up to 45 min of Learn Mode points PLUS 15 min from each other activity in a single day. This is intentional (Learn Mode should be the most rewarding), but be aware students could accumulate significant points.

### 4. Multiplier Implementation
ActivityTimer.start() takes a single activityId. The 1.5x multiplier must be applied in `_addCappedStudyTime()` (when crediting points), NOT in the timer tick (which measures real elapsed time). The cap should still be based on real time (30 min), but credited points = real time * 1.5.

### 5. Reflection Storage Growth
Student reflection text stored in localStorage could grow large over time (especially with many students on shared devices). Strategy: keep only the last 50 reflections in localStorage; if Supabase sync is enabled, push older reflections to cloud and trim local storage.

### 8. Requires Field Is Informational Only
The engine's `requires` property on activities is never checked at runtime. Learn Mode must add its own defensive checks: if `config.vocabulary`, `config.practiceQuestions`, or `config.fillInBlankSentences` are missing or empty, show a friendly "Not enough content for Learn Mode" message instead of crashing.

### 9. Cap/Multiplier Interaction Must Be Precise
The 30-min cap applies to REAL wall-clock time (tracked via `data.ms`). The 1.5x multiplier applies ONLY to the credited amount passed to `ProgressManager.addStudyTime()`. So: cap check uses raw ms, but the `credited` value is `Math.min(ms, remaining) * 1.5`. The cap warning messages (80% at 24 min, 100% at 30 min) and banner text must be updated to show "30 min" instead of hardcoded "15 min" when the current activity is learn-mode.

### 10. Fill-in-Blank Distractors
Distractors for fill-in-blank cards come from other vocab term names in the same category. To avoid giving away the answer by length, select distractors that are similar in word count to the correct answer (e.g., if the answer is "Indian Removal Act" (3 words), pick other multi-word terms like "Worcester v. Georgia" as distractors, not single words like "tariff").

### 11. Tier 2 Content Template
Tier 2 auto-derivation format: show the formal `definition` as the main text, then below it show "For example: [example field]". Do NOT prepend "Think of it like..." to the example sentence. The reframing is structural (definition + example shown together in a clearer layout) rather than textual transformation.

### 12. Session Persistence State
A saved session stores: session mode, category selection, current slide index, pre-assessment results, questions used (to avoid repeats in post), per-term tier overrides for this session, and reflection responses. Sessions expire after 7 days (stale sessions are discarded on resume attempt). Stored under ProgressManager key `learn-mode-current-session`.

### 13. Textbook Fetch Failure
If textbook.json fails to load, Learn Mode degrades gracefully: Key Idea cards and Tier 3 Deep Dive content are skipped. The session continues with Term Cards and question cards only. No error shown to the student.

### 14. Smart Review Algorithm
Smart Review priority: (1) terms the student got wrong in their most recent Learn Mode session, (2) terms never seen in Learn Mode, (3) terms at Tier 1 (not yet advanced to Tier 2/3), (4) terms from flashcard "weak" list if available. If no prior data exists, fall back to prompting category selection or Full Unit.

### 15. Completion Bonus
Completing a session (reaching post-assessment) awards a flat bonus of 5 minutes of credited study time, added on top of the timer-based points. This bonus is NOT subject to the daily cap. It's a one-time reward per completed session per day (max 1 bonus per day to prevent farming).

### 6. Limited Question Pool for Single-Category Sessions
If a student only has 1 category unlocked and chooses that category, the pre/post assessment draws from ~11 questions (7 MC + 4 FIB). This is enough for the adaptive assessment (typically needs 5-8), but pre and post combined need ~10-16 unique questions. May need to allow some question reuse between pre and post in small pools, or supplement with generated term-recall questions.

### 7. Textbook.json Fetch
Key Idea cards require fetching textbook.json, which is a separate file from config.json. The activity must handle this async fetch gracefully: if textbook.json fails to load, Key Idea cards should be skipped (degrade gracefully) rather than crashing the session.
