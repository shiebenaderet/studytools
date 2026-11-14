<div align="center">

# 🍎 Teacher Guide

### Make Your Own Study Tool — No Coding Required

Fork this project, swap in your content, and give your students a free study tool with flashcards, quizzes, games, and more.

**What you need:** A GitHub account (free) and your content ready to go.

</div>

---

## 📋 Table of Contents

| Step | What You'll Do |
|------|---------------|
| [1. Fork the Repository](#-1-fork-the-repository) | Get your own copy of the project |
| [2. Run the Setup Script](#-2-run-the-setup-script) | Remove the example content and start fresh |
| [3. Enable GitHub Pages](#-3-enable-github-pages) | Make your site live on the internet |
| [4. Understand the Structure](#-4-understand-the-structure) | Learn what goes where |
| [5. Edit Your Unit Config](#-5-edit-your-unit-config) | Add your vocabulary, questions, and content |
| [6. Using AI to Help You](#-6-using-ai-to-help-you) | Let AI build your config.json for you |
| [7. Considerations for Teachers](#-7-considerations-for-teachers) | Quality checklist for AI-generated content |
| [8. Config Reference](#-8-config-reference) | Full list of activities and fields |
| [9. Set Up Student Syncing](#-9-set-up-student-syncing-optional) | Optional: leaderboards and cross-device progress |
| [10. Tips & FAQ](#-10-tips--faq) | Common questions and troubleshooting |

---

## 🍴 1. Fork the Repository

1. Go to the repository page on GitHub
2. Click the **Fork** button in the top right
3. Keep the default settings and click **Create fork**
4. You now have your own copy of the project

---

## 🧹 2. Run the Setup Script

After forking, you need to remove the example content so you start with a clean slate. The setup script does this automatically.

### Option A: Run it from your computer (recommended)

If you have a Mac or Linux computer, open Terminal and run:

```bash
git clone https://github.com/YOUR-USERNAME/studytools.git
cd studytools
./setup.sh
git add -A && git commit -m "Remove example content, start fresh"
git push
```

Replace `YOUR-USERNAME` with your GitHub username.

### Option B: Do it manually on GitHub.com

If you don't have Terminal access, you can do this entirely through GitHub's web interface:

1. **Delete the example unit folder:** Navigate to `study-tools/units/early-republic/`, click the `...` menu on any file, and select "Delete directory"
2. **Edit `study-tools/units/units.json`** — replace the contents with:
```json
{
    "units": []
}
```
3. **Edit `study-tools/engine/js/core/supabase-config.js`** — replace the contents with:
```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

That's it — the engine, styles, and app structure all stay intact. You just removed the example content.

---

## 🌐 3. Enable GitHub Pages

This makes your study tool live on the internet — for free.

1. In your forked repo, go to **Settings** > **Pages**
2. Under "Source," select **Deploy from a branch**
3. Set the branch to **main** and folder to **/ (root)**
4. Click **Save**
5. After a minute or two, your site will be live at:

```
https://YOUR-USERNAME.github.io/studytools/study-tools/?unit=your-unit-id
```

---

## 🗂️ 4. Understand the Structure

> **You only need to edit ONE file** to customize the content.

```
study-tools/units/YOUR-UNIT/config.json
```

That's it. This single file contains all your vocabulary, questions, timeline events, typing passages, and theme settings. The engine reads this file and builds everything automatically.

| Folder | What it does | Do you edit it? |
|--------|-------------|:-:|
| `study-tools/engine/` | The app itself | No |
| `study-tools/units/` | **Your content** | **Yes** |
| `study-tools/dashboard/` | Teacher dashboard | No |
| `docs/` | Documentation | No |

---

## ✏️ 5. Edit Your Unit Config

### Create your first unit

1. Create a new folder: `study-tools/units/your-unit-id/`
   - Use lowercase letters and dashes (e.g., `civil-war`, `biology-ch5`, `spanish-1`)
2. Create a `config.json` file inside it (use the template below)
3. Edit `study-tools/units/units.json` to register your unit:

```json
{
    "units": [
        {
            "id": "your-unit-id",
            "title": "Your Unit Title",
            "path": "units/your-unit-id/config.json"
        }
    ]
}
```

4. Your unit will be live at: `https://YOUR-USERNAME.github.io/studytools/study-tools/?unit=your-unit-id`

### Minimum config.json to get started

This is enough for flashcards, a practice test, fill-in-the-blank, Wordle, and Hangman to all work:

```json
{
    "unit": {
        "id": "your-unit-id",
        "title": "My Study Tool",
        "subtitle": "Study for your upcoming test!",
        "essentialQuestion": "What is the big question students should think about?",
        "theme": {
            "primary": "#1669C5",
            "secondary": "#1F90ED",
            "accent": "#f59e0b"
        }
    },
    "activities": [
        "flashcards",
        "practice-test",
        "fill-in-blank",
        "wordle",
        "hangman"
    ],
    "vocabulary": [
        {
            "term": "Photosynthesis",
            "definition": "The process by which plants convert sunlight into energy",
            "simpleExplanation": "Plants eat sunlight! They take in light and turn it into food so they can grow.",
            "example": "A leaf turning green in spring is using photosynthesis to make energy",
            "category": "Plant Biology"
        }
    ],
    "practiceQuestions": [
        {
            "question": "What do plants need for photosynthesis?",
            "options": ["Darkness", "Sunlight", "Music", "Wind"],
            "correct": 1,
            "explanation": "Plants need sunlight as the energy source for photosynthesis.",
            "topic": "Plant Biology"
        }
    ]
}
```

---

## 🤖 6. Using AI to Help You

This is the fastest way to build your content. Use any AI assistant — Claude, ChatGPT, Copilot, etc.

### How to start

1. Open your `config.json` file
2. Share it with your AI assistant (paste it in, or use Claude Code)
3. Tell it what you want

### Copy-paste prompts

<details>
<summary><strong>Create vocabulary from scratch</strong></summary>

> Here are my vocabulary terms for a unit on [your topic]. Create a vocabulary array in the same JSON format as this config.json. Each term needs: term, definition, simpleExplanation (written for [grade level] students), example, and category. Here are my terms: [paste your term list]

</details>

<details>
<summary><strong>Generate practice questions</strong></summary>

> Using the vocabulary I just gave you, create 20 multiple choice practice questions in the same JSON format. Each question needs 4 options, a correct answer index, an explanation, and a topic that matches one of the vocabulary categories. Make sure the answer choices are all similar in length and style so students can't guess by picking the longest or most detailed answer.

</details>

<details>
<summary><strong>Add typing passages</strong></summary>

> Write a 200-300 word typing passage for each category in my vocabulary. Each passage should be written at a [grade level] reading level and cover the key ideas from that category's terms.

</details>

<details>
<summary><strong>Generate fill-in-the-blank sentences</strong></summary>

> Create fill-in-the-blank sentences for each vocabulary term. The sentence should use the term naturally and help students understand the definition.

</details>

<details>
<summary><strong>Add timeline events</strong></summary>

> Create a timeline array with 10-15 key events for this unit. Each event needs a year, event name, and one-sentence description.

</details>

<details>
<summary><strong>Create short answer questions</strong></summary>

> Write 5 short answer questions that ask students to connect ideas across categories. Each needs a sampleAnswer, rubric with 4 bullet points, keyTerms array, and exemplar response.

</details>

<details>
<summary><strong>Draft Go Deeper links</strong></summary>

> For each vocabulary category in this config.json, suggest about six links for a `goDeeper` list, in the format shown in the Teacher Guide. Prefer short PBS or PBS LearningMedia clips (grades 6–8) first, then one Crash Course or TED-Ed video, the matching section of The American Yawp marked `"level": "challenge"`, and one or two Britannica Kids or Students articles. Include at least one link about people the textbook leaves out. For each link, tell me whether you actually opened it.

Then click every link yourself before students see them (see the Go Deeper checklist in section 7).

</details>

<details>
<summary><strong>Add images to vocabulary (dual coding)</strong></summary>

> For each vocabulary term, find a relevant public domain image from Wikimedia Commons. Download each image and save it to `study-tools/units/my-unit/images/vocab/` with a simple filename (e.g., `hamilton.jpg`). Then add an `imageUrl` field to each term like: `"imageUrl": "../units/my-unit/images/vocab/hamilton.jpg"`. Skip abstract concepts that don't have a natural visual.

Images show up on flashcards and in the Resource Library — this helps students learn through **dual coding** (pairing words with pictures).

</details>

### Tips for working with AI

- **Always share the existing config.json** so it matches the exact format
- **Review everything for accuracy** — AI can make factual mistakes
- **Ask it to fact-check itself** — "Review what you wrote and flag anything that might be inaccurate"
- **Iterate** — "Make the explanations more conversational" or "These questions are too easy"
- **Be specific about reading level** — "Write for 8th graders" or "Write for 5th graders"

---

## 🔍 7. Considerations for Teachers

When using AI to generate your content, here's a checklist of things to review before giving it to students. These are common issues that AI tends to get wrong or overlook.

### Multiple choice questions

- [ ] **Answer positions are randomized** — The app shuffles answer order automatically, but double-check that the `correct` index (0-3) points to the right answer in your original `options` array
- [ ] **All answer choices are similar length** — If the correct answer is always the longest or most detailed option, students will learn to guess by length instead of studying. Ask the AI: *"Make all answer options similar in length and detail"*
- [ ] **Wrong answers are plausible** — Options like "Pizza" or "SpongeBob" are obviously wrong and don't help students learn. Wrong answers should be things a student who didn't study might actually pick
- [ ] **No "All of the above" or "None of the above"** — These don't work well with randomized answer positions
- [ ] **Explanations teach, not just confirm** — The explanation should say *why* the answer is correct, not just "The correct answer is B"
- [ ] **Questions vary in difficulty** — Mix straightforward recall questions with questions that require applying or connecting ideas
- [ ] **No trick questions** — Questions should test knowledge, not reading comprehension of tricky wording

### Vocabulary

- [ ] **Definitions are accurate** — AI sometimes subtly changes definitions or oversimplifies to the point of being wrong. Cross-check key terms against your textbook
- [ ] **Simple explanations are actually simple** — Read them as if you're a student encountering this word for the first time. If the "simple" explanation uses other vocabulary words, it's not simple enough
- [ ] **Examples are relatable** — The best examples connect to things students already know or experience in their daily lives
- [ ] **Categories are meaningful** — Categories group related terms together. Don't let AI create too many categories (3-6 is ideal) or put unrelated terms in the same category
- [ ] **Who Am I clues don't give the answer away** — Run `node study-tools/engine/tools/unit-content-check.js my-unit`. The game blanks the term out of each clue, but an example can still name it another way (a nickname, an abbreviation)
- [ ] **Terms work for Wordle/Hangman** — Very long terms (3+ words) or terms with special characters don't work well in word games. If you have terms like "Checks and Balances," they'll still work in flashcards and quizzes but may be skipped by word games

### Fill-in-the-blank

- [ ] **Sentences don't give away the answer** — The sentence should help students understand the term, not make the answer obvious from context alone
- [ ] **Only one term fits each blank** — If multiple vocabulary terms could reasonably fill the blank, the question is too vague

### Timeline events

- [ ] **Dates are correct** — AI commonly gets historical dates wrong by a few years. Verify each one
- [ ] **Events are in the right order** — The timeline activity asks students to sort events chronologically, so the dates matter

### Short answer questions

- [ ] **The rubric matches the question** — Make sure the rubric bullet points actually address what the question asks
- [ ] **Key terms are relevant** — The `keyTerms` array should contain terms a good answer would naturally include
- [ ] **The exemplar response would score full marks** — Read the exemplar against your own rubric to make sure it hits every point

### Go Deeper links

- [ ] **Every link opens** — Click each one from a school device and from home. School filters often block YouTube; PBS and PBS LearningMedia usually get through
- [ ] **No login needed** — Britannica School may need a school login; Britannica Kids and Students articles usually do not. PBS full episodes can go behind a Passport login after their free window, so link short clips
- [ ] **You watched it** — AI-suggested video titles can be wrong or point to the wrong clip. Never publish a video you have not seen
- [ ] **Level is labeled honestly** — Mark college-level readings such as The American Yawp `"level": "challenge"`

### General quality checks

- [ ] **Read level is appropriate** — Ask AI to write for your specific grade level, then read it yourself. Would your struggling readers understand it?
- [ ] **Content is culturally sensitive** — Review examples and explanations for assumptions or stereotypes
- [ ] **No AI hallucinations** — AI sometimes invents plausible-sounding facts, quotes, or dates. If you're not sure about something, look it up
- [ ] **Quiz date is current** — If the unit has a `quizDate`, check it matches the day you are giving the quiz, especially after a schedule change
- [ ] **Consistent tone** — All explanations and examples should feel like they're written by the same person. Ask AI: *"Make the tone consistent — warm, encouraging, and conversational throughout"*

### Quick prompts for quality fixes

| Problem | Prompt to use |
|---------|--------------|
| Answer choices are different lengths | *"Rewrite all answer options to be similar in length (8-15 words each)"* |
| Wrong answers are too obvious | *"Make the wrong answers more plausible — things a student might actually pick"* |
| Definitions are too complex | *"Rewrite the definitions at a [grade] grade reading level"* |
| Explanations are too short | *"Expand each explanation to 2-3 sentences explaining WHY this is correct"* |
| Need to verify accuracy | *"Review everything you wrote and flag any facts, dates, or claims you're less than 95% confident about"* |
| Tone is inconsistent | *"Rewrite all simpleExplanations in a warm, conversational tone as if talking directly to a student"* |
| Too many easy questions | *"Add 5 harder questions that require students to apply or connect multiple concepts"* |

---

## 📖 8. Config Reference

### Available activities

Add any of these to your `activities` array:

#### 📖 Study Activities
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `learn-mode` | Guided study sessions with adaptive depth, an ungraded warm-up before the lesson (with an "I don't know yet" button) and a check after it, reflection prompts, and Wiki Writer bonus. A reflection asks for writing only about a term the student just answered a question on correctly, and shows that term's definition. 1.5x points, 30-min cap. | `vocabulary`, `practiceQuestions`, `fillInBlankSentences`, textbook.json (optional, for Key Idea cards) |
| `textbook` | Leveled chapters with vocab pop-ups, Read Aloud, Quick Checks, a highlighter, and end-of-chapter Go Deeper links | `textbook.json` (one segment per vocabulary category), `goDeeper` (optional) |
| `flashcards` | Spaced repetition flashcards | `vocabulary` |
| `resources` | Searchable vocabulary reference with Go Deeper links per category | `vocabulary`, `goDeeper` (optional) |
| `typing-practice` | Typing passages + per-term snippets; works with phone keyboards | `vocabulary` (with `typingSnippet`), `typingPassages` |
| `source-analysis` | Primary source analysis (SIFT method) | Sources in `source-analysis.js` |
| `how-to-study` | Interactive study strategies with quiz | Built-in (no config needed) |

#### 📝 Practice Activities
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `practice-test` | Multiple choice quiz, 10 questions a sitting. A question tagged `"tier": "extra"` is held back until the student has answered every core question in their open chapters right once; untagged questions are core. Learn Mode, Quiz Race and Tower Defense follow the same rule. Keep at least 4 core questions per chapter. | `practiceQuestions` |
| `fill-in-blank` | Complete sentences with terms, from a word bank or by typing. Typed answers forgive case, hyphens, spacing, a few typos and digits for number words ("3/5 Compromise"), but never accept a different term from the unit. Write the blank as three or more underscores. | `fillInBlankSentences` |
| `short-answer` | Open-ended response with rubric | `shortAnswerQuestions` |
| `timeline` | Order events chronologically | `timelineEvents` |
| `power-sort` | Tap each power or job into the branch or level of government that holds it, with an explanation after every answer | `powerSorts` |

#### 🎮 Games
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `wordle` | Guess the term in 6 tries. Uses every one-word term of 4 to 12 letters in the student's open chapters: vocabulary of any tier, plus the textbook's one-word key terms. Plays the whole list before a word repeats. | `vocabulary`, textbook `keyTerms` (optional) |
| `hangman` | Classic word guessing | `vocabulary` |
| `flip-match` | Memory matching (terms to definitions) | `vocabulary` |
| `term-catcher` | Catch the falling correct term | `vocabulary` |
| `lightning-round` | 60-second speed quiz | `practiceQuestions` |
| `crossword` | Auto-generated crossword | `vocabulary` |
| `quiz-race` | Timed quiz race | `practiceQuestions` |
| `tower-defense` | 3D tower defense (desktop only) | `vocabulary` |
| `sketch-match` | Draw/identify vocabulary images | `vocabulary` (with `imageUrl`) |
| `who-am-i` | Guess the term from progressive clues; Challenge mode is typed answers over every term | `vocabulary` (at least 6 must-know terms) |
| `sort-it-out` | Sort terms into their categories | `vocabulary` (2+ categories) |
| `four-corners` | Find the term that does not belong | `vocabulary` (2+ categories) |
| `map-quiz` | Click-on-the-map geography quiz | Custom (see source) |

### Vocabulary fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `term` | Yes | The vocabulary word |
| `definition` | Yes | Short definition |
| `simpleExplanation` | | Longer, student-friendly explanation |
| `example` | | A sentence using the term in context. Also the first Who Am I clue; the term is blanked out automatically |
| `category` | | Groups terms for mastery gating (order matters — first category unlocks first) |
| `typingSnippet` | | 2-3 sentence passage for typing practice per term |
| `imageUrl` | | Image shown on flashcards and resources (use local path, see below) |
| `wikiUrl` | | Link to Wikipedia article for the Resources page |
| `simpleWikiUrl` | | Override for Simple Wikipedia link (use when auto-generated link leads to nonexistent page) |

### Quiz date countdown (optional)

Add `quizDate` (and, if you like, `quizLabel`) inside the `unit` block to show a small note under the essential question on the unit's home screen, such as **Quiz: Thu, Nov 12 · 30 days to go**:

```json
"unit": {
    "id": "revolution",
    "quizDate": "2026-11-12",
    "quizLabel": "Quiz",
    ...
}
```

| Field | Required | Description |
|-------|:--------:|-------------|
| `quizDate` | | Quiz or test day, `YYYY-MM-DD`, in the students' local time |
| `quizLabel` | | Word shown before the date. Defaults to `Quiz`; use `Unit Test`, `Test`, etc. |

- The note counts down in days, says "tomorrow" the day before and "today. Good luck!" on the day, and turns your theme's accent color in the last three days.
- It disappears on its own the day after the quiz, and it is hidden while a student is inside an activity.
- If the quiz moves, change the date and push; students see the new date the next time they open the unit.
- Leave `quizDate` out and nothing is shown.

### Scheduled category unlocks (optional)

For multi-week units, you can set calendar-based unlock dates so each category opens on a chosen day regardless of whether students have mastered the previous one. This prevents students who fall behind in week 1 from being locked out of week 2+ content.

Add a top-level `categorySchedule` block to your unit's `config.json`:

```json
"categorySchedule": {
  "Worlds of North & South": "2026-05-10",
  "African Americans at Mid-Century": "2026-05-17",
  "A Dividing Nation": "2026-05-24",
  "The Civil War": "2026-05-31"
}
```

- Keys must exactly match the `category` field on your vocabulary items.
- Dates use `YYYY-MM-DD` format and unlock at local midnight on that day.
- A category with no entry has no date floor — mastery is the only way to unlock it.
- Omitting the `categorySchedule` block entirely keeps the original mastery-only behavior.

Mastery still works as an accelerator: a fast student who masters category 1 will unlock category 2 immediately, even if its scheduled date is still in the future.

The teacher dashboard's **Setup** tab has a **Schedule** section that shows each category's status and provides an "Unlock now" button that generates a JSON snippet you can paste into `config.json` (then commit + push) to open a category ahead of schedule.

### Go Deeper links (optional)

Strong readers run out of textbook before they run out of curiosity. A top-level `goDeeper` list in `config.json` adds curated links, grouped by vocabulary category, in two places: a "Go deeper" row at the top of each category in the Resource Library, and a "Keep going" box at the end of each textbook chapter.

```json
"goDeeper": [
  {
    "category": "Causes of Unrest",
    "type": "video",
    "title": "Taxes & Smuggling: Prelude to Revolution",
    "source": "Crash Course US History #6",
    "minutes": 12,
    "url": "https://www.youtube.com/watch?v=Eytc9ZaNWyc"
  },
  {
    "category": "Causes of Unrest",
    "type": "reading",
    "level": "challenge",
    "title": "The Origins of the American Revolution",
    "source": "The American Yawp, ch. 5",
    "url": "https://www.americanyawp.com/text/05-the-american-revolution/"
  }
]
```

- `category` must exactly match a vocabulary `category`.
- `type` is `video`, `reading`, or `reference` and picks the chip's icon and color.
- `level: "challenge"` tags a link as challenge reading (use it for college-level texts such as The American Yawp).
- `source` and `minutes` are optional and show under the title.
- Links open in a new tab. Nothing is embedded, so no third-party player or script loads on your site.
- Pick videos you have watched. YouTube is blocked on some school devices; a link that does not open at school still works at home.

### Key terms, Word colors and pronunciation guides (optional)

**Key terms** are new words a section uses that are not tested vocabulary, such as *Congress*, *bill* or a person's name. List two to four per section:

```json
"keyTerms": [
  { "term": "Congress", "pos": "noun", "note": "The group of delegates from the states that made decisions for the whole country." },
  { "term": "approved", "pos": "verb", "note": "Agreed to something in an official way, often by a vote." }
]
```

- The textbook underlines a key term the **first time** it appears in the section, at every reading level and in Read More. Tapping it shows the note. Key terms never appear in flashcards, games or quizzes.
- Write `term` the way it appears in the text ("approved", not "approve"). A plural ending is matched for you. A key term cannot repeat a vocabulary word.
- `pos` is `noun`, `verb`, `adjective` or `adverb`. Add `"pos"` to each vocabulary word in `config.json` too.

**Word colors** is a switch at the top of the textbook, off until a student turns it on, and remembered on that device. When it is on, the first appearance of each word the section teaches (its own `vocabTerms` and `keyTerms`) takes its part-of-speech color: noun red, verb green, adjective blue, adverb orange. Each part of speech also has its own underline (solid, dashed, dotted, double), so the code works for students who cannot tell red from green, and the word's card names its part of speech. Keep vocabulary plus key terms to about 7 per section; the checker warns above 8. The switch appears only when a unit has `pos` tags.

**Pronunciation guides** live in one list at the top of `textbook.json`:

```json
"pronunciations": { "Nisqually": "nis-KWAH-lee", "bicameral": "by-KAM-er-ul" }
```

Write the stressed syllable in capitals. At the Quick and Clear levels the guide prints in parentheses after the word's first appearance in a section; at every level it shows in the word's card as "Say it". A vocabulary word shows its guide only in the section that teaches it. The guide is not part of the reading's text, so Listen does not read it aloud and highlights are not affected. Check every guide yourself, above all the names of Native nations; ask the tribe's own website or language program when unsure.

### Primary Source quote boxes (optional)

A section can show one quotation in a **Primary Source** box under the reading. It appears at every reading level and is never required reading.

```json
"primarySource": {
  "text": "When a broad table is to be made, and the edges of planks do not fit, the artist takes a little from both, and makes a good joint.",
  "speaker": "Benjamin Franklin",
  "attribution": "Benjamin Franklin, speech at the Constitutional Convention, June 30, 1787, from James Madison's notes",
  "means": "When a builder makes a wide table and two boards do not fit together, he trims a little off each one so they join well.",
  "sourceName": "The Avalon Project, Yale Law School",
  "sourceUrl": "https://avalon.law.yale.edu/18th_century/debates_630.asp",
  "image": { "src": "../units/my-unit/images/portraits/benjamin-franklin.jpg", "credit": "Joseph Siffred Duplessis, The Metropolitan Museum of Art" }
}
```

- `text` is the exact wording the source prints, old spelling and all. Check it against the page at `sourceUrl`.
- `sourceUrl` opens in a new tab as "Read the source". Use a library, archive, university or court site, never a quote site.
- `means` restates the quotation in plain words. It shows at Quick and Clear only.
- `image` is a public-domain portrait stored in the unit's `images/portraits` folder, about 240 px wide, with a `credit`. Leave it out when no free portrait exists; the box then shows the name alone.
- A list of these objects shows several boxes.

### Section pictures

A textbook section can carry one picture in `image`:

```json
"image": {
  "src": "../units/my-unit/images/treaty-page.jpg",
  "full": "../units/my-unit/images/treaty-page-large.jpg",
  "caption": "What the picture shows, when it was made and by whom.",
  "credit": "National Archives",
  "float": "right"
}
```

- Clicking or tapping the picture opens it large over the page, with its caption. Clicking again, the X, or Escape closes it.
- `full` is optional: a bigger file (about 1800 px wide) that loads only when the picture is enlarged. Use it for documents and maps a student should be able to read. Without it, the enlarged view shows `src`.
- Keep `src` about 900 px wide. `float` is `right` or `left`; leave it out for a full-width picture.

### A written question under a reading (optional)

A textbook section can end with one optional written question:

```json
"prompt": { "label": "Tell Mr. B", "question": "Choose one check from the reading, such as the veto. Explain how it keeps one branch from having too much power." }
```

- It shows as a box under the brief reading, above Mark as Read, and is the same at every reading level. Write it so it can be answered from the brief reading alone.
- It is optional for the student: it never blocks Mark as Read or the terms from unlocking, and it earns no points.
- The answer is saved on the device as the student types. **Send** puts it in the dashboard's **Responses** tab with the **Reading** label. A guest's answer stays on the device.
- Use it sparingly: Unit 3 has one per chapter, on the chapter's last section. Do not repeat the section's Read More question.
- The database must accept the `reading` kind of answer (`database/migrate-responses-reading.sql`, run once).

### Read More panels (optional)

A textbook section can carry a longer version of itself in `readMore`. It shows as a closed **Read More** panel under the section. Opening it never counts toward the reading gate, so the short text stays the only required reading. Listen and the highlighter follow whichever text is open, and Read More highlights are saved separately from the short text's.

```json
"readMore": {
  "content": {
    "standard": "<p>The longer version at the Full level...</p>",
    "simplified": "<p>Optional Clear version...</p>"
  }
}
```

`content` uses the same level ids as the section. A level without its own Read More text falls back to `standard`, except that Quick falls back to Clear (`simplified`) when there is one, and the panel tells the student which level it is written at.

**Read More Check (optional).** Add `check` to end the panel with a Quick Check and one written question that only the Read More text answers:

```json
"check": {
  "quickCheck": { "question": "...", "options": ["...", "...", "...", "..."], "correct": 1, "explanation": "..." },
  "prompt": { "label": "Tell Mr. B", "question": "Was Burke right to worry? Use one example." }
}
```

Paste is blocked in the answer box. A signed-in student's answer is sent to the `responses` table (see `database/migrate-responses.sql`), which only a teacher can read; a guest's answer stays on their device. A check is complete when the Quick Check is answered (right or wrong) and a sent answer has at least 20 words. Each completed check adds **15 points** to the student's leaderboard score, once per section; the consistency multiplier applies to them like any other points.

### Short answers sent to you

Short Answer and the Response Builder share one draft per question. The draft saves on the device as the student types. When the student taps **Save Response** (Short Answer) or **Save my response** (Response Builder's last step), a signed-in student's answer is sent to the same `responses` table with the source `short-answer`, keyed by question number. Sending again replaces the earlier answer; a featured mark you set stays.

Paste is blocked in both answer boxes, and a word count shows under each. The first time an answer of at least **20 words** reaches you, the student earns **20 points**, once per question. Editing or shortening the answer later never takes the points away. Guests keep their drafts on the device and earn no points.

A student who opens a game before writing any short answer sees one reminder per session to try writing one.

### Reading responses in the dashboard

The dashboard has six tabs: **Overview** (headline numbers and recent activity), **Students** (the student table; then, for each unit, who has started it in each class period, who has not, their averages and the activities they have opened; then vocab insights), **Leaderboard** (scores to approve, what students see, class standings and the replay), **Responses**, **Feedback**, and **Setup** (class codes and the schedule). The Class, Unit and date filters are hidden on Feedback and Setup, where they do nothing. The Unit filter opens on the current unit (the newest one whose `opens` date has arrived), so rankings show scores since that unit began; choose **All Units** to combine them.

Open the teacher dashboard and choose the **Responses** tab. Its Source filter also has **Wiki entries**, for Learn Mode's bonus writing. It lists every sent Short Answer, Response Builder and Read More Check answer with the student's name, class, word count and time. The Class, Unit and date filters at the top apply. Inside the tab, narrow to one source or one question, and click the star to mark a response as a good example; **Starred only** shows just those. A student who edits and resends an answer keeps your star. To remove one answer (a test, or something sent by mistake), click the trash icon on its card; the student's own copy stays on their device, so an answer they send again will reappear.

### Check a unit before it goes live

Run this from the repository root. It reports any category that does not line up between the vocabulary, the textbook and the schedule, any Who Am I clue that still gives its answer away, and any Go Deeper link that is malformed:

```
node study-tools/engine/tools/unit-content-check.js my-unit
```

### Check a unit's reading levels

A textbook can offer up to four reading levels: Quick, Clear, Full and Deep. `docs/READING-LEVELS.md` defines them. This command measures every section at each level it has and prints the grade and word count:

```
node study-tools/engine/tools/reading-levels-check.js my-unit
```

It reports an ERROR when a reading measures above its level's limit (Quick 5.0, Clear 7.5, Full 10.5), when the levels of one section do not step up from Quick to Deep, when a unit offers a level that a section has no text for, or when a level leaves out one of the section's `vocabTerms` (tap-to-define needs the exact word). A reading that fails is rewritten, not relabeled. Add `--read-more` to measure the Read More panels too.

### Learn Mode config fields

These optional fields customize Learn Mode behavior per unit:

| Field | Description |
|-------|-------------|
| `reflectionPrompts` | Array of reflection prompt strings. Use `{term}` as placeholder for the current term. If not set, generic prompts are used. |

### Theme fields

| Field | Description |
|-------|-------------|
| `theme.primary` | Primary color (buttons, headers) |
| `theme.secondary` | Secondary color |
| `theme.accent` | Accent color (highlights, badges) |
| `theme.bgDeep` | Dark mode background color (optional, for visual distinction between units) |
| `theme.bgCard` | Dark mode card background (optional) |
| `theme.bgElevated` | Dark mode elevated surface (optional) |
| `theme.bgSurface` | Dark mode surface color (optional) |

### Practice question fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `question` | Yes | The question text |
| `options` | Yes | Array of 4 answer choices |
| `correct` | Yes | Index of correct answer (0-3) |
| `explanation` | | Why the answer is correct |
| `topic` | | Category name — links to vocabulary categories for weakness tracking |

### Power Sort fields

`powerSorts` is a list of sorts. Each one is a short practice set with two to four bins.

```json
"powerSorts": [{
    "id": "branches",
    "title": "Which Branch?",
    "category": "Inside the Constitution",
    "prompt": "Which branch of the national government has this power?",
    "bins": [
        { "id": "legislative", "label": "Legislative", "hint": "Congress, Article I" },
        { "id": "executive", "label": "Executive", "hint": "President, Article II" },
        { "id": "judicial", "label": "Judicial", "hint": "Courts, Article III" }
    ],
    "items": [
        { "text": "Writes and passes laws", "bin": "legislative", "explanation": "Article I gives Congress the power to make laws." }
    ]
}]
```

| Field | Required | Description |
|-------|:--------:|-------------|
| `id` | Yes | Short name, used for the student's best score. Keep it stable once students start |
| `title` | Yes | Shown on the sort's card |
| `category` | | A vocabulary category; the sort stays locked until that category unlocks |
| `prompt` | | The question above each item |
| `bins` | Yes | Two to four bins, each with an `id`, a `label` and an optional `hint` |
| `items` | Yes | Each has `text`, the `bin` id it belongs in, and an `explanation` shown after the student answers |

Items come in a random order and there is no timer. Missed items are listed with their explanations at the end, and **Practice the ones I missed** replays only those. The best score for each sort syncs across devices.

### Theme colors

Pick colors that match your subject:

```json
"theme": {
    "primary": "#1669C5",
    "secondary": "#1F90ED",
    "accent": "#f59e0b"
}
```

| Color | What it controls |
|-------|-----------------|
| `primary` | Headers, buttons, main brand color |
| `secondary` | Lighter variation for accents |
| `accent` | Highlights, achievements, alerts |

### Welcome screen periods

The welcome screen has hardcoded period buttons (Period 1, 2, 4, 5). To change these for your school, edit `study-tools/engine/js/core/progress.js` — search for `var periods = [` and modify the labels and codes.

---

## ☁️ 9. Set Up Student Syncing (Optional)

Without Supabase, the study tool works perfectly — progress saves to each student's browser. But if you want:

- Progress that syncs across devices
- A leaderboard with class competition
- A teacher dashboard to see student progress
- The ability to edit/delete student profiles

You'll need a free [Supabase](https://supabase.com) account.

### Setup steps

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to the **SQL Editor** and run the schema from `study-tools/database/schema.sql`
4. Copy your project URL and anon key from **Settings** > **API**
5. Edit `study-tools/engine/js/core/supabase-config.js`:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

6. Create classes in Supabase for your periods (the `classes` table needs a `code` matching your period codes)

### Is it worth it?

| Situation | Recommendation |
|-----------|---------------|
| Just trying it out | Skip Supabase — everything works without it |
| Using it for a real class | Set it up — the leaderboard motivates students |

---

## ❓ 10. Tips & FAQ

<details>
<summary><strong>How do I test changes before my students see them?</strong></summary>

Edit files on a branch other than `main`. GitHub Pages only deploys from `main`, so your changes won't be live until you merge.

</details>

<details>
<summary><strong>How do I show students when the quiz is?</strong></summary>

Add `"quizDate": "YYYY-MM-DD"` to the `unit` block of `config.json`. A small "Quiz: date · N days to go" note appears under the essential question and goes away the day after. See [Quiz date countdown](#quiz-date-countdown-optional).

</details>

<details>
<summary><strong>What happens to student highlights if I edit the textbook?</strong></summary>

Highlights are saved per section and reading level, using each section's `id`. If you change a section's wording, highlights on the changed words are dropped and the rest stay. If you rename a section `id`, every highlight and "read" checkmark in that section is lost, so keep ids the same once students have started.

</details>

<details>
<summary><strong>Can I use this for subjects other than history?</strong></summary>

Absolutely. The platform is subject-agnostic. Replace the vocabulary, questions, and content in your config.json with any subject matter.

</details>

<details>
<summary><strong>How do I change the welcome screen message?</strong></summary>

Edit the `showWelcomeScreen` function in `study-tools/engine/js/core/progress.js`.

</details>

<details>
<summary><strong>How do I add images for source analysis?</strong></summary>

1. Put images in `study-tools/units/your-unit/images/sources/`
2. Reference them by filename in your source analysis data

</details>

<details>
<summary><strong>My students see an old version</strong></summary>

GitHub Pages caches aggressively. Tell students to hard-refresh:
- **Windows/Chromebook:** `Ctrl+Shift+R`
- **Mac:** `Cmd+Shift+R`

</details>

<details>
<summary><strong>Can multiple units exist at the same time?</strong></summary>

Yes! Each unit has its own URL: `?unit=unit-id`. Link students directly to their unit.

</details>

<details>
<summary><strong>I broke something</strong></summary>

Since it's Git, you can always revert. Go to your commit history on GitHub and revert the commit that broke things. Or ask your AI assistant: "I made a change that broke the site, here's what I changed, help me fix it."

</details>

---

<div align="center">

### Need Help?

Open an issue on GitHub or ask an AI assistant — paste your config.json and describe what's wrong.

</div>
