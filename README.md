# Local Government Explorer

## Overview

TheLocal Government Explorer UI is a lightweight interface for exploring local government activity in a structured, accessible way.

Instead of navigating full city council meetings, this UI presents:

- Projects (ongoing or completed civic initiatives)
- Grouped by category
- With clear summaries, timelines, and key signals

The goal is simple:

> Help residents, journalists, and stakeholders quickly understand what their city is doing—and why it matters.

---

## Core Concepts

### Projects (Primary Unit)

A project represents a real-world civic initiative that may span:
- multiple meetings
- multiple votes
- weeks or months of discussion

Each project acts like a living briefing page.

---

### Categories (Navigation Layer)

Projects are grouped into high-level categories such as:

- Infrastructure & Transportation  
- Housing & Development  
- Public Safety  
- Community & Social Services  
- Economic Development & Downtown  
- Governance & Policy  
- City Operations & Finance  
- Environment & Sustainability  
- Community Recognition & Ceremonial  

---

### Signals (At-a-glance indicators)

- 💬 Public input occurred  
- ⚠ Open questions remain  
- 💰 Money involved  

---

## UI Structure

### Sidebar

- Category accordion list
- Project count per category
- Expand/collapse interaction
- Search bar (future)

Each project row includes:
- Title
- Status badge
- Signals (optional)

---

### Main Panel (Project Detail View)

Displays structured project briefing.

---

## Project Detail Layout

### Header
- Category label
- Project title
- Status
- Last action date
- Total discussion time

### Summary
Plain-language explanation.

### Why This Matters
Local impact explanation.

### Key Metrics
- Funding
- Votes
- Contractors

### Timeline
Chronological actions.

### Open Questions
Unresolved issues.

### Council Discussion
Summary of deliberation.

### Public Input
Community feedback.

---

## Design Philosophy

### Meetings → Projects
Transforms raw meetings into structured knowledge.

### Compression, not simplification
Maintains nuance while improving clarity.

### Time matters
Tracks continuity across meetings.

### Scan → Dive
Supports quick browsing and deep reading.

---

## Data Model

```json
{
  "project_id": "string",
  "category": "string",
  "one_sentence_summary": "string",
  "status_label": "introduced | active | approved | denied | deferred | complete | no_formal_action",
  "current_status": "string",
  "last_action_date": "YYYY-MM-DD",
  "total_time_spent_this_term_seconds": number,
  "money_adopted_total": number,
  "vote_count": number,
  "split_vote_count": number,
  "top_unresolved_questions": ["string"],
  "recent_timeline": [
    {
      "date": "YYYY-MM-DD",
      "summary": "string"
    }
  ],
  "public_input_summary": "string | null",
  "council_discussion_summary": "string | null",
  "why_this_matters_locally": "string"
}
```

## Goal

Enable users to answer:

- What is my city working on?
- What decisions were made?
- What issues remain unresolved?

Without watching full meetings.
