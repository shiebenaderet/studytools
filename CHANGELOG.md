# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.5.0] - 2026-03-07

### Added
- **Auto study time tracking** — Time spent in activities now automatically counts toward study time; pauses after 60 seconds of inactivity or when tab is hidden; resumes on interaction
- **Fill-in-the-Blank feeds flashcards** — Wrong answers mark corresponding vocab terms as "Again" in flashcards and add them to the weakness tracker; feedback message shown on results screen
- **Resource Library mastery indicators** — Each term shows a colored badge (Mastered/Learning/Study) based on flashcard ratings; category headers show mastery counts (e.g., "3/7 mastered")

### Changed
- **Resource Library: Kids Wiki link** — Replaced Kiddle search results link with direct link to Kiddle encyclopedia article pages
- **Home page name deduplication** — Student name now only appears once (header greeting); removed from "Here's how to study" title and progress heading

## [6.4.0] - 2026-03-07

### Changed
- **Short Answer cards redesigned** — Removed images, replaced with color accent bars; significantly larger text (1.5em summary, 1em badges, 0.95em term chips) for readability in both light and dark mode
- **README updated** — Brought up to date with all features through v6.4 (How to Study, Sketch & Match, settings gear, practice test mastery loop, deep linking, etc.)
- **Teacher Guide updated** — Added How to Study and Sketch & Match to activity reference tables

### Fixed
- **Crossword double-counting** — Clicking "Check" after completing a crossword no longer increments the puzzles completed counter repeatedly
- **Timeline perfect scoring** — Perfect score only counts when years are hidden (challenge mode); with years shown, students get a congratulations message but no perfect credit or achievement
- **Map Quiz cleanup** — Removed Great Lakes overlays, restored original clean map

### Removed
- **Map Quiz: Great Lakes blobs** — Removed simplified lake shapes that didn't match the map well

## [6.2.0] - 2026-03-07

### Removed
- **Map Quiz: British North America blob** — Removed the poorly-shaped British territory overlay; Great Lakes remain for geographic context

### Changed
- **Music player auto-shuffle** — Playlist is shuffled on load and starts with shuffle enabled; each time the player opens, songs play in a different random order

## [6.1.0] - 2026-03-07

## [6.0.0] - 2026-03-07

### Changed
- **Timeline events now include months** — All 10 events updated with historically verified months (e.g., "1794" → "July 1794" and "November 1794") so students can distinguish events that share the same year

### Fixed
- **Timeline: remove placed events** — Tap a placed event then tap the events area to return it to the pool
- **Timeline: shuffle button** — New shuffle button to re-randomize the event pool order

## [5.9.0] - 2026-03-07

### Changed
- **Practice Test redesign** — Now pulls 10 random questions per session instead of all at once:
  - Tracks which questions have been answered correctly across sessions
  - Prioritizes unmastered questions, fills remaining slots with review questions
  - Mastery progress bar shows overall completion (e.g., "23/37 questions mastered")
  - Students keep taking tests until every question answered correctly at least once
  - "All Questions Mastered" celebration screen when complete
  - Wrong answers feed back to flashcards — marks related vocab terms as "Again" for re-study

## [5.8.0] - 2026-03-07

### Fixed
- **Source Analysis dark mode contrast** — Description text and "sessions completed" stats were nearly invisible in dark mode (hardcoded `#555` and `#4b5563`); now uses theme variables

## [5.7.0] - 2026-03-07

### Changed
- **Short Answer card redesign** — Replaced small text cards with visual, color-coded cards:
  - Each topic gets a distinct accent color for visual differentiation
  - Topic images from vocabulary database shown on cards
  - Question summaries instead of truncated text
  - Key terms preview chips on each card
  - Larger card size with better contrast and readability

## [5.6.0] - 2026-03-07

### Changed
- **Short Answer redesign** — Replaced dropdown selector with card-based question grid:
  - Each question shown as a clickable card with topic, preview text, and number badge
  - Green checkmark on cards with saved responses
  - Full question view with back button, prev/next navigation
  - Styled save button and responsive layout
- **Map Quiz: British North America** — Added non-interactive British territory above the US border for geographic context, with dashed border and label
- **Map Quiz: Great Lakes** — Added simplified Great Lakes (Superior, Michigan, Huron, Erie, Ontario) as water features

## [5.5.0] - 2026-03-07

### Fixed
- **"Explain it to me" dark mode contrast** — Text in expand boxes was nearly invisible in dark mode (hardcoded dark color on dark background); now uses theme variable
- **Map Quiz "Atlantic Ocean" label** — Text was cut off by SVG viewBox; widened viewBox from 900→960, repositioned and rotated label to fit
- **Map Quiz viewport** — Wider viewBox shows more of the map area including the Atlantic coast

### Changed
- Map Quiz border-radius and border styling improved

## [5.4.0] - 2026-03-07

### Added
- **Deep linking to activities** — Share links like `?unit=early-republic#map-quiz` to open specific activities directly
- URL hash updates when navigating activities, clears when returning home

### Changed
- **Map Quiz always unlocked** — No longer gated behind mastery; students can access it immediately

## [5.3.0] - 2026-03-07

### Added
- **"Study Smart" badge** — Achievement earned by passing the How to Study comprehension quiz (5/6 correct)
- Badge registered in achievements.js so it displays in the achievements panel

## [5.2.0] - 2026-03-07

### Added
- **How to Study nudges** — New students redirected to How to Study page after first sign-in; returning students get a one-time toast nudge after 90 seconds
- **Collapsible strategies** — How to Study page strategies now click-to-expand with chevron indicators
- **Comprehension quiz** — 6-question quiz at the bottom of How to Study page; awards Study Smart badge at 5/6 correct
- **Expand/Collapse All** toggle button for strategy cards
- **Smart back navigation** — "Back to Study Tools" uses browser history when coming from the main app, preserving the user's previous state

### Fixed
- How to Study dark mode contrast for quiz feedback, letter badges, and badge earned text
- Timeline "Show Years" toggle was broken (old wrapper not removed before re-rendering)
- Short Answer select dropdown was unstyled browser default; now themed with proper spacing and label

## [5.1.0] - 2026-03-07

### Added
- **Sketch & Match game** — Two modes (term→image, image→term) with streak tracking and weakness tracker integration
- **"Make Your Own Example"** on flashcards — Students can write their own examples for terms, saved to localStorage
- **Settings panel** — Single floating gear button replaces 3 separate floating buttons; slide-up panel with theme toggle, dyslexic font toggle, and search shortcut

### Changed
- Flashcard images enlarged from 140×120 to 220×200px and centered
- Three floating buttons (theme, font, search) consolidated into single settings gear

## [5.0.0] - 2026-03-07

### Added
- **Teacher Dashboard enhancements:**
  - Version display badge in dashboard header
  - Class Codes tab — create, view, copy, and delete class codes
  - Scores tab — approve/reject student leaderboard entries with status badges
  - Student editing modal — edit name, change class, delete student with cascading cleanup
  - Activity Usage tab (renamed from Units) — per-unit stats with student counts, avg mastery, avg test scores, activity engagement bars

## [4.2.0] - 2026-03-07

### Added
- **Map Quiz activity** — Click-to-identify 1802 US map with 24 regions (states + territories + foreign holdings)
- **Cartographer achievement** — Badge for 100% map quiz with no mistakes

### Fixed
- Randomized practice test answer positions and question order
- Crossword uses full terms
- Timeline hides years by default
- Added back button to activities

## [4.1.0] - 2026-03-06

### Added
- **Study Music player** — Collapsible floating music player for studying:
  - Loads tracks from `audio/tracks.json` manifest
  - Play/pause, skip forward/back, clickable progress bar
  - Volume slider with mute icon states
  - Track title and artist display
  - Auto-advances to next track on end
  - Collapse to title bar or close entirely
  - Persists across activity navigation
  - Accessible from Tools menu
  - Self-hosted MP3s (no ads, no external services)
- **`audio/` directory** — Folder for self-hosted study music MP3 files

## [4.0.0] - 2026-03-06

### Added
- **3D Tower Defense game** — New vocabulary-powered tower defense game built with Three.js:
  - Answer timed vocabulary questions (10 seconds each) to earn coins
  - Build 4 tower types: Quill (fast), Cannon (area damage), Frost (slows), Eagle (long range)
  - 10 waves of enemies with increasing difficulty (more enemies, more HP, faster)
  - S-curve path with grid-based tower placement
  - Low-poly procedural geometry optimized for Chromebooks (no imported 3D models)
  - Streak bonus for consecutive correct answers
  - Wrong answers tracked in weakness tracker
  - Start screen with tower previews and best score
  - Victory/Game Over screen with stats
- **Three.js CDN** — Loaded on-demand only when Tower Defense is opened (no impact on other activities)

### Changed
- Removed Typing Race from default activities (replaced by Tower Defense)

## [3.3.0] - 2026-03-06

### Added
- **"Explain It To Me" feature** — Kid-friendly simple explanations for every vocabulary term, accessible via lightbulb button:
  - **Flashcards** — Button on the back face reveals a plain-language explanation below the definition
  - **Practice Test** — Appears after wrong answers to help students understand what they missed
  - **Resource Library** — Available on every term card for quick clarification
  - All 37 vocabulary terms have hand-written `simpleExplanation` fields with relatable analogies and plain language

## [3.2.0] - 2026-03-06

### Added
- **Fill-in-the-Blank redesign** — Questions now appear one at a time with progress bar, dot navigation, and prev/next buttons instead of all-at-once scrolling
  - **Type It mode** — Students can choose to type answers instead of using the word bank
  - **Word Bank mode** — Tap a word, then tap the blank (with clear instructions)
  - Mode selector screen at start with clear descriptions
  - Results screen shows all answers with correct/incorrect highlighting
- **Vocab Tower Defense design doc** — Design document for upcoming 3D tower defense game at `docs/plans/`

### Changed
- Fill-in-the-Blank moved from all-at-once layout to single-question stepper for less scrolling

## [3.1.0] - 2026-03-06

### Added
- **1v1 Quiz Race** — New 2-player same-screen game: Player 1 uses keys 1-4, Player 2 uses keys 7-0. Race to answer multiple-choice questions with 6-second timer, correct = +1, wrong = -1. Key hints shown on each option.
- **Teacher Analytics Dashboard** — Three analytics cards in teacher view:
  - **Popular Activities** — Bar chart showing usage counts per activity with "underused" warnings
  - **Tricky Terms** — Top 10 most-missed vocabulary terms aggregated from weakness tracker and flashcard ratings
  - **Review Recommendations** — AI-generated suggestions based on mastery rates, activity usage gaps, and common struggles
- **Click-to-cycle quotes** — Click the quote card on the home page to slide to the next quote with smooth transition animation and "Tap for more quotes" hint

### Changed
- Removed Category Sort from default unit activities (replaced by Quiz Race)

## [3.0.0] - 2026-03-06

### Added
- **Leaderboard system** — New "Leaderboard" nav tab with three sub-tabs:
  - **Top Students** — Individual rankings with podium visualization for top 3 (gold/silver/bronze), score breakdown (vocab × 10 + test score + study minutes)
  - **Class Battle** — Class-vs-class rankings with animated horizontal bar chart, ranked by average student score
  - **Achievements** — Moved from home page to leaderboard tab to reduce clutter
- **Teacher leaderboard management** — In teacher dashboard:
  - Approve individual students or "Approve All" for the leaderboard
  - Remove individual entries
  - Reset entire leaderboard with confirmation
  - Status badges (Pending/Approved) with class and score details
- **Auto-score submission** — Scores automatically submitted to Supabase on every activity save and when visiting the leaderboard
- **"Top Student" achievement** — New badge for reaching #1 on the leaderboard
- **`leaderboard` database table** — `student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, approved` with RLS policies

### Changed
- Achievements removed from home page stats container (now in Leaderboard tab)
- Nav bar now includes Leaderboard between Games and Tools

## [2.5.0] - 2026-03-06

### Changed
- **Achievements merged into progress** — Badge grid now renders inside the stats/progress container instead of a separate section, saving vertical space
- **Numbered study flow** — Home page welcome replaced with clear 1-2-3 step cards (Learn → Practice → Play) with descriptions and CTA buttons
- **Quote card more prominent** — Larger portrait (72px), primary-colored border, gradient background tint, bolder author text
- **Removed separate badges-container** from HTML layout

## [2.4.0] - 2026-03-06

### Changed
- **Condensed home page** — Smaller progress tracker (reduced padding, font sizes, hidden progress labels), compact achievement badges (56px inline flex instead of 90px grid), tighter quote card spacing
- **Fun fact moved to footer** — Historical fun facts now display in the site footer on every page instead of below the quote card on the home page only
- **Focus timer no longer overlaps header** — Timer bar pushes page content down via `body.timer-active` class instead of covering the sticky header; reduced timer bar height from 44px to 36px
- **Compact achievements** — Heading and summary merged into a single inline row; badges reduced to 56px with smaller icons/text
- **Light mode polish** — Replaced remaining hardcoded `rgba(255,255,255,...)` in wordle, timeline, source analysis, and achievement styles with theme-aware CSS variables; loading screen uses CSS variables

## [2.3.0] - 2026-03-06

### Added
- **Light/dark mode toggle** — Sun/moon button (fixed bottom-right) with localStorage persistence; full light theme with adjusted shadows, borders, and contrast
- **`--font-mono` CSS variable** — Monospace font variable for consistent typing-related UI

- **New quotes** — Benjamin Banneker (letter to Jefferson), Tecumseh (speech to Osages), John Marshall (Cohens v. Virginia), Andrew Jackson (Bank War), with portraits and verified sources
- **5 new fun facts** — Banneker, Tecumseh, Marshall, Jackson

### Changed
- **Typing Practice colors** — Replaced all hardcoded Monkeytype colors (#323437, #e2b714, #646669, #ca4754, #d1d0c5) with site CSS variables for full theme consistency
- **Typing Practice fonts** — Replaced all hardcoded `'Roboto Mono'` references (10+ instances) with `var(--font-mono)` CSS variable
- **Reduced vertical spacing** — Tighter stats, cards, header, sections, quote card, and footer padding to minimize scrolling on home page
- Fixed-position button stack reordered: search (top), theme toggle (middle), dyslexic font (bottom)

## [2.2.0] - 2026-03-06

### Added
- **Women's quotes** — Abigail Adams (2 quotes), Mercy Otis Warren, and Dolley Madison with verified sources and local portraits
- **Toussaint Louverture quote** — "tree of black liberty" quote with portrait, representing Black voices in the Early Republic era
- **Haitian Revolution fun facts** — Two new fun facts connecting the Haitian Revolution to the Louisiana Purchase

### Changed
- Washington abolition quote now includes editorial bracket `[slavery]` for 8th-grade clarity
- Replaced misattributed Dolley Madison quote with her verified letter about saving Washington's portrait during the War of 1812

## [2.1.0] - 2026-03-06

### Added
- **Command palette** — Searchable command launcher (`/`, `Cmd+K`, or visible search button) for quick navigation to any activity, tool, or shortcut
- **Hidden teacher dashboard** — Type "teacher" in the command palette to access; magic link email auth restricted to approved school domains (@edmonds.wednet.edu), with password fallback
- **Collapsible header** — Header and nav collapse into a compact activity topbar when students enter an activity, maximizing screen space for content
- **Historical flavor on home page** — Random historical quote with portrait and fun fact displayed on the home screen, pulled from unit config
- **Responsive progress bar** — Slim 10px bar with percentage label displayed below instead of cramped text inside the fill

### Changed
- Container max-width widened to 1280px for better desktop utilization
- Stats grid uses fixed 4-column layout (2-col on mobile) instead of auto-fit
- Stat values use primary text color instead of accent for better readability
- Keyboard shortcuts modal now built with safe DOM methods (no innerHTML)

### Fixed
- Wordle no longer repeats the same term consecutively — tracks recent words and cycles through half the pool before repeating
- Magic link auth redirect no longer lands on welcome screen — detects auth hash before showing name/period input
- URL cleaned properly after magic link redirect (no trailing `#`)

## [2.0.0] - 2026-03-06

### Added
- **Dark theme redesign** — Complete visual overhaul with Outfit font, dark slate backgrounds, and cohesive CSS variable system (`--bg-deep`, `--bg-card`, `--bg-surface`, `--text-primary`, etc.)
- **Anki-style flashcards** — Spaced repetition with 3D flip animation, confidence rating (Again/Hard/Good/Easy), progress dots, and session completion stats
- **Cross-activity weakness tracking** — Wrong answers in Practice Test, Lightning Round, and Typing Practice feed into a shared `weakness_tracker`, surfaced as review suggestions in Flashcards
- **Per-term typing snippets** — Each vocabulary term has a 2-3 sentence mini-passage; weak terms highlighted in amber and prioritized for practice
- **Source Analysis activity** — SIFT method primary source analysis with classification, contextual questions, and scoring
- **Mastery gating** — Activities unlock progressively as students demonstrate mastery
- **Student welcome screen** — Name and period input overlay with personalized greetings throughout the app
- **Historical flavor content** — 15 era-appropriate quotes with Wikimedia Commons portraits and 15 fun facts from the 1785-1815 period in config
- **Resource Library** — Searchable, collapsible vocabulary reference with Kiddle, Wikipedia, and YouTube links per term
- **Achievement system** — Unlockable badges with confetti animations for milestones (perfect scores, streaks, speed records)

### Changed
- Font family from Roboto/Lexend to Outfit (variable weight 300-900)
- All activity UI components converted from white/light backgrounds to dark theme
- Category card colors updated for dark theme contrast (study=blue, practice=purple, games=green)
- Feedback colors use semi-transparent RGBA instead of solid light backgrounds (e.g., `rgba(34,197,94,0.15)` instead of `#dcfce7`)
- Practice test answer positions randomized per question with persistent shuffle maps
- Activity card grid alignment and button styling unified

### Fixed
- Source analysis "Questions:" field showing blank after score screen (empty array was truthy)
- Flashcard content overflow on long definitions
- Timeline, crossword, and all game activities now render correctly on dark backgrounds
- Modal, toast, and input styling consistent with dark theme
- Hangman gallows visible on dark backgrounds (was `#333` on dark)

## [1.0.0] - 2026-03-05

### Added
- Core engine with plugin-based activity architecture
- 13 study activities: Flashcards, Practice Test, Short Answer, Fill-in-the-Blank, Timeline, Category Sort, Wordle, Hangman, Flip Match, Typing Race, Term Catcher, Lightning Round, Crossword
- Config-driven unit system with vocabulary, questions, timeline events
- Progress tracking via localStorage with optional Supabase cloud sync
- Teacher dashboard for viewing student progress across classes
- Landing page with unit picker
- Study tools: note-taking guide, focused study timer, printable study guide, progress export
- Keyboard shortcuts (1-5 for nav, ? for help, Esc to close modals)
- Touch support with tap-to-select for all drag-and-drop activities
- Loading spinner while config loads
- Toast notification system (replaces browser alert dialogs)
- Welcome cards on home screen with quick-start guidance
- Blue gradient theme (#1669C5 to #1F90ED) with CSS custom properties
- Google Fonts: Roboto for headings, Lexend for body text
- OpenDyslexic font toggle (persists preference via localStorage)
- Root redirect from repo root to study-tools landing page
- Supabase database schema with Row Level Security
- README and versioning

### Fixed
- Wordle no longer gives partial words (e.g., "dept" from "Dept. of War") - filters to single-word terms only, supports up to 12 letters
- Typing Race provides progressive hints when stuck (character count, first letter, half reveal) and a skip button
- Practice test answer positions randomized (was 96% at position B) and question order shuffled
- Crossword uses full terms instead of first word only
- Timeline defaults to Challenge Mode (years hidden) with toggle
- Term Catcher falling terms all look identical so students must read them (no color giveaway)
- Lightning Round button contrast improved for readability
- Flashcard content no longer overflows on long definitions
- Practice test saves and restores current question index
- All hardcoded green tints updated to match blue theme

### Security
- Supabase Row Level Security policies for client-side writes
- No innerHTML usage with user-provided content
