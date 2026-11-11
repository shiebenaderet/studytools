# Unit 3 Study Site: Handoff (Nov 11, 2026)

Unit 3, **Building a Government** (`study-tools/units/building-a-government/`), is built and
tested but not live yet. This file picks up the work that is still missing, mostly the
readings, from the cloud session of Nov 9 to 11.

Read `CLAUDE.md` first. It covers commits, versioning, the changelog, testing and Go Deeper
links. Decisions about Read More and response capture are in
`docs/plans/2026-11-09-unit3-read-more-checks.md` (branch `unit3-read-more-plan`).

---

## 1. Branches and Going Live

| Branch | Contents | Merge when |
|---|---|---|
| `unit3-now` | Unit 3, Read More panels and Read More Checks, Power Sort, the dashboard Responses tab, Quick/Clear/Full/Deep level names, Sort It Out picking 4 random categories, plural tap-to-define, and skipping the level screen when a unit has one level. | Any time. |
| `short-answer-send` | `unit3-now` plus the Short Answer change: answers go to the teacher, 20 points per answer of 20+ words, paste blocked. **This file is on this branch.** | Thursday 11/12 evening, after the Unit 2 quiz. |
| `unit3-build` | An old combined copy. | Never. Delete after the merge. |

**Merging to `main` is going live, and needs the teacher's OK.** For Thursday:

```sh
git checkout main && git pull
git merge --ff-only origin/short-answer-send
node study-tools/engine/tools/unit-content-check.js building-a-government   # 0 ERRORs
for f in study-tools/engine/tools/*.test.js; do node "$f" >/dev/null || echo "FAIL $f"; done
git push origin main
```

The unit opens to students **Friday 11/13** (`"opens": "2026-11-13"` in `units/units.json`).
Before that, only a teacher signed in through the dashboard can preview it.

Start new work from `short-answer-send` until it is merged, then from `main`.

---

## 2. What the Unit Has Now

- `config.json` holds:
  - 50 vocab terms in 5 categories
  - 61 practice questions
  - 32 fill-in-the-blank sentences
  - 6 short answers (with plan and starters, no "Look at")
  - 19 timeline events
  - 5 typing passages
  - 2 power sorts
  - quotes and fun facts
- `goDeeper` is still empty.
- `textbook.json` has 5 chapters and 17 sections. Each section has:
  - `content.standard`: the short gated text, about 150 to 210 words, at **Full only**
  - `keyIdea` and `vocabTerms`
  - `image` (except two sections)
  - `readMore`: the long version (425 to 710 words) at Full, plus a Read More Check
- **Edit `config.json` and `textbook.json` directly.** The cloud session's generator scripts
  were temporary and are gone.

| Segment id (category) | Unlocks | Sections |
|---|---|---|
| `why-articles-failed` (Why the Articles Failed) | 11/13 | a-government-afraid-of-power, cracks-in-the-confederation, philadelphia-1787 |
| `compromises-in-philadelphia` | 11/18 | two-plans-and-the-great-compromise, compromises-over-slavery |
| `inside-the-constitution` | 11/19 | we-the-people, seven-articles-three-branches, choosing-a-president, sharing-power-with-the-states, checks-and-balances |
| `treaties-and-sovereignty` | 11/30 | nations-within-a-nation, the-supreme-law-of-the-land, the-treaty-of-greenville |
| `ratification-and-rights` | 12/2 | the-great-debate, changing-the-constitution, the-bill-of-rights, widening-we-the-people |

The drafts also live in two Claude Docs in the teacher's account: "Unit 3 Readings: Full
Drafts" (the long versions) and "Unit 3 Readings: Short Site Version". **`textbook.json` is
newer than both.** It has the impeachment wording in checks-and-balances and "amendments"
bolded in widening-we-the-people.

---

## 3. Missing Work, in Order

### A. The Quick, Clear and Deep Readings (main job)

Chapter 1 has to be ready first, because it opens Friday and students read it the first week.
**Write Chapter 1's three sections at all three levels, show the teacher, then do the rest.**

**1. Turn the levels on.** Copy Revolution's `readingLevels` block
(`units/revolution/textbook.json`) into Unit 3's, replacing the one-level block. The keys and
labels are:

| Key | Label |
|---|---|
| `level0` | Quick |
| `simplified` | Clear |
| `standard` | Full |
| `advanced` | Deep |

Once there is more than one level, the "Choose Your Reading Level" screen and the level
buttons come back on their own.

**2. Write each section's new levels** beside `standard` in `content`:
`content.level0`, `content.simplified` and `content.advanced`. The same section (heading,
`keyIdea`, image, vocab) serves all four.

**Level targets:** these come from ams-planning `docs/READING-LEVELS.md`, which is the one
definition. Copy that file here too if it isn't already.

| Level | Sentences | Measured grade (FK) | Fails above | Revolution's length vs. Full |
|---|---|---|---|---|
| Quick | 5 to 10 words; key words explained in the text | about 2 to 4 | 5.0 | about half |
| Clear | 10 to 15 words; plain words | about 5 to 6.5 | 7.5 | about two-thirds |
| Full | (existing) | about 8 to 9.5 | 10.5 | |
| Deep | longer, varied | above Full | must beat Full | about the same or a little longer |

- **Deep adds** real quotes from the time and what historians argue.
- **Each topic must step up:** Quick < Clear < Full < Deep.
- **FK method:** `READING-LEVELS.md` gives the formula and the syllable counter. Studytools has
  no level checker yet. **Add one** (for example
  `study-tools/engine/tools/reading-levels-check.js`, ported from ams-planning
  `tests/reading-levels.test.js`) and run it on every section.

**Rules for the text:**

- Use the `historical-prose` skill. The teacher wants it to sound like a middle-school
  textbook (TCI History Alive!, Holt, Savvas), with a story thread: people making choices,
  causes leading to effects. Not a fact list, and nothing that "feels very AI."
- Also use the `leveled-reading` skill for the level steps.
- Every level keeps **the same facts and the same story**. Lower levels cut detail; they never
  change what happened. Explain confusing ideas instead of skipping them.
- **Keep every `vocabTerms` word in every level, spelled the same,** because tap-to-define
  matches the exact term (plus a plural ending). Keep the `<strong>` around the first use.
- **Quick explains each vocab term in the sentence** where it first appears.
- **Style:** American English, no em dashes, Title Case for `<h4>` subheads.
- **Don't change section ids, headings or the existing `standard` text.** Highlights and
  reading progress are keyed to them. Students start reading Friday.

**3. Read More panels.** The teacher's decision: Full first, then Full and Clear. So the next
step after the short readings is `readMore.content.simplified` (Clear) for each section. The
panel already shows a "shown at Full" note when the student's level has no Read More text.
Quick and Deep stay unwritten unless he asks.

**4. Check it in the browser.** The recipe is in section 5.
- Pick each level on a section and confirm the text swaps.
- Confirm Listen reads the right text.
- Confirm vocab spans appear.
- Confirm Read More still opens.

**5. Commit one chapter per commit.** Each commit gets a version bump and a changelog entry
("Unit 3 readings: Chapter 1 at Quick, Clear and Deep").

### B. Images for Two Sections

`nations-within-a-nation` and `the-supreme-law-of-the-land` have no image.

- **Format:** match the other sections' `image` object:
  `{"src": "../units/building-a-government/images/<file>.jpg", "caption": "...", "credit": "...", "float": "right"}`.
- **Sources:** public domain only. Library of Congress and National Archives worked; Wikimedia
  was unreachable from the cloud session.
- **Size:** downscale to about 900 px wide, as JPEG.
- **Ideas:**
  - The signed page of the 1854 Treaty of Medicine Creek (National Archives)
  - Article VI of the Constitution
  - A Puget Sound fishing photo from the LoC, around 1900
- **Captions:** say what it is and why it matters, with no guessing about people's feelings.

### C. Go Deeper Links

`goDeeper` in `config.json` is empty. Follow `CLAUDE.md` step 4, about 6 per category, in this
order:

1. PBS clips or PBS LearningMedia (grades 6 to 8; short clips, never full episodes)
2. One fast video (Crash Course, TED-Ed)
3. American Yawp, chapter 7, as `"level": "challenge"`
4. Britannica Kids or Students, checked to open from home
5. One link that brings in overlooked voices

For Treaties and Sovereignty, Washington's Since Time Immemorial curriculum and the National
Archives' treaty pages fit. Put a vetting table (link, source, what to check) in a plan doc.
**The teacher vets every link before it ships.** Never embed a player.

### D. Smaller Items

- **Vocab images:** the flashcard images haven't been added. Revolution's terms have
  public-domain images.
- **Reading audio:** recorded audio, if the teacher wants it. Listen (text to speech) already
  works.
- **Read More Checks:** if any comes back confusing once students use them, the questions are
  in each section's `readMore.check`.

---

## 4. Rules That Apply to All of This

- **Proposed changes:** give the teacher a list of proposed changes before rebuilding anything
  he has already approved, and wait for the go-ahead.
- **Student questions:** no "Look at" lines.
- **Shipping:** one change per commit, each with a version bump, a changelog entry and a README
  or TEACHER-GUIDE update when teacher-facing behavior changes. No model names anywhere.
- **Database:** don't touch the live Supabase without the teacher's say-so. The `responses`
  migration is already applied.

---

## 5. Testing Recipe

```sh
cd study-tools && python3 -m http.server 8765 &      # stop it later with: kill %1
node engine/tools/unit-content-check.js building-a-government
```

Playwright (preinstalled), on
`http://127.0.0.1:8765/engine/index.html?unit=building-a-government#textbook`:

- **Block the service worker:** `browser.new_context(service_workers='block')`. Otherwise it
  serves a cached `textbook.json` and your edits seem to do nothing.
- **Before load:** set `sessionStorage['teacher-unlock']='true'` and
  `localStorage['how-to-study-seen']='1'`. Then click `button.welcome-guest-link`.
- **Level picker:** the textbook asks for a level on first visit (`.tb-level-card`) once there
  is more than one level.
- **Fail the test** on any page error.
- **Student features:** stub `ProgressManager.studentId`, `studentInfo` and `supabase.rpc`,
  and `LeaderboardManager.submitScore`, so nothing writes to the live database.
- **Date gate:** to see it, fake `Date` in an init script.
