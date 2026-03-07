# Teacher Guide: Make Your Own Study Tool

This guide walks you through forking this project and customizing it for your own classes — no coding experience required. You'll use an AI coding assistant (like Claude) to do the heavy lifting.

**What you'll end up with:** A free, hosted study tool website for your students with flashcards, quizzes, games, a leaderboard, and more — all customized to your content.

**What you need:**
- A GitHub account (free)
- Your vocabulary, questions, and content ready to go
- About 30-60 minutes for initial setup

---

## Table of Contents

1. [Fork the Repository](#1-fork-the-repository)
2. [Enable GitHub Pages](#2-enable-github-pages)
3. [Understand the Structure](#3-understand-the-structure)
4. [Edit Your Unit Config](#4-edit-your-unit-config)
5. [Using AI to Help You](#5-using-ai-to-help-you)
6. [Config Reference](#6-config-reference)
7. [Set Up Student Syncing (Optional)](#7-set-up-student-syncing-optional)
8. [Tips and Common Questions](#8-tips-and-common-questions)

---

## 1. Fork the Repository

1. Go to the repository page on GitHub
2. Click the **Fork** button in the top right
3. Keep the default settings and click **Create fork**
4. You now have your own copy of the project

## 2. Enable GitHub Pages

This makes your study tool live on the internet for free.

1. In your forked repo, go to **Settings** > **Pages**
2. Under "Source," select **Deploy from a branch**
3. Set the branch to **main** and folder to **/ (root)**
4. Click **Save**
5. After a minute or two, your site will be live at `https://YOUR-USERNAME.github.io/studytools/`

## 3. Understand the Structure

You only need to touch **one file** to customize the content:

```
study-tools/units/YOUR-UNIT/config.json
```

That's it. This single file contains all your vocabulary, questions, timeline events, typing passages, and theme settings. The engine reads this file and builds everything automatically.

The existing unit at `study-tools/units/early-republic/` is a complete example you can reference.

### Quick overview of folders

| Folder | What it does | Do you need to edit it? |
|--------|-------------|------------------------|
| `study-tools/engine/` | The app itself (HTML, CSS, JS) | No — this just works |
| `study-tools/units/` | Your content goes here | **Yes — this is where you work** |
| `study-tools/dashboard/` | Teacher dashboard | No |
| `docs/` | Documentation | No |

## 4. Edit Your Unit Config

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

### What goes in config.json

Here's the minimum you need to get started:

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

That's enough for flashcards, a practice test, fill-in-the-blank, Wordle, and Hangman to all work.

## 5. Using AI to Help You

This is the fastest way to build your content. You can use any AI coding assistant — Claude, ChatGPT, Copilot, etc. Here's how:

### Getting started with AI

1. Open your `config.json` file
2. Share it with your AI assistant (paste it in, or use a tool like Claude Code)
3. Tell it what you want

### Example prompts you can copy and paste

**To create vocabulary from scratch:**
> Here are my vocabulary terms for a unit on [your topic]. Create a vocabulary array in the same JSON format as the early-republic config.json. Each term needs: term, definition, simpleExplanation (written for 8th graders), example, and category. Here are my terms: [paste your term list]

**To generate practice questions:**
> Using the vocabulary I just gave you, create 20 multiple choice practice questions in the same JSON format. Each question needs 4 options, a correct answer index, an explanation, and a topic that matches one of the vocabulary categories.

**To add typing passages:**
> Write a 200-300 word typing passage for each category in my vocabulary. Each passage should be written at an 8th grade reading level and cover the key ideas from that category's terms.

**To generate fill-in-the-blank sentences:**
> Create fill-in-the-blank sentences for each vocabulary term. The sentence should use the term naturally and help students understand the definition.

**To add timeline events:**
> Create a timeline array with 10-15 key events for this unit. Each event needs a year, event name, and one-sentence description.

**To create short answer questions:**
> Write 5 short answer questions that ask students to connect ideas across categories. Each needs a sampleAnswer, rubric with 4 bullet points, keyTerms array, and exemplar response.

### Tips for working with AI

- **Always share the existing config.json** so it matches the exact format
- **Review everything for accuracy** — AI can make mistakes with dates, names, and facts
- **Ask it to fact-check itself** — "Now review what you just wrote and flag anything that might be historically/scientifically inaccurate"
- **Iterate** — "Make the simple explanations more conversational" or "These questions are too easy, make them harder"
- **Be specific about reading level** — "Write for 8th graders" or "Write for 5th graders"

## 6. Config Reference

### Available activities

Add any of these to your `activities` array:

| Activity ID | Type | What it does | Required content |
|------------|------|-------------|-----------------|
| `flashcards` | Study | Spaced repetition flashcards | `vocabulary` |
| `resources` | Study | Searchable vocabulary reference | `vocabulary` |
| `typing-practice` | Study | Typing passages and per-term snippets | `vocabulary` (with `typingSnippet`), `typingPassages` |
| `source-analysis` | Study | Primary source analysis with SIFT method | Sources in `source-analysis.js` |
| `practice-test` | Practice | Multiple choice quiz | `practiceQuestions` |
| `fill-in-blank` | Practice | Complete sentences with terms | `fillInBlankSentences` |
| `short-answer` | Practice | Open-ended response with rubric | `shortAnswerQuestions` |
| `timeline` | Practice | Order events chronologically | `timelineEvents` |
| `wordle` | Game | Guess the term in 6 tries | `vocabulary` |
| `hangman` | Game | Classic word guessing | `vocabulary` |
| `flip-match` | Game | Memory matching (terms to definitions) | `vocabulary` |
| `term-catcher` | Game | Catch the falling correct term | `vocabulary` |
| `lightning-round` | Game | 60-second speed quiz | `practiceQuestions` |
| `crossword` | Game | Auto-generated crossword | `vocabulary` |
| `quiz-race` | Game | Timed quiz race | `practiceQuestions` |
| `tower-defense` | Game | 3D tower defense (desktop only) | `vocabulary` |
| `map-quiz` | Game | Click-on-the-map geography quiz | Custom (see source) |

### Vocabulary fields

| Field | Required | Description |
|-------|----------|-------------|
| `term` | Yes | The vocabulary word |
| `definition` | Yes | Short definition |
| `simpleExplanation` | No | Longer, student-friendly explanation |
| `example` | No | A sentence using the term in context |
| `category` | No | Groups terms for mastery gating (order matters — first category unlocks first) |
| `typingSnippet` | No | 2-3 sentence passage for typing practice per term |
| `wikiUrl` | No | Link to Wikipedia article for the Resources page |

### Practice question fields

| Field | Required | Description |
|-------|----------|-------------|
| `question` | Yes | The question text |
| `options` | Yes | Array of 4 answer choices |
| `correct` | Yes | Index of correct answer (0-3) |
| `explanation` | No | Why the answer is correct |
| `topic` | No | Category name — links to vocabulary categories for weakness tracking |

### Theme colors

Pick colors that match your subject. The theme object accepts:

```json
"theme": {
    "primary": "#1669C5",
    "secondary": "#1F90ED",
    "accent": "#f59e0b"
}
```

- `primary` — Main brand color (headers, buttons)
- `secondary` — Lighter variation
- `accent` — Highlight color (achievements, alerts)

### Welcome screen periods

The welcome screen currently has hardcoded period buttons (Period 1, 2, 4, 5). To change these for your school, edit the `showWelcomeScreen` function in `study-tools/engine/js/core/progress.js`. Search for `var periods = [` and modify the labels and codes.

## 7. Set Up Student Syncing (Optional)

Without Supabase, the study tool works perfectly — progress saves to each student's browser (localStorage). But if you want:
- Progress that syncs across devices
- A leaderboard
- A teacher dashboard to see student progress

You'll need a free Supabase account.

### Steps

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the schema from `study-tools/database/schema.sql` in the Supabase SQL editor
4. Copy your project URL and anon key
5. Edit `study-tools/engine/js/core/supabase-config.js` with your credentials:

```js
var SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
var SUPABASE_ANON_KEY = 'your-anon-key-here';
```

6. Create classes in Supabase for your periods (the `classes` table needs a `code` matching your welcome screen period codes)

### Is it worth it?

- **Just trying it out?** Skip Supabase. Everything works without it.
- **Using it for a real class?** Set it up — the leaderboard and progress tracking are motivating for students.

## 8. Tips and Common Questions

### "How do I test changes before my students see them?"

Edit files on a branch other than `main`. GitHub Pages only deploys from `main`, so your changes won't be live until you merge.

### "Can I use this for subjects other than history?"

Absolutely. The platform is subject-agnostic. The vocabulary, questions, and content are all in your config.json — replace them with any subject matter.

### "How do I change the welcome screen message?"

Edit the `showWelcomeScreen` function in `study-tools/engine/js/core/progress.js`.

### "How do I add images for source analysis?"

1. Put images in `study-tools/units/your-unit/images/sources/`
2. Reference them by filename in your source analysis data

### "My students see an old version"

GitHub Pages caches aggressively. Tell students to hard-refresh: `Ctrl+Shift+R` (Windows/Chromebook) or `Cmd+Shift+R` (Mac).

### "Can multiple units exist at the same time?"

Yes. Each unit has its own URL: `?unit=unit-id`. You can link students directly to their unit.

### "I broke something"

Since it's Git, you can always revert. If you're using the GitHub web editor, go to your commit history and revert the commit that broke things. Or ask your AI assistant: "I made a change that broke the site, here's what I changed, help me fix it."

---

## Need Help?

- Look at the `early-republic` unit as a working example of every feature
- Open an issue on the GitHub repository
- Use an AI coding assistant — paste your config.json and describe what's wrong
