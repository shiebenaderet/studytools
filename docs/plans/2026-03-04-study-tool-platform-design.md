# Study Tool Platform - Design Document

**Date:** 2026-03-04
**Status:** Approved

## Problem

The current study tool is a single 2400+ line HTML file. Content, styles, and logic are tightly coupled. Creating a new unit means copy-pasting the entire file and manually swapping content. Bug fixes must be applied to every copy. New activities (games, sorting exercises) can't be mixed and matched per unit.

## Goals

1. Reusable template: create a new unit by editing one config file
2. Plugin-based activities: mix and match per unit (timeline for one, category sort for another)
3. Vocabulary games: Wordle, Hangman, Flip Match, Typing Race, etc.
4. Persistent progress: localStorage by default, optional Supabase sync
5. Teacher dashboard: see who's studying, how much, and how they're scoring
6. Themeable: each unit gets its own color scheme via config
7. Static hosting on GitHub Pages, no build tools required

## Architecture: Plugin-Based Engine with JSON Config

### Project Structure

```
/study-tools/
  index.html                  # Landing page listing all units
  engine/
    index.html                # Main shell template
    css/
      styles.css              # All shared styles (uses CSS custom properties)
    js/
      core/
        app.js                # Boot: loads config, registers activities, builds nav
        progress.js           # localStorage + Supabase sync layer
        utils.js              # Shared helpers (shuffle, timer, modals)
      activities/
        flashcards.js
        practice-test.js
        short-answer.js
        timeline.js
        category-sort.js
        wordle.js
        hangman.js
        flip-match.js
        typing-race.js
        fill-in-blank.js
        term-catcher.js
        lightning-round.js
        crossword.js
    tools/
      notes.js
      timer.js
      print.js
      export.js
  units/
    early-republic/
      config.json
    civil-war/
      config.json
  dashboard/
    index.html                # Teacher dashboard (Supabase auth)
```

### How It Works

1. Student visits `/study-tools/engine/?unit=early-republic`
2. `app.js` reads the query param, fetches `../units/early-republic/config.json`
3. Engine applies theme colors as CSS custom properties
4. Engine loads only the activity JS files listed in config's `activities` array
5. Each activity file calls `StudyEngine.registerActivity(...)` to self-register
6. Engine builds nav and section containers for registered activities
7. Student interacts; progress saves to localStorage immediately
8. If student has opted into Supabase sync, progress syncs every 30 seconds

### Config File Format

```json
{
  "unit": {
    "id": "early-republic",
    "title": "Early Republic",
    "subtitle": "8th Grade US History",
    "essentialQuestion": "How did the first leaders shape the country we live in today?",
    "teacherEmail": "benaderets885@edmonds.wednet.edu",
    "theme": {
      "primary": "#0d9488",
      "secondary": "#065f46",
      "accent": "#f59e0b"
    }
  },
  "activities": [
    "flashcards",
    "practice-test",
    "short-answer",
    "timeline",
    "wordle",
    "hangman",
    "flip-match",
    "typing-race",
    "fill-in-blank",
    "term-catcher",
    "lightning-round",
    "crossword"
  ],
  "vocabulary": [
    {
      "term": "Inauguration",
      "definition": "The formal ceremony where a president takes the oath of office",
      "example": "George Washington's inauguration in 1789...",
      "category": "Washington's First Decisions"
    }
  ],
  "timelineEvents": [...],
  "practiceQuestions": [...],
  "shortAnswerQuestions": [...],
  "sortingData": null,
  "fillInBlankSentences": [
    {
      "sentence": "Washington sent the army to crush the ___, proving the federal government could enforce its laws.",
      "answer": "Whiskey Rebellion"
    }
  ]
}
```

### Activity Plugin Interface

Every activity follows the same contract:

```javascript
StudyEngine.registerActivity({
  id: 'wordle',
  name: 'Wordle',
  icon: 'fas fa-spell-check',
  description: 'Guess the vocabulary term in 6 tries',
  category: 'games',          // study | practice | games
  requires: ['vocabulary'],    // what config data it needs

  render(container, config) { ... },
  activate() { ... },
  deactivate() { ... },
  getProgress() { ... },
  loadProgress(data) { ... }
});
```

### Nav Grouping

Activities are grouped to avoid tab overload:

- **Home**: Progress stats, badges, achievements
- **Study**: Flashcards, Fill-in-the-Blank
- **Practice**: Practice Test, Short Answer, Timeline, Category Sort
- **Games**: Wordle, Hangman, Flip Match, Typing Race, Term Catcher, Lightning Round, Crossword
- **Tools**: Notes, Timer, Print, Export

Each group expands into a sub-nav or card grid when selected.

## Data Layer

### Three-Tier Progress System

**Tier 1: localStorage (always works, no login)**
- All progress saves locally as it happens
- Keyed per unit: `studytool_{unit-id}_{activity}`
- Site is fully functional without any backend

**Tier 2: Supabase sync (opt-in)**
- Student clicks "Save My Progress" and enters name + class code
- Progress auto-syncs in background every 30 seconds (debounced)
- If offline, localStorage keeps working; syncs when reconnected
- Session token in localStorage so student doesn't re-enter info each visit

**Tier 3: Teacher dashboard**
- Separate page at `/dashboard/`
- Protected by Supabase teacher auth
- Shows: active students, time on task, scores, activity usage
- Filterable by class period, unit, date range

### Supabase Schema

```sql
classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  teacher_email text NOT NULL,
  created_at timestamp DEFAULT now()
);

students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_id uuid REFERENCES classes(id),
  created_at timestamp DEFAULT now()
);

progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  unit_id text NOT NULL,
  activity text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp DEFAULT now(),
  UNIQUE(student_id, unit_id, activity)
);

sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  unit_id text NOT NULL,
  started_at timestamp DEFAULT now(),
  duration_seconds int DEFAULT 0,
  activities_used text[] DEFAULT '{}'
);
```

### Sync Logic

1. On page load: if logged in, fetch Supabase progress and merge with localStorage (newer wins)
2. During use: all progress writes go to localStorage immediately
3. Every 30 seconds: if logged in, batch-sync dirty progress records to Supabase
4. On page unload: final sync attempt via `navigator.sendBeacon`

### Future Auth Upgrade

When Google Auth becomes available:
- Add as alternative login method alongside class codes
- Link Google identity to existing student record via email
- Same database tables, no data migration needed

## Theming

Each unit's config provides three colors:

```json
"theme": {
  "primary": "#0d9488",
  "secondary": "#065f46",
  "accent": "#f59e0b"
}
```

Applied on load as CSS custom properties:

```css
:root {
  --primary: var(--configured);
  --secondary: var(--configured);
  --accent: var(--configured);
}
```

All styles reference these variables. Every unit gets its own look with zero CSS changes.

## Unit Creation Workflow

1. Copy any existing unit folder (e.g. `units/early-republic/`) to a new folder
2. Edit `config.json`: title, theme, vocabulary, questions, activities list
3. Push to GitHub
4. Site is live at `/study-tools/engine/?unit=new-unit-id`

## Launch Activities (13)

| # | Activity | Category | Reinforces |
|---|----------|----------|------------|
| 1 | Flashcards | Study | Term/definition recall |
| 2 | Fill-in-the-Blank | Study | Using terms in context |
| 3 | Practice Test | Practice | Comprehension + application |
| 4 | Short Answer | Practice | Deeper analysis + writing |
| 5 | Timeline | Practice | Chronological understanding |
| 6 | Category Sort | Practice | Classification |
| 7 | Wordle | Games | Spelling + term recognition |
| 8 | Hangman | Games | Spelling + definition clues |
| 9 | Flip Match | Games | Term-definition pairing |
| 10 | Typing Race | Games | Spelling under pressure |
| 11 | Term Catcher | Games | Quick recall (clicking/arcade) |
| 12 | Lightning Round | Games | Speed + accuracy |
| 13 | Crossword | Games | Definitions as clues |

## Future Activities (add as plugins later)

- Whack-a-Mole, Balloon Pop, Asteroid Dodge, Term Runner
- Jeopardy, Quiz Bowl, Who Am I?
- Word Search
- Class Leaderboard
