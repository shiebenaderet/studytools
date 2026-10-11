# Student feedback, Oct 10 (Revolution unit, v8.55.25): plan

> **Status (2026-10-11):** all four items shipped in 8.55.26 to 8.55.31 and
> merged to `main`. The teacher vetted the Revolution Go Deeper links; four
> were replaced (results at the end; recheck 23 and 24). Still open: a
> real-phone test of Typing Practice,
> and Go Deeper links for the Civil War, Westward Expansion and Early Republic
> units before they open.

Four pieces of feedback came in on Oct 10. This document works through each one
against the code as it stands today, proposes an approach, sizes it, and lists
the decisions the teacher needs to make before anything major is built.

Recommended order:

1. Typing Practice on phones (bug, small, affects every Android student)
2. Who Am I: close the clue leak (small) and add a Challenge mode (medium)
3. "Go Deeper" resources: curated videos, American Yawp, Britannica (medium, needs link curation)
4. Textbook highlighter (large, most design decisions, do last)

---

## 1. BUG: Typing Practice on a phone (Anderson A., period 1)

> "When I'm on phone it doesn't let you go back or do space and you can write
> any word instead of the word that you have to write."

### What the code does

Both typing modes (full passage and per-term snippet) in
`study-tools/engine/js/activities/typing-practice.js` use a hidden `<input>`
and submit the current word from a `keydown` handler:

```js
input.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        self._submitWord(input);
    }
});
```

The live character-by-character rendering runs from the `input` event, which
does fire on phones.

### Root cause

Android virtual keyboards (Gboard, Samsung Keyboard) do not report real keys on
`keydown`. Nearly every key, including space and backspace, arrives as
`e.key === 'Unidentified'` with `keyCode 229` because the keyboard is in
composition mode. So on Android:

- Space never reaches the submit handler. The space character lands in the
  input value instead, and the student keeps typing the next word into the
  same buffer. The word is never checked. That is the "you can write any word"
  symptom.
- Backspace works at the input level, but because the buffer already contains
  a space and the next word, what the student sees on screen (extra red
  characters past the end of the word) looks broken. That is the "doesn't let
  you go back" symptom.

iOS Safari reports space correctly on `keydown`, so this is most likely an
Android phone. The feedback form does not record the device, so we cannot
confirm.

Secondary mobile problems in the same code:

- No `autocorrect="off"` or `inputmode`. Predictive text can swap a word after
  the student types it.
- The hidden input is `width: 0; height: 0`. Some mobile browsers refuse to
  raise the keyboard for a zero-size input. Anderson could type, so it worked
  on their phone, but it is fragile.

### Proposed fix (small, low risk)

1. Detect the space in the `input` event rather than only on `keydown`. If the
   value contains a space, submit everything before the first space and keep
   whatever follows as the start of the next word. Desktop keeps the existing
   `keydown` path, where `preventDefault` stops the space from reaching the
   value, so both platforms converge on `_submitWord`.
2. Keep Enter on `keydown` (it still fires on phones) and also treat a trailing
   newline in the value as a submit, for keyboards that send it.
3. Add `autocorrect="off"`, `inputmode="text"`, and `enterkeyhint="next"` to
   the input, alongside the existing `autocapitalize="off"` and
   `spellcheck=false`.
4. Change `.typing-hidden-input` from 0x0 to a visually hidden 1x1 clip so
   every mobile browser raises the keyboard.
5. While there: record the browser's platform in bug reports
   (`navigator.userAgent`, trimmed) in `feedback.js`, so the next phone bug
   tells us iOS or Android.

Files: `typing-practice.js` (both `_render*` input blocks and `_submitWord`),
`styles.css` (`.typing-hidden-input`), `feedback.js`.

### How we verify

- Desktop: space and Enter still submit, backspace still works, no double
  submit.
- Phone: the test that matters. Chrome DevTools device mode does not emulate
  Android IME composition, so test on a real Android phone (and an iPhone)
  from a deployed branch. Type a word, hit space, confirm it is marked and the
  cursor moves on; mistype, backspace, retype.
- Ask Anderson to retry after the patch ships.

Ships as a patch version with a CHANGELOG entry under "Fixed".

---

## 2. SUGGESTION: A harder "Who Am I?" (Tiffany N., period 5)

### What the code does

`study-tools/engine/js/activities/who-am-i.js`: 10 rounds, 4 multiple-choice
buttons, four progressive clues worth 5/4/3/2 points (max 50). Clues come
straight from vocab fields:

| Clue | Source |
|------|--------|
| 1 "Quick Hint" | `example` (or first sentence of `simpleExplanation`) |
| 2 "Explanation" | `simpleExplanation` |
| 3 "Category + Keyword" | category name + first 8 words of `definition` |
| 4 "Full Definition" | `definition` |

Terms and distractors come from the unlocked must-know pool
(`MasteryManager.getMustKnowVocabulary`). Revolution has 11 must-know, 11
encounter, 1 bonus term.

### Why it is easy (two real findings)

**Finding A: the clues give away the answer.** The `example` field was written
as a flashcard example, so it uses the term. In the Revolution unit, 20 of 23
examples contain the answer word for word ("...found the *Proclamation of 1763*
had slammed the door shut"). 11 of 23 `simpleExplanation` texts do too. So
Clue 1, the 5-point clue, usually names the answer. This is a defect in
normal mode, not just a "hard mode" wish.

**Finding B: multiple choice with a small pool.** With 11 must-know terms,
4 options per round, and distractors drawn across all categories, Clue 3
("From *The Declaration*...") often eliminates three options by itself. After
a couple of games the option buttons are familiar.

### Proposed approach

**Step 1 (small, do regardless): mask the term in clues.** In `_getClueText`,
replace any occurrence of the term (case-insensitive, also the term's
significant words, so "Proclamation" alone cannot leak "Proclamation of 1763")
with "___". Do the same for the distractor terms' names if they appear.
Apply in normal mode too. No config edits needed, works for every unit.

**Step 2 (medium): Challenge mode toggle on the start screen.** Rules:

- Type the answer instead of picking from buttons. Lenient match: ignore
  case, punctuation, leading "the"; accept an exact term or one that differs
  by a single character (no fuzzy-match helper exists in `utils.js` yet; add a
  small one and reuse it later for Fill-in-the-Blank).
- Draw from all unlocked tiers (must-know + encounter + bonus), 23 terms in
  Revolution instead of 11.
- Clue 3 becomes "Category + Keyword" with the keyword chosen from the
  definition minus the term, so it still helps without reading like the
  definition.
- Points 1.5x (matches the existing "analysis tier" multiplier the README
  describes). Store `bestChallengeScore` separately so the regular best score
  stays comparable. Who Am I does not post to the leaderboard today, so no
  leaderboard change is needed.
- Mastery recording stays the same (correct on clues 1-3 counts).

**Not recommended now:** a per-clue timer. It punishes slower readers more
than it rewards knowledge, and Tiffany asked for harder, not faster.

Files: `who-am-i.js`, a few lines in `utils.js`, `styles.css` for a text input
and toggle. README's Who Am I row.

### How we verify

- Script check across all four units: after masking, no clue text contains its
  own term.
- Play a normal game and a challenge game; the start screen remembers the last
  mode; results screen labels the mode.

---

## 3. SUGGESTION: More reading and study options (Anderson A., period 1)

> "...the games are lwk kinda boring because I already have a 101 streak in
> wordle and it got boring."

Anderson is a high achiever who has outgrown the games and wants content, not
more games. The teacher's idea: per-topic videos as a chip in Resources, plus
links into The American Yawp and Britannica.

### What exists today

- Resource Library (`resources.js`) shows every term with two chips, Simple
  Wiki and Wikipedia, built from `simpleWikiUrl`/`wikiUrl` on each vocab entry.
  The README still says it has YouTube links. It does not; a leftover
  `.res-link-youtube` style remains in `styles.css`, so a YouTube chip once
  existed and was removed (the reason is not in the history).
- `config.externalLinks` adds whole-tool cards (Colonial Unrest, Podcast
  Script Builder) to the activity picker. It is per unit, not per topic.
- The textbook already cites Yawp as its source and has one segment per
  category (4 in Revolution), each with 3 sections.
- The privacy page (tightened in 8.55.23) promises no third-party loads.
  **Embedding YouTube players would break that promise.** Links that open in
  a new tab do not.

### Proposed approach: "Go Deeper" per category, config-driven

Curate per category, not per term. Four categories times three or four links
is a manageable list for a teacher to vet; 23 per-term videos is not, and the
good videos cover topics, not single terms anyway.

Add to each unit's `config.json`:

```json
"goDeeper": [
  {
    "category": "Causes of Unrest",
    "type": "video",
    "title": "The Road to Revolution (11 min)",
    "source": "YouTube",
    "url": "https://www.youtube.com/watch?v=...",
    "level": "everyone"
  },
  {
    "category": "Causes of Unrest",
    "type": "reading",
    "title": "The Origins of the American Revolution",
    "source": "The American Yawp, ch. 5 sec. II",
    "url": "https://www.americanyawp.com/text/05-the-american-revolution/#II_The_Origins_of_the_American_Revolution",
    "level": "challenge"
  },
  {
    "category": "Causes of Unrest",
    "type": "reference",
    "title": "Stamp Act",
    "source": "Britannica Kids",
    "url": "https://kids.britannica.com/students/article/Stamp-Act/...",
    "level": "everyone"
  }
]
```

`type` picks the chip icon and color (video red, reading blue, reference
grey). `level` lets us label Yawp honestly: it is college-level prose, so it
gets a "Challenge reading" tag rather than being presented as the default.

Show it in two places:

1. **Resource Library:** a "Go Deeper" chip row at the top of each category
   section, above the term cards. Students already go there for links.
2. **Textbook:** a "Keep going" box at the end of each segment's last section,
   next to where the student finishes the chapter. This is where a bored
   strong reader actually is.

Optional (v2): a "Watched it / Read it" checkbox per link that saves to
progress, so the links count as study and the teacher dashboard can see who
went further. Cheap to add once the links exist; skip for v1.

Not doing: a YouTube search-link chip per term (ads, autoplay, unvetted
results, blocked on many school devices), and embedded players (privacy page).

### Curation questions for the teacher

- **Which video creators?** Candidates commonly used in 8th grade: Crash Course
  US History (fast, 12 min), Heimler's History, OverSimplified (long, humorous,
  cartoon violence), Khan Academy, Mr. Betts. The right pick depends on what
  the school's YouTube filter allows and the teacher's taste. The plan is for
  the teacher to pick one source per category; I can draft candidates with
  lengths for approval.
- **Britannica or Britannica Kids?** Britannica.com is free with ads.
  Britannica Kids (Students level fits 8th grade) needs a school subscription
  for some articles. Check what the district provides.
- **American Yawp sections.** Chapter 4 (Colonial Society) and chapter 5 (The
  American Revolution) map cleanly to the four Revolution categories. I can
  draft the section links.

Files: `config.json` per unit (`goDeeper`), `resources.js`, `textbook.js`,
`styles.css`, `validate-package.js` (accept the new key), `TEACHER-GUIDE.md`
(document it), README (fix the stale YouTube claim).

---

## 4. SUGGESTION: A highlighter for the textbook (Tiffany N., period 5)

### What the code does

`textbook.js` renders one section at a time: the section's HTML for the
current reading level is sanitized, vocab terms are wrapped in `.tb-vocab`
spans with tap-to-define popups, then set as `innerHTML` on `.tb-content`.
Read Aloud walks the same text nodes. Progress (sections read, quick checks,
reading level) is saved via `ProgressManager` to localStorage and synced to
Supabase.

### Design questions that need answers before building

1. **What gets stored.** Highlights have to survive re-rendering and the text
   differs per reading level, so a highlight is: unit, segment, section,
   reading level, start and end character offsets within the section's plain
   text, plus the highlighted snippet for sanity-checking after a content
   edit. If the textbook text is later revised, a highlight whose snippet no
   longer matches is dropped silently.
2. **Where it lives.** In the existing textbook progress object, so it rides
   the current localStorage + Supabase sync with no schema change. Caveat: the
   sync merge for the textbook is last-write-wins by timestamp, so highlights
   made on a Chromebook and then on a phone can clobber each other. Fine for
   v1 if we say so; a per-highlight merge is a v2 item.
3. **Interaction on phones.** Text selection on mobile is fiddly and the
   vocab spans already catch taps. Proposed: on `selectionchange`, if the
   selection is inside `.tb-content`, show a small floating "Highlight" button
   near the selection; tapping an existing highlight shows "Remove".
4. **Purpose.** Highlighting by itself is a weak study strategy (the site's
   own How to Study page says as much). To make it worth building, pair it
   with a "My highlights" panel in the sidebar that lists the student's
   highlights for the chapter, and a one-click "Send to Make Your Own Example"
   or copy-to-notes later. That turns highlights into something they review.

### Proposed scope if we go ahead

- v1: single color, add/remove, persisted per level, "My highlights" list per
  segment, works with Read Aloud and vocab popups.
- v2: colors or a note attached to a highlight; smarter cross-device merge.

Size: the largest of the four items (roughly 300 lines plus CSS) and the one
most likely to produce fiddly mobile bugs. Recommend doing it last and only
after the three items above have shipped.

---

## Decisions needed from the teacher

1. **Typing fix:** go ahead as a patch? (Recommended yes, no decisions needed.)
2. **Who Am I:** apply the clue masking to normal mode as well? (Recommended
   yes; it is a defect.) Typed answers in Challenge mode, or just harder
   multiple choice with 6 same-category options?
3. **Go Deeper:** per category (recommended) or per term? Which video source(s)?
   Does the district have Britannica Kids? Should I draft the Yawp and
   Britannica links for the Revolution unit for approval?
4. **Highlighter:** build v1 as scoped above, or park it until the others
   have shipped and students have reacted?

## Ship plan

Each item is its own commit and CHANGELOG entry, so a problem with one can be
reverted without the others. Order: 1, 2 (masking first, then Challenge mode),
3 (code first, links as a follow-up commit once approved), 4.


---

## Go Deeper links for the Revolution unit: vetting checklist (2026-10-11)

The PBS clips were added at the teacher's request, with Ken Burns' *The
American Revolution* (2025) and PBS LearningMedia preferred over YouTube
because PBS is usually reachable on school networks. The session proxy
blocked pbs.org, pbslearningmedia.org, YouTube, Britannica and the Yawp, so
every link below was confirmed from search results only. Nothing was opened.

Before students see them, check each link from a school device and from home:
it plays or opens, needs no login, and the content fits 8th grade. Remove or
replace a link by editing `goDeeper` in `study-tools/units/revolution/config.json`.

Teacher's results, 2026-10-11 (links as they stand after the fixes):

| # | Category | Link | Source | Result |
|---|---|---|---|---|
| 1 | Causes of Unrest | [How Land, Taxes and Rebellion Sparked the American Revolution](https://www.pbs.org/video/how-land-taxes-and-rebellion-sparked-the-american-revolution-rg7vcn/) | Ken Burns, The American Revolution (PBS) | Pass |
| 2 | Causes of Unrest | [Tea, Tar and Tyranny: How the Boston Tea Party Changed Everything](https://www.pbs.org/video/tea-tar-and-tyranny-how-the-boston-tea-party-changed-everything-o8bvmf/) | Ken Burns, The American Revolution (PBS) | Pass |
| 3 | Causes of Unrest | [Taxes & Smuggling: Prelude to Revolution](https://www.youtube.com/watch?v=Eytc9ZaNWyc) | Crash Course US History #6 | Pass |
| 4 | Causes of Unrest | [The Causes of the American Revolution](https://www.americanyawp.com/text/05-the-american-revolution/#III_The_Causes_of_the_American_Revolution) | The American Yawp, ch. 5 sec. III | Pass |
| 5 | Causes of Unrest | [Proclamation of 1763](https://kids.britannica.com/students/article/Proclamation-of-1763/631453) | Britannica Students | Pass |
| 6 | Causes of Unrest | [Intolerable Acts](https://kids.britannica.com/kids/article/Intolerable-Acts/601072) | Britannica Kids | Pass |
| 7 | Choosing Sides | [Patriot, Loyalist, Neutral: Three People, Three Choices](https://www.pbslearningmedia.org/resource/patriot-loyalist-neutral-perspective-video-gallery/the-american-revolution/) | PBS LearningMedia, grades 6–8 | Pass |
| 8 | Choosing Sides | [Dunmore's Proclamation: Black Americans in the Revolution](https://www.pbs.org/video/dunmores-proclamation-black-americans-in-the-revolution-s12xyy/) | Ken Burns, The American Revolution (PBS) | Pass |
| 9 | Choosing Sides | [The Franklins Choose Opposing Sides](https://www.pbs.org/video/franklins-choose-opposing-sides-revolution-pg11qh/) | Ken Burns, Benjamin Franklin (PBS) | Pass |
| 10 | Choosing Sides | [The War for Independence](https://www.americanyawp.com/text/05-the-american-revolution/#V_The_War_for_Independence) | The American Yawp, ch. 5 sec. V | Pass |
| 11 | Choosing Sides | [Patriots and Loyalists](https://kids.britannica.com/students/article/Patriots-and-Loyalists/703694) | Britannica Students | Pass |
| 12 | Choosing Sides | [Daughters of Liberty](https://kids.britannica.com/students/article/Daughters-of-Liberty/641827) | Britannica Students | Pass |
| 13 | The Declaration | [The Declaration of Independence & Birth of the United States](https://www.pbs.org/video/the-declaration-of-independence-birth-of-the-united-states-2bndcu/) | Ken Burns, The American Revolution (PBS) | Failed; replaced with Ken Burns "The Declaration of Independence & Birth of the United States" (teacher approved) |
| 14 | The Declaration | [The Meaning of the Declaration to Different Groups](https://www.pbs.org/video/the-meaning-of-the-declaration-to-different-groups-xtcgdz/) | Ken Burns, The American Revolution (PBS) | Pass |
| 15 | The Declaration | [What you might not know about the Declaration of Independence](https://ed.ted.com/lessons/what-you-might-not-know-about-the-declaration-of-independence-kenneth-c-davis) | TED-Ed, Kenneth C. Davis | Pass |
| 16 | The Declaration | [Declaration of Independence: A Transcription (full text)](https://www.archives.gov/founding-docs/declaration-transcript) | National Archives | Yawp Reader address failed; replaced with the National Archives transcription; pass |
| 17 | The Declaration | [Independence](https://www.americanyawp.com/text/05-the-american-revolution/#IV_Independence) | The American Yawp, ch. 5 sec. IV | Pass |
| 18 | The Declaration | [Declaration of Independence](https://kids.britannica.com/students/article/Declaration-of-Independence/273945) | Britannica Students | Pass |
| 19 | Research & Voices | [Voices of the Revolution: How the Film Used Letters and Diaries](https://www.pbs.org/video/inside-look-voices-of-the-revolution-v6yaic/) | Ken Burns, The American Revolution (PBS) | Pass |
| 20 | Research & Voices | [Liberty for Whom? Slavery, Protest and the Ideals of the Revolution](https://www.pbs.org/video/liberty-for-whom-slavery-protest-and-the-ideals-of-the-revolution-1gjg0d/) | Ken Burns, The American Revolution (PBS) | Pass |
| 21 | Research & Voices | [Black Soldiers in the Revolutionary War (interactive)](https://www.pbslearningmedia.org/resource/ush22-soc-blacksoldiers/black-soldiers-in-the-revolutionary-war-interactive-image/) | PBS LearningMedia, grades 6–8 | Pass |
| 22 | Research & Voices | [The Consequences of the American Revolution](https://www.americanyawp.com/text/05-the-american-revolution/#VI_The_Consequences_of_the_American_Revolution) | The American Yawp, ch. 5 sec. VI | Pass |
| 23 | Research & Voices | [Straight to the Source: Primary and Secondary Sources](https://www.pbslearningmedia.org/resource/ilwpt18-soc-ilprimsec/straight-to-the-source-primary-and-secondary-sources/) | PBS Wisconsin, PBS LearningMedia | Britannica Students article would not load; replaced with PBS Wisconsin "Straight to the Source". Recheck |
| 24 | Research & Voices | [Primary Sources: A Guide for Middle and High School Students](https://guides.loc.gov/student-resources/primary-sources) | Library of Congress | Britannica Students article would not load; replaced with the Library of Congress student guide. Recheck |

Lessons for the next unit: PBS pages can fail once and load on a retry (14
did); Yawp Reader addresses can move during the second-edition
reorganization; some Britannica Students articles need a login even from
home, so check each one rather than the site as a whole.
