# States & Territories, 1861 — Map Quiz Design

**Date:** 2026-03-30
**Unit:** westward-expansion
**Status:** Design approved

## Overview

Add a second interactive SVG map quiz to the westward-expansion unit: "States & Territories, 1861." This map shows all 42 states and territories on the eve of the Civil War. It appears as a new card in the existing westward-expansion mode selector alongside the Territorial Expansion map and image quizzes.

The map has two modes: **Learn** (exploratory, click to see info) and **Quiz** (identify regions by clicking). Mobile gets a tailored experience with list-based Learn mode and multiple-choice Quiz mode.

## Mode Entry & Navigation

- New card in the westward-expansion mode selector grid
- **Title:** "States & Territories, 1861"
- **Icon:** `fas fa-flag-usa`
- **Description:** "Explore and identify all 42 states and territories on the eve of the Civil War"
- Clicking the card opens the map in **Learn mode by default**
- Top bar has a "Start Quiz" button to switch to Quiz mode
- Quiz mode top bar has "Back to Learn" to return

## Learn Mode (Desktop/Chromebook)

- Full SVG map, viewBox `0 0 900 700`, uniform coloring in unit theme
- All 42 regions rendered with hover effects (lighten on hover, cursor pointer)
- Top bar: map title on left, "Start Quiz" button on right

### Tooltip on Click

- Appears near the clicked region, positioned to stay within map bounds
- Content:
  - **Region name** (bold)
  - **Status line:** e.g., "State since 1788" or "Territory since 1854"
  - **Capital:** e.g., "Capital: Topeka" or "No formal capital"
- Only one tooltip visible at a time; clicking another region replaces it
- Clicking map background dismisses the tooltip
- Clicked region gets a highlight (brighter fill or outline) to indicate selection

### No scoring or progress tracking in Learn mode

## Quiz Mode (Desktop/Chromebook)

Triggered by clicking "Start Quiz" from Learn mode.

### Gameplay

- Shuffled queue of all 42 regions
- Prompt at top: "Click on: **Kansas**"
- Score counter: "0/42"
- Timer running
- Click correct region: flash green, advance to next
- Click wrong region: flash red, increment mistakes, region re-enters queue
- Hint: after 2 wrong clicks on same region, briefly highlight correct one

### End Screen

- Score percentage and time
- "Back to Learn" and "Try Again" buttons
- Integrates with ProgressManager (stored under key `map-quiz-1861` to avoid collision with territorial expansion scores)
- Leaderboard integration via existing infrastructure

## Mobile Mode

### Detection

Screen width below 768px.

### Mobile Learn Mode

- **No interactive map** (regions too small to tap accurately)
- Scrollable **list of all 42 regions** grouped by category (States / Territories), styled as cards
- Each card shows: region name, status (State/Territory since XXXX), capital
- Optional small static map at top for geographic context (not interactive)

### Mobile Quiz Mode

- Full map visible at top, scaled to fit screen width (for visual context only, not tappable)
- Target region highlighted in a distinct color on the map
- Below the map: **4 multiple choice buttons**
  - 1 correct answer + 3 random distractors from remaining regions
  - Distractors pulled from unanswered regions
- Correct answer: button flashes green, region on map fills green, advance
- Wrong answer: button flashes red, correct button highlights, region re-enters queue
- Score and timer in top bar same as desktop

## Data Structure

Each region stored as:

```js
{
    id: 'kansas',
    name: 'Kansas',
    paths: ['M ...'],        // array to handle multi-path regions
    year: 1861,
    status: 'state',         // 'state' or 'territory'
    capital: 'Topeka'
}
```

### Multi-Path Regions

These regions have multiple SVG paths rendered as multiple `<path>` elements inside one `<g>` group:

- **California:** 4 paths (mainland + islands)
- **Virginia:** 2 paths (mainland + eastern shore)
- **Michigan:** 3 paths (lower peninsula, upper peninsula, small island)
- **Maryland:** 2 paths (mainland + small piece)

### Historical Data (as of 1861)

All years, statuses, and capitals reflect the state of affairs in 1861. Indian Territory shows "No formal capital."

## Technical Details

### ViewBox Handling

The 1861 map uses viewBox `0 0 900 700`. The existing early-republic map uses `0 0 960 700` and the territorial expansion map uses `0 0 900 700`. The `_buildGameUI` method needs to accept a dynamic viewBox based on active map.

### Draw Order

Large territories rendered first (Washington Territory, Dakota Territory, Nebraska Territory, New Mexico Territory, Utah Territory, etc.), then mid-size states, then small eastern states on top. This ensures small states remain clickable.

### Progress Tracking

Stored under separate key `map-quiz-1861` via ProgressManager so scores don't collide with existing territorial expansion quiz.

### 42 Regions

**States (34):**
Alabama, Arkansas, California, Connecticut, Delaware, Florida, Georgia, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, New Hampshire, New Jersey, New York, North Carolina, Ohio, Oregon, Pennsylvania, Rhode Island, South Carolina, Tennessee, Texas, Vermont, Virginia, Wisconsin

**Territories (8):**
Colorado Territory, Dakota Territory, Indian Territory, Nebraska Territory, Nevada Territory, New Mexico Territory, Utah Territory, Washington Territory
