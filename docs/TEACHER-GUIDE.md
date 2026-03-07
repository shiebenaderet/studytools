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
| [2. Enable GitHub Pages](#-2-enable-github-pages) | Make your site live on the internet |
| [3. Understand the Structure](#-3-understand-the-structure) | Learn what goes where |
| [4. Edit Your Unit Config](#-4-edit-your-unit-config) | Add your vocabulary, questions, and content |
| [5. Using AI to Help You](#-5-using-ai-to-help-you) | Let AI build your config.json for you |
| [6. Config Reference](#-6-config-reference) | Full list of activities and fields |
| [7. Set Up Student Syncing](#-7-set-up-student-syncing-optional) | Optional: leaderboards and cross-device progress |
| [8. Tips & FAQ](#-8-tips--faq) | Common questions and troubleshooting |

---

## 🍴 1. Fork the Repository

1. Go to the repository page on GitHub
2. Click the **Fork** button in the top right
3. Keep the default settings and click **Create fork**
4. You now have your own copy of the project

---

## 🌐 2. Enable GitHub Pages

This makes your study tool live on the internet — for free.

1. In your forked repo, go to **Settings** > **Pages**
2. Under "Source," select **Deploy from a branch**
3. Set the branch to **main** and folder to **/ (root)**
4. Click **Save**
5. After a minute or two, your site will be live at:

```
https://YOUR-USERNAME.github.io/studytools/study-tools/?unit=early-republic
```

---

## 🗂️ 3. Understand the Structure

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

The existing unit at `study-tools/units/early-republic/` is a complete example you can reference.

---

## ✏️ 4. Edit Your Unit Config

### Option A: Modify the existing unit

The simplest path — edit `study-tools/units/early-republic/config.json` directly and replace the content with your own.

### Option B: Create a new unit

1. Create a new folder: `study-tools/units/your-unit-id/`
2. Copy `config.json` from the early-republic folder into your new folder
3. Edit `study-tools/units/units.json` to add your unit:

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

## 🤖 5. Using AI to Help You

This is the fastest way to build your content. Use any AI assistant — Claude, ChatGPT, Copilot, etc.

### How to start

1. Open your `config.json` file
2. Share it with your AI assistant (paste it in, or use Claude Code)
3. Tell it what you want

### Copy-paste prompts

<details>
<summary><strong>Create vocabulary from scratch</strong></summary>

> Here are my vocabulary terms for a unit on [your topic]. Create a vocabulary array in the same JSON format as the early-republic config.json. Each term needs: term, definition, simpleExplanation (written for 8th graders), example, and category. Here are my terms: [paste your term list]

</details>

<details>
<summary><strong>Generate practice questions</strong></summary>

> Using the vocabulary I just gave you, create 20 multiple choice practice questions in the same JSON format. Each question needs 4 options, a correct answer index, an explanation, and a topic that matches one of the vocabulary categories.

</details>

<details>
<summary><strong>Add typing passages</strong></summary>

> Write a 200-300 word typing passage for each category in my vocabulary. Each passage should be written at an 8th grade reading level and cover the key ideas from that category's terms.

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

### Tips for working with AI

- **Always share the existing config.json** so it matches the exact format
- **Review everything for accuracy** — AI can make factual mistakes
- **Ask it to fact-check itself** — "Review what you wrote and flag anything that might be inaccurate"
- **Iterate** — "Make the explanations more conversational" or "These questions are too easy"
- **Be specific about reading level** — "Write for 8th graders" or "Write for 5th graders"

---

## 📖 6. Config Reference

### Available activities

Add any of these to your `activities` array:

#### 📖 Study Activities
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `flashcards` | Spaced repetition flashcards | `vocabulary` |
| `resources` | Searchable vocabulary reference | `vocabulary` |
| `typing-practice` | Typing passages + per-term snippets | `vocabulary` (with `typingSnippet`), `typingPassages` |
| `source-analysis` | Primary source analysis (SIFT method) | Sources in `source-analysis.js` |

#### 📝 Practice Activities
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `practice-test` | Multiple choice quiz | `practiceQuestions` |
| `fill-in-blank` | Complete sentences with terms | `fillInBlankSentences` |
| `short-answer` | Open-ended response with rubric | `shortAnswerQuestions` |
| `timeline` | Order events chronologically | `timelineEvents` |

#### 🎮 Games
| Activity ID | What it does | Required content |
|------------|-------------|-----------------|
| `wordle` | Guess the term in 6 tries | `vocabulary` |
| `hangman` | Classic word guessing | `vocabulary` |
| `flip-match` | Memory matching (terms to definitions) | `vocabulary` |
| `term-catcher` | Catch the falling correct term | `vocabulary` |
| `lightning-round` | 60-second speed quiz | `practiceQuestions` |
| `crossword` | Auto-generated crossword | `vocabulary` |
| `quiz-race` | Timed quiz race | `practiceQuestions` |
| `tower-defense` | 3D tower defense (desktop only) | `vocabulary` |
| `map-quiz` | Click-on-the-map geography quiz | Custom (see source) |

### Vocabulary fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `term` | Yes | The vocabulary word |
| `definition` | Yes | Short definition |
| `simpleExplanation` | | Longer, student-friendly explanation |
| `example` | | A sentence using the term in context |
| `category` | | Groups terms for mastery gating (order matters — first category unlocks first) |
| `typingSnippet` | | 2-3 sentence passage for typing practice per term |
| `wikiUrl` | | Link to Wikipedia article for the Resources page |

### Practice question fields

| Field | Required | Description |
|-------|:--------:|-------------|
| `question` | Yes | The question text |
| `options` | Yes | Array of 4 answer choices |
| `correct` | Yes | Index of correct answer (0-3) |
| `explanation` | | Why the answer is correct |
| `topic` | | Category name — links to vocabulary categories for weakness tracking |

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

## ☁️ 7. Set Up Student Syncing (Optional)

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
var SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
var SUPABASE_ANON_KEY = 'your-anon-key-here';
```

6. Create classes in Supabase for your periods (the `classes` table needs a `code` matching your period codes)

### Is it worth it?

| Situation | Recommendation |
|-----------|---------------|
| Just trying it out | Skip Supabase — everything works without it |
| Using it for a real class | Set it up — the leaderboard motivates students |

---

## ❓ 8. Tips & FAQ

<details>
<summary><strong>How do I test changes before my students see them?</strong></summary>

Edit files on a branch other than `main`. GitHub Pages only deploys from `main`, so your changes won't be live until you merge.

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

Look at the `early-republic` unit as a working example of every feature.

Open an issue on GitHub or ask an AI assistant — paste your config.json and describe what's wrong.

</div>
