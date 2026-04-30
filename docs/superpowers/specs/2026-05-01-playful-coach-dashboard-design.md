# Playful Coach Landing Page and Dashboard Design

## Goal

Build a playful landing page followed by a comprehensive, friendly coach dashboard for Shame The Web. The experience should feel memorable and loud at the top, then become clear, useful, and educational once the user reaches the dashboard.

## Design Direction

Use the `design.json` language as the base:

- Dark rounded application shell with a light content canvas.
- Soft neutral cards, generous spacing, and very rounded geometry.
- Sparse lime and lavender accents for emphasis and charting.
- Playful, simple data visualizations instead of dense tables.
- Premium consumer dashboard feel, not an enterprise analytics tool.

Use the Kablammo font only for high-personality landing-page moments, such as the hero headline and short expressive callouts. Keep dashboard metrics and body content in the existing readable sans-serif stack.

## Page Structure

The dashboard app remains a single React page with in-page anchor navigation instead of adding a routing dependency. Landing-page buttons route users into dashboard sections by linking to anchors:

- `#dashboard`
- `#scores`
- `#offenders`
- `#history`

This gives the product a routed feel while keeping implementation simple and aligned with the current Vite React app.

## Landing Page

The landing page should include:

- A loud hero section with playful copy around the idea that slow websites deserve public shame.
- Primary CTA: "Open Dashboard" linking to `#dashboard`.
- Secondary CTAs for scores/history sections.
- A concise explanation of the product loop: install, browse, get scored, learn what to fix.
- Brand-forward visual cards using the same rounded, lime/lavender dashboard language.

Suggested hero content:

- Headline: "The web has been getting away with murder."
- Supporting copy: "Shame The Web watches real browsing performance, scores the pages you visit, and turns slow sites into teachable roast material."

## Dashboard

The dashboard should use a dark sidebar and light main canvas inside a rounded outer frame. It should feel like a friendly coach, not just a stats dump.

Core sections:

- Overview metrics: total roasts, unique sites, average speed score, average overall score.
- Coach summary: current shame grade, best site, worst offender, strongest category, weakest category.
- Score analytics: speed, responsiveness, stability, and polish category bars.
- Trend snapshot: recent visit scores represented as simple rounded bars.
- Offender leaderboard: worst sites with score context and short coach copy.
- Performance metrics: average load, FCP, LCP, and DOM interactive values when available.
- Educational cards: short explanations of why speed, responsiveness, stability, and polish matter.
- Roast history: recent visits with hostname, roast message, score, and timestamp context.

Quick actions:

- Review worst offender, anchored to `#offenders`.
- Jump to history, anchored to `#history`.
- Learn score rules, anchored to education content.
- Open extension, presented as a CTA affordance even if it remains informational for now.

## Data And Behavior

Use existing dashboard data only:

- `VisitRecord`
- `DashboardStats`
- `categoryScores`
- `metrics`
- `roast`

Add dashboard-layer helpers for derived display data:

- Top/worst hosts.
- Average category scores.
- Recent trend slices.
- Average timing metrics.
- Coach copy based on score ranges.
- Empty states for users without visits.

No backend, extension, or shared type changes are required unless implementation reveals a small shared helper would reduce duplication.

## Empty State

When no local profile or visits exist, the page should still feel designed:

- Landing page remains fully populated.
- Dashboard cards show clear zero states and short guidance.
- History explains that the user should create a local profile in the extension popup and browse a few sites.

## Verification

After implementation:

- Run dashboard typecheck/build.
- Check lints for edited files.
- If possible, run the dev server and visually verify the landing-to-dashboard flow.

