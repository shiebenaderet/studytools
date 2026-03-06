# Study Tools Platform

A modular, config-driven study tool platform for 8th Grade US History. Built for GitHub Pages with optional Supabase sync for persistent student progress.

**Live site:** [shiebenaderet.github.io/studytools](https://shiebenaderet.github.io/studytools/)

## Features

### Study Activities
- **Flashcards** - Flip-card vocabulary review
- **Short Answer** - Open-ended response practice

### Practice Activities
- **Practice Test** - Multiple choice with randomized questions and answer positions
- **Fill-in-the-Blank** - Complete sentences with key terms
- **Timeline** - Drag events into chronological order (challenge mode hides years)
- **Category Sort** - Sort terms into categories with drag-and-drop or tap-to-select

### Games
- **Wordle** - Guess the vocabulary term in 6 tries with definition clues
- **Hangman** - Classic word guessing with definitions
- **Flip Match** - Memory matching game pairing terms to definitions
- **Typing Race** - Type the correct term as fast as you can, with progressive hints
- **Term Catcher** - Catch the falling correct term matching a definition
- **Lightning Round** - 60-second speed quiz with leaderboard
- **Crossword** - Auto-generated crossword puzzle from vocabulary

### Platform Features
- **Config-driven units** - Add new units by creating a `config.json` with vocabulary, questions, and timeline events
- **Progress tracking** - localStorage for instant saves, optional Supabase sync for cross-device persistence
- **Teacher dashboard** - View student progress across classes
- **Accessibility** - Keyboard shortcuts, focus indicators, OpenDyslexic font toggle
- **Touch support** - Tap-to-select on mobile for all drag-and-drop activities
- **Study tools** - Note-taking guide, focused study timer, printable study guide, progress export

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
   - `unit` object with id, title, subtitle, essentialQuestion, theme colors
   - `vocabulary` array with term/definition pairs
   - `questions` array for practice test
   - `shortAnswer` array for open-ended questions
   - `fillInBlank` array for fill-in-the-blank
   - `timelineEvents` array with event/year/description
   - `activities` array listing which activity plugins to enable
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
- Google Fonts: Roboto (headings), Lexend (body text)
- Font Awesome 6.4 for icons
- Supabase JS SDK for optional cloud sync
- GitHub Pages for hosting

## Development

No build step required. Open `study-tools/engine/index.html?unit=early-republic` in a browser, or serve the repo root with any static file server.

## License

For educational use.
