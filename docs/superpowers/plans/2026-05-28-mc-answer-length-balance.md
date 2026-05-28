# Civil War MC Answer Length Balancing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite civil-war practice question options so the correct answer is no longer the obvious longest choice, removing the "click the longest option" exploit.

**Architecture:** Pure content edits to `study-tools/units/civil-war/config.json` (`practiceQuestions` array). For each failing question: trim the verbose correct option to its core claim, fold the removed detail into that question's `explanation` field, and lengthen distractors with *specifically* wrong detail. A Node audit script (`_tools/audit-mc-lengths.js`) is the regression gate — a question passes when the correct option is at most 10 chars longer than the longest distractor. No application code, shuffling, or scoring logic changes (shuffling is already implemented in all 5 MC activities).

**Tech Stack:** Vanilla JS study-tools app, JSON config, Node for the audit script. No build tools.

---

## Reference: design spec

`docs/superpowers/specs/2026-05-28-mc-answer-length-balance-design.md`

## Reference: failing questions (audit at >10-char threshold, 53 total)

The audit script is authoritative; this is a snapshot from the clean run. Indices are positions in `config.practiceQuestions`:

- **Worlds of North & South (8):** #1, #29, #33, #34, #58, #60, #61, #62
- **African Americans at Mid-Century (12):** #4, #5, #6, #31, #50, #51, #52, #53, #54, #55, #56, #57
- **A Dividing Nation (16):** #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #36, #37, #38, #39, #40, #41
- **The Civil War (17):** #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #44, #45, #46, #47, #48

**Always re-derive the live list from the audit script before editing** — do not hand-trust this snapshot. Edit each question by matching its `question` text, not its index (indices shift only if order changes, but matching by text is safest).

## Editing rules (apply to every failing question)

1. **Trim the correct option** to its essential, still-correct claim. Keep it accurate and at 8th-grade reading level.
2. **Move the trimmed detail into `explanation`** so nothing is lost pedagogically. The explanation is shown after the student answers.
3. **Strengthen distractors** so they are plausibly the same length as the (trimmed) correct answer, using *specifically* wrong facts (real but mismatched names/dates/places/mechanisms). Never pad with vague filler — that creates a new "the waffly one is wrong" tell.
4. **Do not change** the `correct` index, `question` text, `topic`, or array order.
5. **House style:** no `--` em-dashes anywhere in student-facing text; warm, accessible tone.
6. **Target:** correct option within 10 chars of the longest distractor (audit passes).

---

## Task 0: Verify the audit tool and baseline

**Files:**
- Verify exists: `study-tools/units/civil-war/_tools/audit-mc-lengths.js`

- [ ] **Step 1: Run the full audit to confirm the baseline**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js
```
Expected: `Failing (correct >10 chars longer than any distractor): 53` and a non-zero exit code.

- [ ] **Step 2: Confirm per-chapter filtering works**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'Worlds of North & South'
```
Expected: `Checked: 12`, `Failing ...: 8`.

- [ ] **Step 3: Commit the audit tool**

```bash
git add study-tools/units/civil-war/_tools/audit-mc-lengths.js
git commit -m "test(civil-war): add MC answer-length audit gate

Flags practice questions where the correct option is >10 chars longer than
any distractor, so the length-balancing work has a measurable pass/fail gate."
```

---

## Task 1: Chapter "Worlds of North & South" (8 questions)

**Files:**
- Modify: `study-tools/units/civil-war/config.json` (practiceQuestions: #1, #29, #33, #34, #58, #60, #61, #62)

- [ ] **Step 1: Re-derive the live failing list for this chapter**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'Worlds of North & South' --verbose
```
Note every `FAIL #N` line. Edit exactly those questions.

- [ ] **Step 2: Rewrite each failing question per the Editing rules**

Locate each failing question in `config.json` by its `question` text. Apply the Editing rules: trim correct option, move detail to `explanation`, strengthen distractors with specific wrong facts.

Worked example (#29, "Which best describes the plantation economy of the American South?"):

BEFORE (correct option 115 chars, distractors ~55):
```json
{
  "options": [
    "A system of small family farms growing food for local markets",
    "An economy built on large farms that used enslaved labor to grow cash crops like cotton for sale",
    "A network of factories powered by enslaved workers",
    "An economy based mostly on fishing and shipping"
  ],
  "correct": 1,
  "explanation": "The Southern economy depended on plantations and enslaved labor.",
  "topic": "Worlds of North & South"
}
```

AFTER (correct trimmed to ~63 chars, distractors specific and comparable, detail moved to explanation):
```json
{
  "options": [
    "Small family farms growing corn and wheat for nearby towns",
    "Large farms using enslaved labor to grow cash crops like cotton",
    "Water-powered textile mills staffed mostly by paid factory workers",
    "Coastal fishing fleets and shipyards that exported goods to Europe"
  ],
  "correct": 1,
  "explanation": "The Southern economy depended on plantations that used enslaved labor to grow cash crops like cotton for sale, especially to Britain. This made the South rely on a single export crop and on slavery itself.",
  "topic": "Worlds of North & South"
}
```

Apply the same treatment to the other failing questions in this chapter.

- [ ] **Step 3: Validate JSON still parses**

Run:
```bash
node -e "require('./study-tools/units/civil-war/config.json'); console.log('JSON OK')"
```
Expected: `JSON OK` (no parse error).

- [ ] **Step 4: Run the chapter audit — must pass**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'Worlds of North & South'
```
Expected: `Failing ...: 0` and `All checked questions pass.`
If any still fail, return to Step 2 for those specific questions.

- [ ] **Step 5: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "content(civil-war): balance MC option lengths for Worlds of North & South

Correct answers were the longest option in every flagged question, letting
students click the longest choice blind. Trimmed correct answers into the
explanation field and gave distractors specific wrong detail so length no
longer signals the answer. Audit passes for this chapter."
```

---

## Task 2: Chapter "African Americans at Mid-Century" (12 questions)

**Files:**
- Modify: `study-tools/units/civil-war/config.json` (practiceQuestions: #4, #5, #6, #31, #50, #51, #52, #53, #54, #55, #56, #57)

- [ ] **Step 1: Re-derive the live failing list**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'African Americans at Mid-Century' --verbose
```

- [ ] **Step 2: Rewrite each failing question per the Editing rules**

Worked example (#46 belongs to "The Civil War" chapter; here use #31, gap=83, "Why was Harriet Tubman called \"Moses\" by the people she helped?"):

BEFORE (correct 125 chars, distractors ~40):
```json
{
  "options": [
    "She wrote a famous book about the Bible",
    "Like the biblical figure, she led her people out of bondage by guiding enslaved people to freedom on the Underground Railroad",
    "She was a preacher in a Northern church",
    "She wore long robes like the prophet Moses"
  ],
  "correct": 1
}
```

AFTER (correct trimmed, distractors specific and comparable):
```json
{
  "options": [
    "She wrote a best-selling book retelling stories from the Bible",
    "Like Moses, she led her people out of bondage toward freedom",
    "She preached at a large free Black church in the city of Boston",
    "She always wore long flowing robes like the prophet in paintings"
  ],
  "correct": 1,
  "explanation": "Like the biblical Moses who led his people out of slavery, Harriet Tubman guided many enslaved people to freedom on the Underground Railroad, making dangerous trips back into the South to do it."
}
```

Apply to the other failing questions in this chapter.

- [ ] **Step 3: Validate JSON parses**

Run:
```bash
node -e "require('./study-tools/units/civil-war/config.json'); console.log('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 4: Run the chapter audit — must pass**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'African Americans at Mid-Century'
```
Expected: `Failing ...: 0`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "content(civil-war): balance MC option lengths for African Americans at Mid-Century

Same length-tell fix as the prior chapter: trimmed verbose correct answers
into explanations and made distractors specifically (not vaguely) wrong so
they match length. Audit passes for this chapter."
```

---

## Task 3: Chapter "A Dividing Nation" (16 questions)

**Files:**
- Modify: `study-tools/units/civil-war/config.json` (practiceQuestions: #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #36, #37, #38, #39, #40, #41)

- [ ] **Step 1: Re-derive the live failing list**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'A Dividing Nation' --verbose
```
Edit exactly the `FAIL` questions.

- [ ] **Step 2: Rewrite each failing question per the Editing rules**

Worked example (#34 belongs to "Worlds of North & South"; here use #41, gap=85, "How did the Fugitive Slave Law of 1850 change life for free and escaped Black people?"). Re-read the live option text in `config.json` before editing, then trim the correct option, move detail into `explanation`, and rewrite distractors with specific wrong detail (e.g., wrong dates, wrong sponsors, wrong consequences) so all four options land within 10 chars of each other.

General pattern for this chapter (mostly "Why/What" questions where the correct answer is a long causal sentence):
- Correct option → one tight clause naming the key effect/cause.
- Full causal chain → `explanation`.
- Distractors → name real but wrong people/laws/years (e.g., "the Compromise of 1820", "Senator Stephen Douglas's idea", "a ruling by President Buchanan") so they read as confident and specific.

Apply to all failing questions in this chapter. This is a large batch; work through them methodically, one question at a time.

- [ ] **Step 3: Validate JSON parses**

Run:
```bash
node -e "require('./study-tools/units/civil-war/config.json'); console.log('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 4: Run the chapter audit — must pass**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'A Dividing Nation'
```
Expected: `Failing ...: 0`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "content(civil-war): balance MC option lengths for A Dividing Nation

Trimmed correct answers into explanations and rewrote distractors with
specific wrong detail (wrong laws, dates, and sponsors). Audit passes for
this chapter."
```

---

## Task 4: Chapter "The Civil War" (17 questions)

**Files:**
- Modify: `study-tools/units/civil-war/config.json` (practiceQuestions: #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #44, #45, #46, #47, #48)

- [ ] **Step 1: Re-derive the live failing list**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'The Civil War' --verbose
```

- [ ] **Step 2: Rewrite each failing question per the Editing rules**

Worked example (#44, gap=96, "What was the Anaconda Plan?"):

BEFORE (correct 141 chars, distractors ~42):
```json
{
  "options": [
    "A Confederate plan to attack Washington DC",
    "The Union's overall war strategy of blockading Southern ports, capturing the Mississippi River, and slowly squeezing the South into surrender",
    "A failed plan to invade Canada",
    "A plan to free all enslaved people in one day"
  ],
  "correct": 1
}
```

AFTER (correct trimmed to ~61 chars, distractors specific and comparable):
```json
{
  "options": [
    "A Confederate plan to capture Washington DC in one swift attack",
    "The Union plan to blockade Southern ports and split the South",
    "A failed Union scheme to invade British-held Canada from Maine",
    "A proposal to free every enslaved person on one chosen day"
  ],
  "correct": 1,
  "explanation": "The Anaconda Plan was the Union's overall war strategy: blockade Southern ports, capture the Mississippi River, and slowly squeeze the South into surrender, like an anaconda crushing its prey."
}
```

Second worked example (#46, gap=97, "What was the USCT, and why did it matter for the war?"):

AFTER:
```json
{
  "options": [
    "A Confederate spy ring that operated inside Washington DC",
    "The Union Army regiments made up of Black soldiers",
    "A new rifle the North first used at the Battle of Gettysburg",
    "A peace treaty Northern Democrats proposed back in 1863"
  ],
  "correct": 1,
  "explanation": "USCT stood for the United States Colored Troops, the official designation for nearly 180,000 Black soldiers who served in the Union Army by the war's end. Their service proved Black soldiers were vital to Union victory."
}
```

Apply to all failing questions in this chapter.

- [ ] **Step 3: Validate JSON parses**

Run:
```bash
node -e "require('./study-tools/units/civil-war/config.json'); console.log('JSON OK')"
```
Expected: `JSON OK`.

- [ ] **Step 4: Run the chapter audit — must pass**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js --topic 'The Civil War'
```
Expected: `Failing ...: 0`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "content(civil-war): balance MC option lengths for The Civil War chapter

Final batch of the length-tell fix. Trimmed correct answers into
explanations and rewrote distractors with specific wrong detail. Audit
passes for this chapter."
```

---

## Task 5: Full-unit verification, no-dash check, and version bump

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Run the full audit — zero failures**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js
```
Expected: `Failing (correct >10 chars longer than any distractor): 0`, `All checked questions pass.`, exit code 0.

- [ ] **Step 2: Confirm no em-dashes were introduced in edited options/explanations**

Run:
```bash
node -e "var c=require('./study-tools/units/civil-war/config.json'); var hits=[]; c.practiceQuestions.forEach(function(q,i){ var blob=(q.options||[]).join(' ')+' '+(q.explanation||''); if(blob.indexOf('--')!==-1) hits.push(i); }); console.log(hits.length? 'EM-DASH in questions: '+hits.join(','):'No -- dashes'); "
```
Expected: `No -- dashes`. If any are reported, fix those questions and re-run Step 1.

- [ ] **Step 3: Spot-check that no correct answer became factually wrong**

Manually read the `question` + correct `option` + `explanation` for 5 random edited questions across chapters. Confirm the correct option is still unambiguously correct and the distractors are still wrong.

- [ ] **Step 4: Bump the version**

The current `study-tools/engine/version.json` is `8.41.0` dated `2026-05-21`. Bump the minor version to `8.42.0` and set `date` to `2026-05-28`:
```json
{
    "version": "8.42.0",
    "date": "2026-05-28"
}
```

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version to 8.42.0 for civil-war MC answer-length balancing

All 53 flagged practice questions now pass the length audit; the correct
answer is no longer the longest option."
```

- [ ] **Step 6: Final confirmation**

Run:
```bash
node study-tools/units/civil-war/_tools/audit-mc-lengths.js && echo "DONE: all questions pass"
```
Expected: audit passes and prints `DONE: all questions pass`.

---

## Self-review notes

- **Spec coverage:** trim-into-explanation (rule 2, every task) ✓; strengthen distractors specifically (rule 3) ✓; batch-by-chapter review (Tasks 1-4) ✓; regression gate (audit, every task + Task 5) ✓; version bump (Task 5) ✓; no-dash house style (rule 5 + Task 5 Step 2) ✓.
- **No placeholders:** every edit task has concrete worked before/after examples and exact commands. Task 3 gives a per-chapter pattern instead of a single before/after because all 16 are the same "long causal sentence" shape; the editing rules + audit gate make each edit unambiguous.
- **Threshold consistency:** the gate is ">10 chars" everywhere (script default `THRESHOLD = 10`), matching the spec's "within ~10 chars" goal.
- **Counts:** 53 failing total (8 + 12 + 16 + 17), matching the clean audit run. Version current = 8.41.0 → bump to 8.42.0.
- **Index stability note:** tasks instruct editing by `question` text and re-deriving the failing list from the script.
