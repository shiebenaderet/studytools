# Class Rankings Visualization Design

**Date:** 2026-03-19
**Problem:** The teacher dashboard has a day-by-day replay panel for leaderboard snapshots, but no visual overview of how class rankings have changed over time. Teachers want to see trends at a glance and watch an animated replay.

**Goals:**
1. Add a line chart showing class average scores over time
2. Add an animated bar chart race showing class rankings evolving day by day
3. Keep the existing day-by-day replay panel alongside the new visualizations

---

## 1. Line Chart — Class Averages Over Time

A canvas-based line chart in the Overview tab, placed above the existing replay panel.

### Data
- Source: `leaderboard_snapshots` table (already used by existing replay)
- Groups snapshots by class and date, computes **average score per class per day** (total score / student count)
- One line per class
- Classes that don't appear on a given day are simply skipped (broken line) — no interpolation

### Layout
- X-axis: dates (all available dates from snapshots)
- Y-axis: average score
- Legend below the chart showing class name + color swatch
- Hover tooltip: a positioned DOM `<div>` (not canvas-drawn) — positioned via mousemove hit-testing against data point coordinates. Shows class name, date, and exact average.
- Responsive width (fills container), fixed height (~250px). Listen for `resize` events and redraw canvas.
- Scale canvas backing store by `window.devicePixelRatio` for sharp rendering on Retina/HiDPI screens.

### Colors
Preset palette of 5-6 distinct colors, assigned to classes in a consistent order. Same colors used in the bar chart race.

### Edge Cases
- **0 classes** (all students have null class_id): Show empty state message: "No class data available for this unit."
- **1 day of data**: Show a single-point chart with a note: "More days of data needed to show trends."

---

## 2. Bar Chart Race — Animated Class Rankings

A canvas-based animated horizontal bar chart below the line chart.

### Layout
- Horizontal bars, one per class, sorted by average score (highest on top)
- Bar width proportional to score
- Class name label on the left of each bar
- Score value displayed on the right end of each bar
- Current date displayed prominently above the bars

### Animation
- Bars smoothly animate between days using `requestAnimationFrame`
- Rank changes: bars slide up/down with easing
- Score changes: bars grow/shrink with easing
- Transition duration determined by speed setting (default: 2 seconds per day at 1x speed)
- Classes appearing mid-animation: bar grows in from zero width
- **Cleanup:** Cancel any running `requestAnimationFrame` when the teacher switches tabs, changes filters, or the container is removed. Store the animation frame ID and call `cancelAnimationFrame()` on cleanup.

### Controls
- **Play/Pause button** — toggles between play (`fa-play`) and pause (`fa-pause`) icons
- **Speed slider** — range 0.5x to 3x, default 1x (2 seconds per day). Labeled "Speed" with a readout showing current value (e.g., "1.5x")
- **Progress indicator** — text showing "Day N of M"

### Behavior
- Starts paused on day 1
- Press play to animate through each day sequentially
- Pauses automatically when it reaches the last day
- Speed slider adjustable while playing (takes effect on next day transition)
- Pressing play after reaching the end restarts from day 1
- With only 1 day of data: show static bars, disable play button

### Colors
Same palette as the line chart for consistency.

---

## 3. Data & Integration

### Data Fetching
Single bulk query to fetch all snapshots for the current unit/class filter. Use an explicit `.limit(5000)` to avoid Supabase's default 1000-row cap (5 classes x 30 students x 30 days = 4,500 rows max):
```
leaderboard_snapshots: student_id, score, class_id, snapshot_date
```
Group and compute averages client-side. This provides all data for both the line chart and bar race.

### Class Name Resolution
The method receives the `classes` array (already fetched by `_renderOverview`) and builds a `classNameMap` from it, same pattern as `_renderReplay`.

### Placement
New section in the Overview tab, between the existing class leaderboard cards and the existing replay panel. Wrapped in a container with heading "Class Rankings Over Time."

### No Database Changes
Everything uses existing `leaderboard_snapshots` table and columns.

---

## 4. Bug Investigation

The existing replay panel's prev/next day buttons reportedly don't change the day. Will investigate during implementation — likely either a data issue (only 1 day of snapshots making both buttons disabled) or an event handler problem. Fix if it's a real bug.

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `dashboard/rankings-viz.js` | New file: `RankingsViz` object with line chart rendering, bar race animation, data processing, and canvas utilities |
| `dashboard/dashboard.js` | Call `RankingsViz.render()` from `_renderOverview()`, pass container + data + class map |
| `dashboard/dashboard.css` | Styles for chart containers, controls, legend, tooltip div |
| `dashboard/index.html` | Add `<script>` tag for `rankings-viz.js` |

The visualization code goes in a separate file to avoid bloating `dashboard.js` (already ~2,400 lines). The `RankingsViz` object handles all canvas drawing, animation, and controls. Dashboard just calls it with the data.
