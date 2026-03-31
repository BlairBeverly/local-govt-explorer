# Champaign Civic Tracker

## Overview

Champaign Civic Tracker is a lightweight frontend for browsing structured local-government project data.

Instead of organizing information around meetings, the app organizes it around **projects**: ongoing civic stories like street work, housing policy, public safety issues, and downtown development.

The app is designed to answer a few fast questions:

- What is the council working on right now?
- What got approved?
- Which projects have money, votes, comments, or long discussion behind them?
- Why might a resident care?

The UI is intentionally more like a civic feed than a dashboard.

## Frontend Structure

### Feed-first layout

It now has:

- a desktop hero with summary stats
- a simplified mobile header
- a sticky filter bar
- a responsive grid of project cards
- a slide-in detail panel on desktop
- a full-screen detail sheet on mobile

### Filter model

There are two kinds of filter chips:

- **Topic chips**: single-select
  - selecting a new topic replaces the previous topic
  - selecting the active topic clears it
- **Attribute chips**: multi-select
  - these can be combined freely

The search input filters live across:

- title
- hook
- category label
- summaries
- quotes
- open questions

## Card Design

Each project card is built around four layers:

1. **Top signal row**
   - up to three factual badges
   - a status pill on the right
2. **Headline row**
   - emoji
   - short project title
3. **Hook**
   - short editorial lead in serif
4. **Footer**
   - category
   - last action date

### Card badges

Cards prioritize these factual signals:

- funding amount
- public comments
- discussion time
- vote result

### Card status labels

Visible status labels include:

- `approved`
- `active`
- `time-sensitive`
- `no action`

Note: `time-sensitive` is still derived in the frontend from heuristic logic. That should eventually move into backend-owned data.

## Detail Panel

The detail experience is a structured briefing page.

### Top of panel

- category tag
- status pill
- title
- last action date
- total discussion time
- editorial lead (`hook`)

### Main briefing sections

- `What happened`
- `Why this matters`
- `Key metrics`
- `Open questions` (only if present)
- `Public input` (only if present)
- `Council discussion` (only if present)
- `Notable quote` (only if present)
- `Timeline`
- `Primary sources` (only if actual links are present)

### Detail panel behavior

- desktop: right-side slide-in panel
- mobile: full-screen bottom sheet

The detail page header includes:

- category tag
- status pill
- title
- last action date
- total discussion time
- editorial lead (`hook`)

Primary sources appear only when actual source links are available.

## Responsive Behavior

### Mobile

- simplified header: year + single headline
- no mobile stats row
- single-column card layout
- detail panel becomes full-screen

### Mid breakpoint

- cards render in **two columns**
- cards keep the larger desktop-style proportions instead of shrinking early

### Large desktop

- cards render in **three columns**
- wider content width
- larger chips, hero stats, and detail panel

## Data Model Used By The Frontend

The app reads `data/project_views.jsonl`.

Core fields used directly:

- `project_id`
- `category`
- `governing_body`
- `one_sentence_summary`
- `status_label`
- `current_status`
- `last_action_date`
- `total_time_spent_this_term_seconds`
- `money_discussed_total`
- `money_adopted_total`
- `money_latest_adopted`
- `vote_count`
- `split_vote_count`
- `public_comment_count`
- `top_unresolved_questions`
- `recent_timeline`
- `notable_quotes`
- `public_input_summary`
- `council_discussion_summary`
- `why_this_matters_locally`
- `linked_meeting_segments`
- `tracking_class`

Additional frontend-supported fields used when present:

- `hook`
- `emoji`
- future source-link fields such as bill text / meeting video URLs

## Important Frontend-derived Fields

The frontend creates several display fields because the source data does not consistently provide them yet.

These are the main ones:

- short display title
- hook fallback
- emoji fallback
- status class
- council action
- vote result
- source-link normalization
- time-sensitive classification

Those heuristics live in [app.js](/Users/blairbeverly/projects/localgovtexplorer/app.js) and should eventually be replaced by backend-owned data fields where possible.

## Local Development

Serve the app with a local web server from the repo root:

```bash
python3 -m http.server 8000
```

Then open:

[http://localhost:8000](http://localhost:8000)

## Tech Notes

- no build step
- plain HTML, CSS, and JavaScript
- data is loaded client-side from `data/project_views.jsonl`
- visual design uses:
  - `Inter` for interface/body copy
  - `Fraunces` for headline/editorial moments

## Data Pipeline Priorities

The next major improvement is shifting these responsibilities into the data pipeline:

- backend-owned plain-language `display_title`
- backend-owned `hook`
- backend-owned `council_action`
- backend-owned `vote_result`
- backend-owned `primary_sources`
- optional backend-owned `attention_level`

With those fields in place, the frontend can become simpler and more predictable.
