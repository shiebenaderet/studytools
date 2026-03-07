# Study Tools Platform

A modular, config-driven study tool platform for 8th Grade US History. Built for GitHub Pages with optional Supabase sync for persistent student progress.

**Live site:** [shiebenaderet.github.io/studytools](https://shiebenaderet.github.io/studytools/)

**Version:** 2.0.0

## Features

### Study Activities
- **Flashcards** — Anki-style spaced repetition with 3D flip animation, confidence rating (Again/Hard/Good/Easy), and session mastery tracking
- **Short Answer** — Open-ended response practice with rubric, exemplar, and key terms
- **Source Analysis** — Primary source analysis using the SIFT method with classification, contextual questions, and scoring
- **Typing Practice** — Monkeytype-inspired typing with full passages and per-term mini-snippets for targeted vocabulary practice
- **Resource Library** — Searchable, collapsible vocabulary reference with Kiddle, Wikipedia, and YouTube links

### Practice Activities
- **Practice Test** — Multiple choice with randomized questions and shuffled answer positions
- **Fill-in-the-Blank** — Complete sentences with key terms from a word bank
- **Timeline** — Place events in chronological order (challenge mode hides years)
- **Category Sort** — Sort terms into categories with drag-and-drop or tap-to-select

### Games
- **Wordle** — Guess the vocabulary term in 6 tries with definition clues
- **Hangman** — Classic word guessing with definitions
- **Flip Match** — Memory matching game pairing terms to definitions
- **Typing Race** — Type the correct term as fast as you can, with progressive hints
- **Term Catcher** — Catch the falling correct term matching a definition
- **Lightning Round** — 60-second speed quiz with leaderboard
- **Crossword** — Auto-generated crossword puzzle from vocabulary

### Smart Learning Features
- **Cross-activity weakness tracking** — Wrong answers in Practice Test, Lightning Round, and Typing Practice feed into a shared tracker, surfacing weak terms for review in Flashcards and Typing Practice
- **Mastery gating** — Activities unlock progressively as students demonstrate mastery across the unit
- **Achievement system** — Unlockable badges with confetti animations for milestones (perfect scores, streaks, speed records)
- **Historical flavor** — Era-appropriate quotes with portraits and fun facts from the period woven throughout the experience

### Platform Features
- **Dark theme UI** — Polished dark slate design with Outfit font, inspired by Kahoot/Blooket/Gimkit aesthetics
- **Student welcome screen** — Name and period input with personalized greetings throughout
- **Config-driven units** — Add new units by creating a `config.json` with vocabulary, questions, timeline events, and more
- **Progress tracking** — localStorage for instant saves, optional Supabase sync for cross-device persistence
- **Teacher dashboard** — View student progress across classes
- **Accessibility** — Keyboard shortcuts, focus indicators, OpenDyslexic font toggle
- **Touch support** — Tap-to-select on mobile for all drag-and-drop activities
- **Study tools** — Note-taking guide, focused study timer, printable study guide, progress export

## Architecture

```
study-tools/
  engine/             # Core platform
    css/styles.css    # Theming via CSS custom properties
    js/
      core/           # app.js, progress.js, utils.js, supabase-config.js
      activities/     # Plugin-based activities (one file each)
    tools/            # Study tools (notes, timer, print, export)
    index.html        # Main app shell
  units/              # Content units
    units.json        # Unit manifest
    early-republic/
      config.json     # Vocabulary, questions, timeline, theme
  dashboard/          # Teacher dashboard
  database/           # Supabase schema
```

### Adding a New Unit

1. Create a folder under `study-tools/units/your-unit-id/`
2. Add a `config.json` following the structure of the early-republic unit:
   - `unit` — id, title, subtitle, essentialQuestion, theme colors
   - `vocabulary` — term/definition pairs, each with optional `category`, `example`, and `typingSnippet` (2-3 sentence mini-passage for targeted typing practice)
   - `practiceQuestions` — multiple choice questions with `topic` field for weakness tracking
   - `shortAnswer` — open-ended questions with rubric, exemplar, key terms, and connection pairings
   - `fillInBlank` — sentences with blanks and a word bank
   - `timelineEvents` — event/year/description for chronological ordering
   - `sourceAnalysis` — primary sources with excerpts, classification, and contextual questions
   - `typingPassages` — full-length passages for typing practice with source citations
   - `historicalFlavor` — quotes (with author, source, portrait URL) and fun facts from the era
   - `activities` — list of activity plugin IDs to enable
3. Add the unit to `study-tools/units/units.json`

### Adding a New Activity

1. Create `study-tools/engine/js/activities/your-activity.js`
2. Call `StudyEngine.registerActivity({...})` with:
   - `id`, `name`, `icon`, `description`, `category` (study/practice/games)
   - `requires` array (e.g., `['vocabulary']`)
   - `render(container, config)`, `activate()`, `deactivate()`
   - `getProgress()`, `loadProgress(data)` for persistence
3. Add the activity id to your unit's `activities` array in `config.json`

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step, no framework)
- Google Fonts: Outfit (variable weight 300-900), OpenDyslexic (accessibility toggle)
- Font Awesome 6.4 for icons
- Supabase JS SDK for optional cloud sync
- GitHub Pages for hosting

## Development

No build step required. Open `study-tools/engine/index.html?unit=early-republic` in a browser, or serve the repo root with any static file server.

## License

For educational use.
