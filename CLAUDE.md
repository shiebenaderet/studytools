# Study Tools: project memory

Study site for Mr. Benaderet's 8th grade U.S. History classes (Washington State),
live at study.mrbsocialstudies.org. Students are 13 to 14 and use school
Chromebooks and their own phones, often Android. Everything below was learned
from building units and from student feedback; follow it when building or
changing a unit.

## How work ships

- GitHub Pages serves the site from `main`. Work on a branch. Merging to `main`
  is going live, so it needs the teacher's explicit OK every time.
- One change per commit. Each commit bumps the patch version in
  `study-tools/engine/version.json` and adds a dated entry at the top of
  `CHANGELOG.md` (Added / Changed / Fixed / Security). Name the student request
  it answers by period, never by student name. Credit the student in the
  README's Student Contributors table instead (first name, last initial).
- Never put a model name or ID in commits, code or docs.
- New engine scripts go in both `study-tools/engine/index.html` and the
  precache list in `study-tools/engine/sw.js`.
- When a change alters what a teacher configures or a student sees, update
  `README.md` (feature tables, version badge) and `docs/TEACHER-GUIDE.md`
  (activity table, field reference, section 7 checklists, FAQ) in the same
  change.
- Bigger requests start as a plan in `docs/plans/YYYY-MM-DD-<topic>.md` with
  findings, a size estimate per item, and the decisions the teacher must make.
  Build only after the teacher answers.

## Building a new unit: checklist

A unit is `study-tools/units/<id>/config.json` plus `textbook.json`, listed in
`study-tools/units/units.json`. See `docs/TEACHER-GUIDE.md` for every field.

1. **Categories line up everywhere.** Each textbook segment has a `category`
   that exactly matches a vocabulary `category`, and so does every
   `categorySchedule` key and `goDeeper` entry. A segment without a matching
   category silently skips the read-before-flashcards gate and gets no
   "Keep going" box.
2. **At least 6 must-know terms per unit,** ideally per category. Games pad
   with other tiers below 6. Who Am I Challenge mode uses every tier.
3. **Vocab `example` and `simpleExplanation` may name the term.** Who Am I
   blanks the term and its word stems out of its clues. Run the checker
   (below) to confirm no clue still gives the answer away; if one does, reword
   that example or explanation. `_MASK_SKIP_WORDS` in `who-am-i.js` lists
   words that are never masked, so do not add a giveaway word to it.
4. **Go Deeper links for every category** (`goDeeper` in config). This answers
   students who outgrow the games and want more to read. About 6 links per
   category, in this order of preference:
   - PBS first: Ken Burns clips on pbs.org and PBS LearningMedia resources
     tagged grades 6 to 8. PBS usually loads on school networks where YouTube
     is blocked. Link short clips, never full episodes, which can go behind a
     PBS Passport login after their free window.
   - One fast-paced video (Crash Course, TED-Ed) for students at home.
   - The matching American Yawp section as `"level": "challenge"`; it is
     college prose and the textbook is adapted from it. Yawp Reader primary
     sources (full text) are a good `reading` link too.
   - Britannica Kids or Students articles for reference. The district has
     Britannica School, which may need a school login, so prefer articles
     that open from home.
   - A clip or interactive that brings in overlooked voices for the unit's
     research category.
   Links open in a new tab. Never embed a player or third-party script: the
   privacy page promises the site loads nothing from third parties. The
   teacher's DVDs are for class only; never rip or host clips.
   Every link must be vetted by the teacher before going live. Put a vetting
   table (link, source, what to check) in the unit's plan doc.
5. **Textbook section ids and text are stable once students start.**
   Highlights and reading progress are keyed by `segment-id/section-id`
   (plus reading level for highlights). Renaming an id orphans them; editing
   text drops highlights whose words changed.
6. **Typing passages and typed-answer activities** inherit the phone fixes
   below automatically if they reuse the existing helpers.
7. Run `node study-tools/engine/tools/unit-content-check.js <unit-id>` and fix
   every ERROR. WARN lines are advisory.

## Engine conventions

- **Phone keyboards.** Android keyboards report most keys as "Unidentified"
  on `keydown`, including space and backspace. Never rely on `keydown` alone
  for a word break or submit. Read the input's value in the `input` event, as
  `_consumeWordBreaks` in `typing-practice.js` does. Text inputs get
  `autocorrect="off"`, `autocapitalize="off"`, `spellcheck=false`. A hidden
  input must be at least 1x1 px or some phones will not raise the keyboard.
- **Typed answers** go through `StudyUtils.answerMatches(typed, answer)`,
  which forgives case, punctuation, a leading "the" and one typo (two for long
  answers). Do not write a new matcher.
- **Text selection features** (the highlighter) must coexist with the
  tap-to-define `.tb-vocab` spans and Read Aloud. Wrap text nodes only; never
  change a section's `textContent`, because Read Aloud and the highlighter
  both work by character offset.
- **Progress sync.** Progress saves to localStorage and syncs to Supabase.
  `ProgressManager.mergeActivityData` decides how two devices combine. Any new
  progress field that a student builds up over time (highlights, sections
  read) needs a merge rule there, or the last device to save wins.
- **Harder modes** keep a separate best score (`bestChallengeScore`) so the
  classic best stays comparable, and record mastery the same way.
- **Feedback.** Bug reports carry the browser and screen size. Ask which
  device when a report says "on my phone".

## Testing

- Node unit tests: `node study-tools/engine/tools/<name>.test.js`.
- Content check: `node study-tools/engine/tools/unit-content-check.js`.
- Browser smoke tests: serve `study-tools/` with `python3 -m http.server 8765`
  (start it as a background job and stop it by job, not with `pkill -f`,
  which can kill the calling shell), then drive Playwright (preinstalled) to
  `http://127.0.0.1:8765/engine/index.html?unit=<id>#<activity-id>`. Before
  load, set `sessionStorage['teacher-unlock']='true'` (unlocks every category)
  and `localStorage['how-to-study-seen']='1'`. Click
  `button.welcome-guest-link` to skip sign-in. The textbook asks for a reading
  level on first visit (`.tb-level-card`); typing practice needs a passage
  picked (`.typing-pill`). Fail the test on any page error.
- Phone behavior cannot be fully emulated. Simulate Android input by
  dispatching `keydown` with `key: 'Unidentified'` then setting the value and
  firing `input`; still ask the teacher to try a real phone after deploy.

## Handling student feedback

1. Reproduce or locate the cause in code before proposing anything.
2. Write the plan doc; get decisions.
3. Ship each item as its own commit and changelog entry.
4. Draft a short reply per student: what they found, what changed, how to
   use it, and an invitation to report back. Credit good bug reports.

## Cloud session limits

The session proxy blocks pbs.org, pbslearningmedia.org, YouTube,
americanyawp.com and britannica.com. Find links with web search, say plainly
that they were not opened, and leave verification to the teacher.
