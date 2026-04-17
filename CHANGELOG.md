# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [8.8.3] - 2026-04-17

### Changed
- Class Battle leaderboard now ranks by total class points (was average per student), matching the teacher dashboard and rewarding broad participation over a few high scorers

### Fixed
- Homepage "Questions Mastered" stat now reads from practice-test mastery data (was always showing 0 due to reading a non-existent property)
- Print/export study guide shows correct questions mastered count (same root cause)
- Cross-device sync now merges practice-test mastery arrays (union of mastered questions) instead of "newer wins", preventing mastery data loss when studying on multiple devices

## [8.8.1] - 2026-04-11

### Fixed
- Textbook reading gate now only applies to flashcards (was blocking source analysis, games, and other activities)
- Flashcards "complete" screen shows must-know term totals instead of all terms
- Homepage flashcard card shows read-gated term count (consistent with actual flashcard availability)
- Weak terms review filters to must-know terms only
- 5 digital maps in Source Analysis reclassified from primary to secondary sources (Oregon Trail, Mexican Territory, Mexican Cession, Compromise of 1850, Free/Slave States)

## [8.8.0] - 2026-04-11

### Added
- **Vocabulary tiers** — Terms are now classified as must-know (25, tested on quiz), encounter (25, seen in context), or bonus (23, enrichment). Games and scoring only use must-know terms. Flashcards show all tiers with "Bonus" badge on encounter/bonus cards.
- **Textbook-before-flashcards gating** — Students must read the textbook chapter for a category before its flashcards unlock. Creates a Read > Study > Practice > Play flow.
- **Reading level prompt** — First-time textbook users choose their reading level (Easier/On Grade/Challenge) before content loads.
- **"Read in textbook" deep-links** — Flashcard back face includes a link that jumps to the textbook section where the term appears in context.
- **Term unlock progress** — Flashcards show "X/25 key terms unlocked" when not all categories are available, with guidance to read the next chapter.
- **Locked category visibility** — Flashcard category filter shows locked categories greyed out with "(read chapter first)" label.
- **Source analysis lightbox** — Click any source image to see it full-screen with dark overlay. Close via X, click outside, or Escape.
- **3 new must-know terms** — Popular Sovereignty, Suffrage, Abolition added to westward-expansion unit.
- **14 new encounter terms** — Primary Source, Bias, Perspective, Assimilation, Frontier, Santa Fe Trail, Mormon Trail, Emigrant, Pioneer, Republic of Texas, Tall Tale, Legend, War of Aggression, States' Rights.
- **Bonus category** — 23 enrichment terms (Bank of the U.S., Sequoyah, Sam Houston, etc.) unlock after mastering all 4 main categories.

### Changed
- Westward Expansion unit is now the primary unit (password gate removed). Early Republic shown as greyed-out "Previous Unit."
- Term renames: annex > Annexation, Texas War for Independence > Texas Revolution, the Alamo > Alamo.
- Fill-in-blank sentences updated for renamed/new terms (16 total, all must-know answers).
- Simplified reading level updated to include all 25 must-know terms.
- Mastery nudge toast now suggests reading the next chapter when appropriate.

### Fixed
- Scoring pipeline (leaderboard, dashboard, progress, nudge, command palette) now filters to must-know terms only. Previously counted all 73 terms, inflating vocab scores.
- Source analysis images for westward expansion fixed (double-path bug).
- Magic link redirect now goes to dashboard instead of student engine.
- Practice test progress preserves existing fields on save (spread fix).
- Learn mode mastery percentage only counts must-know terms.

## [8.7.0] - 2026-04-09

*Intermediate release, superseded by 8.8.0*

## [8.6.0] - 2026-03-31

### Added
- **Sort It Out** — Category sorting game with streak bonuses and speed timer. Terms appear one at a time, student taps the correct category bucket. 1.25x scoring tier.
- **Who Am I?** — Progressive clues game. Guess the term with fewer clues for more points (5/4/3/2). Clues progress from a distinguishing hint to full definition. 1.25x scoring tier.
- **Four Corners** — Odd-one-out game. 4 terms shown, 3 share a category, find the one that does not belong. 8-second timer with time bonus. 1.25x scoring tier.
- **Learn Mode mini-game breaks** — Every ~6 slides, a quick 3-question mini-game appears (rotating Sort It Out, Who Am I?, Four Corners). Uses recent session terms and feeds multi-source mastery.
- **Multi-source mastery** — Terms can now be mastered through flashcards (instant), 2+ different activities, or 3+ correct answers in the same activity. Categories unlock faster for engaged students.
- **Scoring tiers (westward-expansion)** — Analysis games earn 1.25x, recognition games earn 0.75x. Learn Mode stays highest at 1.5x+. Incentivizes deeper activities without punishing easier ones.
- **Learn Mode streak bonus** — Consecutive daily Learn Mode sessions earn escalating multipliers: Day 1 (1.5x), Day 2 (1.75x), Day 3+ (2.0x). Streak badge shown on home screen.
- **Smart nudges** — Gentle toast suggestions guide students toward Learn Mode and higher-order games. Max 2 per session, never shaming.
- **Activity ordering by impact** — Games section now shows highest-impact activities first (Sort It Out, Who Am I?, Four Corners at top; Term Catcher at bottom)

## [8.4.1] - 2026-03-30

### Added
- **Per-unit music playlists** -- Music player now loads unit-specific tracks. Westward Expansion unit has 23 period-appropriate tracks (Stephen Foster, Civil War songs, spirituals, frontier folk)

### Fixed
- "New best time!" message now displays correctly on first perfect score
- Union States quiz count corrected from 20 to 19
- MC distractors drawn from filtered quiz subset (not all 42 regions)
- Quiz progress saved per subset (union, confederate, etc.) so scores do not overwrite each other
- Border state badge contrast improved for WCAG AA compliance
- Null guard on getBBox prevents crash if SVG group not found
- Minimum quiz time floor scales with region count (not hardcoded 45s for all subsets)

### Removed
- Cleaned up unused planning documents, teacher handouts, export scripts, and source screenshots from repository

## [8.4.0] - 2026-03-30

### Added
- **States & Territories, 1861 Map Quiz** — Interactive SVG map of all 42 states and territories on the eve of the Civil War, available in the westward-expansion unit
- **Map Learn Mode** — Click any region to see a tooltip with name, allegiance (Union/Confederate/Border/Territory), year of statehood or territorial establishment, and capital as of 1861. Regions color-coded by allegiance (blue=Union, red=Confederate, gold=Border, green=Territory)
- **Map Quiz Mode** with 6 subset options: All Regions (42), States Only (34), Territories Only (8), Union States (20), Confederate States (11), Border States (4)
- **Mobile Learn Mode** — Card list grouped by States/Territories with allegiance badges; small context map highlights the region when a card is tapped
- **Mobile Quiz Mode** — Context map with highlighted target region and 4 multiple-choice buttons; distractors filter out already-answered regions
- **Quiz UX** — Explore counter in Learn mode ("8 of 42 explored"), mid-quiz encouragement ("Halfway there!", "Almost done!", "Last one!")
- **Keyboard navigation** — All SVG regions have tabindex, role=button, aria-label, and Enter/Space support
- **Accessibility** — aria-live on quiz prompts, focus-visible on MC buttons, strikethrough on wrong MC answers, role=img on mobile SVG
- **Achievement integration** — Perfect score, speed (under 2 min), and completion achievements for 1861 quiz
- **Leaderboard integration** — Scores submitted on perfect quiz completion
- **Region data module** — `study-tools/engine/js/data/map-1861-data.js` with allegiance fields, pre-built ID lookup map for O(1) access

### Fixed
- Missing `var self = this` in dashboard `loadLeaderboardPreview()` causing "Failed to load leaderboard" error
- Service worker cache not invalidating on new deployments

## [8.3.0] - 2026-03-27

### Added
- **Learn Mode** — Guided study activity inspired by Seneca Learning. Presents content as short, interactive slides with adaptive depth (3-tier system), pre/post assessments with growth tracking, structured reflection prompts, and an always-available Wonder button for capturing student thinking
- **Wiki Writer** — Bonus challenge after Learn Mode sessions where students write Simple Wikipedia-style entries for terms they studied (+10 min bonus points, 1 per day). Best entries can become real Wikipedia contributions
- **Unit-specific reflection prompts** — Each unit has tailored reflection questions tied to its essential question and themes, loaded from config.json
- **1.5x points multiplier** for Learn Mode (rewards deeper study over games)
- **30-minute daily cap** for Learn Mode (vs 15 min for other activities)
- **Dashboard: Wiki Entries tab** — View student wiki submissions filterable by term
- **Dashboard: Forgot Password** — Password reset flow with email link and update form
- **Dashboard: Unit filter** — Now loads all configured units from units.json

### Added (Westward Expansion Unit)
- **New unit: Westward Expansion & Reform** — Complete second study unit behind password gate
- 56 vocabulary terms across 4 categories (Jackson's America, Westward Trails, War & Compromise, Two Americas)
- 31 practice questions, 5 short answer, 16 fill-in-blank, 4 typing passages
- 16 timeline events with month precision
- 16 sourced historical quotes, 16 sourced fun facts (all URLs verified)
- 4 textbook chapters with 20 sections at 3 reading levels each
- 16 source analysis sources (cartoons, maps, painting, primary documents)
- SVG territorial expansion map quiz with 8 accurate regions (Seterra-sourced paths)
- 16 portrait images, 15 vocab images from Wikimedia Commons
- Sunset Trail color theme (warm brown dark mode background)
- 18 activities enabled (all except SIFT)

### Changed
- **Activity cap messages** — Now show dynamic remaining time and are clearer about the per-activity daily limit
- **Terms mastered indicator** — Only shows on flashcards card, not every activity
- **Textbook description** — Generic instead of "Early Republic" specific
- **Dark mode backgrounds** — Unit-specific via theme config (bgDeep/bgCard/bgElevated/bgSurface)
- **Source analysis** — Refactored for multi-unit support (unit-specific source data)
- **Map quiz** — Refactored for multi-unit support (unit-specific regions, descriptions, draw order)
- **Fun facts** — Engine now supports object format with text/source/sourceUrl (backward compatible with plain strings)
- **Resources** — Added simpleWikiUrl override for terms without Simple Wikipedia pages

### Fixed
- Map quiz crash from missing unitId argument in MasteryManager call
- Broken quote source URLs replaced with verified Wikiquote/TSHA links
- Broken Avalon Law Yale URL for Declaration of Sentiments
- Bear Flag Republic wiki links pointing to nonexistent pages
- 19 Simple Wikipedia links for terms without pages

## [7.6.3] - 2026-03-11

### Added
- **Unit filter** — Dropdown to filter scores, leaderboard, and vocab insights by unit
- **Sortable columns** — Click any column header to sort ascending/descending on all dashboard tables (overview, students, scores, leaderboard)
- **Vocab Insights tab** — Shows which terms students find hardest based on flashcard ratings, with difficulty bars and alerts for terms rated hard by 40%+ of students
- **Leaderboard tab** — Read-only preview of all student rankings (pending entries shown dimmed)
- **Overview leaderboard** — Top 10 students shown inline below overview stat cards
- **Teacher account restriction** — Dashboard login restricted to authorized email only

### Fixed
- **Student delete** — Missing RLS DELETE/UPDATE policies on students table prevented deletion; added policies to Supabase
- **Dashboard leaderboard sync** — Overview and Leaderboard tabs now show all entries (including pending) instead of only approved
- **Class filter on Scores tab** — Was ignored; now filters server-side
- **Approve All respects filters** — Only approves visible (filtered) entries, not all
- **Vocab Insights rating mismatch** — Flashcards use "again/hard/good/easy" not "hard/medium/easy"; ratings now mapped correctly
- **Sort arrow icons** — Were showing raw `u25B2` text instead of ▲/▼ symbols

### Changed
- **Dashboard loading speed** — All queries parallelized with Promise.all; eliminated duplicate class lookups and sequential awaits
- **Reusable sortable table helper** — Shared `_sortableTable` utility replaces per-tab sort implementations

## [7.5.0] - 2026-03-10

### Changed
- Internal dashboard performance improvements (overview query parallelization)

## [7.4.0] - 2026-03-10

### Added
- **Map quiz bonus points** — Perfect map runs (100%) earn bonus points: `max(0, 180 - seconds)`, rewarding speed
- **Map Speed Run leaderboard tab** — Fastest perfect map times ranked separately with podium
- **Score formula explanation** — "Vocab (×10) + Test Score + Study Min + Map Bonus = Total" shown above rankings
- **Map bonus column** — Map time and bonus visible in Top Students stats and teacher dashboard

### Changed
- Leaderboard composite score now includes map bonus in calculation

## [7.3.0] - 2026-03-09

### Fixed
- **Study time tracking** — All students showed 0 minutes in teacher dashboard due to three bugs:
  - Returning students never got a session row created (startSession not called on page load)
  - Session end used async/await during page unload which browsers ignore; replaced with keepalive fetch
  - Leaderboard study_time_seconds not updated on page close; now synced via keepalive fetch and periodic sync loop
- **Dashboard study time source** — Now reads from progress table studyTime (more reliable) with sessions fallback

### Added
- **"Continue Studying" home button** — Prominent CTA on the home page that routes directly to flashcards (or practice test if all vocab mastered), with progress hint
- **Enforced flashcard rating** — Next button and arrow keys disabled until student flips and rates the card; prevents skipping without engaging
- **Collapsed flashcard controls** — Category filter, shuffle, and help buttons hidden behind an "Options" toggle to reduce visual clutter

## [7.2.0] - 2026-03-08

### Fixed
- **Textbook tab highlighting** — Active section tab now correctly highlights when navigating
- **Textbook listener leak** — Removed stale event listeners on section switch
- **Textbook toggle icon** — Sidebar collapse icon now updates correctly

## [7.1.0] - 2026-03-08

### Added
- **Textbook activity** — Interactive reading experience with full Early Republic content (4 segments, 24 sections):
  - 3 non-stigmatizing reading levels: Easier, On Grade, Challenge
  - Collapsible sidebar navigation with section tabs
  - Vocab term highlighting with popup definitions
  - Primary source quotes, Key Idea callouts, Stop & Think prompts, Quick Check quizzes
  - Per-section "Mark as Read" with progress tracking
  - Remembers last position and reading level across sessions
  - Always accessible (no mastery gating)

### Changed
- Textbook layout — compact top bar (segment nav + level picker in one row), vertical sidebar tabs replace horizontal pills

## [7.0.3] - 2026-03-07

### Fixed
- **Source Analysis** — "Begin Analysis" button was broken (missing variable declaration caused silent error)
- **SIFT Practice** — Source URLs are now clickable links that open in a new tab
- **Activity card ordering** — Cards on Practice and Games tabs no longer shuffle randomly; order matches config

### Removed
- **Sketch & Match** — Disabled until unique images are available per term (shared images made matching impossible)

## [7.0.0] - 2026-03-07

### Added
- **SIFT Practice activity** — Evaluate 6 real sources about the Early Republic using the SIFT method (Stop, Investigate, Find, Trace):
  - 3 reliable sources: Founders Online (National Archives), Mount Vernon Digital Encyclopedia, Monticello Spurious Quotations
  - 3 unreliable sources: PragerU AI-generated founding father videos, QuoteFancy unsourced quotes, Pinterest quote boards
  - Guided SIFT walkthrough with note-taking for each step
  - Reliable/Unreliable verdict buttons with scoring
  - Results page with detailed explanations, SIFT breakdowns, and student notes review
  - Source screenshots, metadata (author, URL, date, publication)

### Changed
- **Source Analysis** — Removed SIFT method card from intro (moved to dedicated SIFT Practice activity); now focuses on primary vs. secondary source identification

## [6.6.0] - 2026-03-07

### Added
- **Auto-update on version change** — App detects new versions, clears service worker caches, and reloads automatically; no more manual hard-refresh needed

### Removed
- **YouTube links from Resource Library** — Removed due to ads; students now have Simple English Wikipedia and Wikipedia (both ad-free)

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
