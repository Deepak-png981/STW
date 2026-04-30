# Detailed Product And UX Plan: Playful Coach Landing Page + Dashboard

## Product Goal

Build a memorable, playful landing page followed by a useful coaching dashboard for **Shame The Web**.

The user experience should have two distinct emotional modes:

1. **Landing page:** loud, funny, expressive, brand-first.
2. **Dashboard:** calm, clear, helpful, educational, and action-oriented.

The product should not feel like an enterprise analytics dashboard. It should feel like a friendly performance coach with a roast-comedy wrapper: playful enough to be memorable, but structured enough that users understand what happened, why it matters, and what they can do next.

---

# 1. User Perspective

## What the user cares about

A user opening Shame The Web likely wants to know:

* What is this?
* Why should I care?
* Is it fun or useful?
* What is being measured?
* Which sites are bad?
* Am I being judged, or are the websites being judged?
* What should I do next?
* What does each score mean?
* Is my browsing history exposed?
* What happens if I have no data yet?

The design should answer these questions naturally through the page flow.

---

## Primary user journey

### Step 1: User lands on the page

The user should immediately understand the personality of the product.

They should see:

* A bold, funny headline.
* A short explanation of what Shame The Web does.
* A clear button to open the dashboard.
* A few playful visual cards previewing the product.

The first impression should be:

> “This is funny, but it also seems useful.”

---

### Step 2: User scrolls through the landing page

The user should learn the product loop in simple terms:

1. Install or open the extension.
2. Browse the web normally.
3. Shame The Web scores visited pages.
4. The dashboard turns bad performance into roasts and educational insights.

This should be easy to understand without reading dense paragraphs.

---

### Step 3: User clicks “Open Dashboard”

The page should jump smoothly to `#dashboard`.

The dashboard should feel like entering the actual app:

* Dark rounded shell.
* Sidebar navigation.
* Light main canvas.
* Clear dashboard sections.
* Helpful score summaries.
* Playful but not chaotic.

---

### Step 4: User reviews their performance summary

The first dashboard view should answer:

* How much data do I have?
* How bad is the web I have been browsing?
* What is my current shame grade?
* Which site is the worst offender?
* Which site performed best?
* What category is hurting the most?

The dashboard should not force the user to interpret raw data first.

---

### Step 5: User investigates problem areas

The user should be guided toward useful sections:

* Scores
* Offenders
* History
* Education
* Extension action

Each section should answer a user question:

| User Question                 | Dashboard Section    |
| ----------------------------- | -------------------- |
| “How bad is it overall?”      | Overview metrics     |
| “What score did I get?”       | Coach summary        |
| “Which category is weakest?”  | Score analytics      |
| “Which sites are the worst?”  | Offender leaderboard |
| “Has performance improved?”   | Trend snapshot       |
| “What do these metrics mean?” | Educational cards    |
| “What pages did I visit?”     | Roast history        |

---

# 2. Design Principles

## Personality balance

The landing page can be loud and silly.

The dashboard should be playful but controlled.

A good rule:

* **Landing page:** 70% personality, 30% utility.
* **Dashboard:** 30% personality, 70% utility.

This keeps the experience entertaining without making the actual data hard to read.

---

## Visual direction

Use the existing `design.json` language as the source of truth.

The page should use:

* Dark rounded application shell.
* Light canvas for dashboard content.
* Soft neutral cards.
* Generous spacing.
* Rounded card corners.
* Sparse lime accents.
* Sparse lavender accents.
* Playful charts.
* Minimal tables.
* Friendly labels and coach-style copy.

Avoid:

* Dense data grids.
* Enterprise analytics styling.
* Harsh red/green status colors everywhere.
* Too many competing accent colors.
* Overusing Kablammo in dashboard content.

---

## Font usage

Use **Kablammo** only for expressive, brand-heavy moments:

* Hero headline.
* Small landing-page callouts.
* Maybe one or two decorative labels.

Do not use Kablammo for:

* Dashboard metrics.
* Body text.
* Score labels.
* History rows.
* Educational explanations.
* Navigation items.

The dashboard should stay readable and calm.

---

# 3. Page Architecture

The app should remain a **single React page**.

Do not add routing.

Use in-page anchor navigation to create a routed feeling:

```txt
#dashboard
#scores
#offenders
#history
```

Recommended additional anchors:

```txt
#how-it-works
#education
#extension
```

This supports a simple navigation model while keeping implementation lightweight.

---

## Page order

Recommended structure:

1. Landing hero
2. Landing proof / feature cards
3. How it works
4. Dashboard shell
5. Overview
6. Coach summary
7. Score analytics
8. Trend snapshot
9. Offender leaderboard
10. Performance metrics
11. Educational cards
12. Roast history
13. Empty-state guidance, where needed

---

# 4. Landing Page Plan

## Purpose

The landing page should make users curious enough to open the dashboard.

It should quickly communicate:

* Shame The Web watches real browsing performance.
* It scores sites users visit.
* It roasts slow pages.
* It teaches users what the scores mean.
* The experience is local/dashboard-oriented rather than a public leaderboard.

---

## Landing page emotional target

The landing page should feel:

* Loud
* Funny
* Slightly chaotic
* Premium
* Friendly
* Not mean-spirited toward the user

The shame should be aimed at slow websites, not the person using the product.

---

## Hero section

### Content

Use the suggested hero headline:

> The web has been getting away with murder.

Supporting copy:

> Shame The Web watches real browsing performance, scores the pages you visit, and turns slow sites into teachable roast material.

Possible eyebrow text:

> A playful performance coach for your browser

Possible microcopy near CTAs:

> No spreadsheets. No corporate dashboards. Just scores, roasts, and useful clues.

---

## Hero CTAs

Primary CTA:

```txt
Open Dashboard
```

Links to:

```txt
#dashboard
```

Secondary CTA options:

```txt
See Scores
```

Links to:

```txt
#scores
```

```txt
View Roast History
```

Links to:

```txt
#history
```

Optional tertiary text link:

```txt
How it works
```

Links to:

```txt
#how-it-works
```

---

## Hero visual

The hero should include playful preview cards that hint at dashboard functionality.

Suggested cards:

### Card 1: Shame Grade

```txt
Current Shame Grade
B-
“Not cursed, just suspicious.”
```

### Card 2: Worst Offender

```txt
Worst Offender
example.com
42 / 100
“Loaded like it was walking uphill.”
```

### Card 3: Category Snapshot

```txt
Speed
Responsiveness
Stability
Polish
```

Use soft rounded progress bars instead of dense charts.

### Card 4: Roast Preview

```txt
Latest Roast
“This page showed up eventually, which is technically a strategy.”
```

These can use mock presentation data on the landing page, even if the dashboard uses real data.

---

## Landing page product loop

Create a section titled something like:

```txt
How the shame happens
```

Use four large steps:

### Step 1: Install

```txt
Add the extension
```

Short copy:

```txt
Create your local profile and let Shame The Web keep score while you browse.
```

### Step 2: Browse

```txt
Use the web normally
```

Short copy:

```txt
No special tests. The product watches real pages during real browsing.
```

### Step 3: Get scored

```txt
Every visit gets judged
```

Short copy:

```txt
Speed, responsiveness, stability, and polish roll up into a simple score.
```

### Step 4: Learn

```txt
Roasts become coaching
```

Short copy:

```txt
The dashboard explains what went wrong and which sites deserve another look.
```

---

## Landing page trust / clarity section

Because the product watches browsing performance, users may wonder about privacy.

Add a small, calm card:

```txt
Built around your local browsing context
```

Suggested copy:

```txt
The dashboard is designed around your local Shame The Web profile and recent visit records. It focuses on performance signals, scores, and roast history instead of turning your data into an enterprise report.
```

Keep this short. Do not overpromise anything that is not implemented.

---

# 5. Dashboard Layout Plan

## Overall dashboard shell

The dashboard should sit inside a large rounded outer frame.

Recommended structure:

```txt
<section id="dashboard">
  <div className="dark-app-shell">
    <aside className="sidebar" />
    <main className="light-dashboard-canvas" />
  </div>
</section>
```

---

## Dark sidebar

The sidebar should provide navigation and brand identity.

### Sidebar content

Include:

* Logo or product wordmark
* Short tagline
* Navigation links
* Quick action button
* Small status card

Suggested nav:

```txt
Overview        #dashboard
Scores          #scores
Offenders       #offenders
Education       #education
History         #history
```

Suggested sidebar status card:

```txt
Coach Mode
Watching for slow pages, weird delays, and layout chaos.
```

Suggested CTA:

```txt
Open Extension
```

This can be informational if no actual extension action exists yet.

---

## Main dashboard canvas

The main area should use a light background with neutral cards.

The top should include a friendly welcome:

```txt
Your web performance coach
```

Supporting text:

```txt
A quick read on the pages you visited, who performed well, and who deserves a tiny public shaming.
```

Include a small profile/data status line:

```txt
Based on 24 recent visits across 9 sites.
```

Empty-state version:

```txt
No visits yet. Create a local profile in the extension popup, browse a few sites, and your coach will start filling this in.
```

---

# 6. Dashboard Data Model Usage

Use only existing dashboard data:

* `VisitRecord`
* `DashboardStats`
* `categoryScores`
* `metrics`
* `roast`

Do not introduce backend changes.

Do not introduce extension changes.

Do not introduce shared type changes unless implementation clearly reveals a small helper that reduces duplication.

---

## Derived dashboard helpers

Add dashboard-layer helpers for display-only logic.

Recommended helpers:

```ts
getHostFromVisit(visit: VisitRecord): string
getTopHosts(visits: VisitRecord[]): HostSummary[]
getWorstHosts(visits: VisitRecord[]): HostSummary[]
getAverageCategoryScores(visits: VisitRecord[]): CategoryAverages
getRecentTrend(visits: VisitRecord[], limit?: number): TrendPoint[]
getAverageMetrics(visits: VisitRecord[]): AverageMetrics
getCoachGrade(score: number): CoachGrade
getCoachCopy(score: number): string
formatTiming(ms?: number): string
formatScore(score?: number): string
formatTimestamp(timestamp?: string | number): string
```

---

## Derived display concepts

### Best site

The host with the highest average overall score.

### Worst offender

The host with the lowest average overall score.

### Strongest category

The category with the highest average category score.

### Weakest category

The category with the lowest average category score.

### Recent trend

A small slice of recent visits, such as the last 8 or 10 visits.

### Average timing metrics

Average available values across visits:

* load
* FCP
* LCP
* DOM interactive

Ignore missing values rather than treating them as zero.

---

# 7. Dashboard Section Details

## Section A: Overview metrics

### Purpose

Give the user immediate orientation.

### User questions answered

* How much activity is there?
* How many sites have been judged?
* How good or bad is the average score?
* How many roasts exist?

### Cards

Recommended cards:

1. Total roasts
2. Unique sites
3. Average speed score
4. Average overall score

Each card should include:

* Label
* Large number
* Short coach-style sentence
* Optional small icon or accent pill

Example:

```txt
Total Roasts
128
“The archive is getting spicy.”
```

Empty state:

```txt
0
“No roasts yet. Browse a few sites to wake the coach up.”
```

---

## Section B: Coach summary

### Purpose

Translate data into human-readable coaching.

### User questions answered

* What is my current grade?
* What is the biggest issue?
* Which site is good?
* Which site is bad?
* Where should I look first?

### Cards

Recommended cards:

#### Current shame grade

```txt
Current Shame Grade
C+
“The web is functional, but it is not beating the allegations.”
```

#### Best site

```txt
Best Site
fastsite.com
92 / 100
“Clean. Snappy. Suspiciously responsible.”
```

#### Worst offender

```txt
Worst Offender
slowshop.com
38 / 100
“This page arrived like it had to ask permission.”
```

#### Category diagnosis

```txt
Weakest Category
Responsiveness
“Clicks should not feel like mailing a letter.”
```

---

## Shame grade system

Suggested grade mapping:

| Score Range | Grade | Tone                  |
| ----------: | ----- | --------------------- |
|      90–100 | A     | Excellent             |
|       80–89 | B     | Good                  |
|       70–79 | C     | Needs attention       |
|       60–69 | D     | Rough                 |
|        0–59 | F     | Public shame material |

Example helper:

```ts
function getCoachGrade(score: number) {
  if (score >= 90) return { grade: "A", label: "Shockingly decent", tone: "celebrate" };
  if (score >= 80) return { grade: "B", label: "Mostly respectable", tone: "positive" };
  if (score >= 70) return { grade: "C", label: "Not cursed, just suspicious", tone: "mixed" };
  if (score >= 60) return { grade: "D", label: "Performance probation", tone: "warning" };
  return { grade: "F", label: "Public shame material", tone: "danger" };
}
```

Use playful language, but do not make it hostile toward the user.

---

## Section C: Score analytics

Anchor:

```txt
#scores
```

### Purpose

Show category-level scoring clearly.

### Categories

* Speed
* Responsiveness
* Stability
* Polish

### Visualization

Use large rounded horizontal bars.

Each row should include:

* Category name
* Score
* Coach phrase
* Rounded progress bar

Example:

```txt
Speed
74 / 100
“Fast enough to avoid a formal complaint.”
```

Do not use dense charts here.

---

## Category descriptions

### Speed

Measures how quickly a page becomes usable or visually ready.

User-facing explanation:

```txt
Speed is about how long the page makes you wait before it feels ready.
```

### Responsiveness

Measures whether the page reacts quickly to user input.

User-facing explanation:

```txt
Responsiveness is about whether taps, clicks, and scrolling feel instant or delayed.
```

### Stability

Measures whether the page jumps around or shifts unexpectedly.

User-facing explanation:

```txt
Stability is about whether the page stays put instead of rearranging itself while you are trying to use it.
```

### Polish

Measures the overall smoothness and quality of the experience.

User-facing explanation:

```txt
Polish captures the softer signs of quality: smoothness, consistency, and whether the page feels thoughtfully built.
```

---

## Section D: Trend snapshot

### Purpose

Help the user see recent browsing quality at a glance.

### User questions answered

* Are recent visits better or worse?
* Was there a cluster of bad pages?
* Is the overall browsing session improving?

### Visualization

Use simple rounded vertical or horizontal bars.

Each bar represents a recent visit score.

Recommended display:

* Last 8 or 10 visits.
* Hostname label on hover or below if space allows.
* Score shown as a small pill.
* Use lime for strong scores and lavender for neutral emphasis, but keep colors sparse.

Example title:

```txt
Recent score trail
```

Example description:

```txt
A quick look at the last few pages your coach judged.
```

Empty state:

```txt
No score trail yet. Visit a few pages and this will turn into a tiny performance skyline.
```

---

## Section E: Offender leaderboard

Anchor:

```txt
#offenders
```

### Purpose

Show the worst sites clearly and make the user want to investigate.

### User questions answered

* Which sites are consistently bad?
* Which site should I review first?
* Is one host dragging down the average?

### Recommended card layout

Use stacked cards instead of a table.

Each offender card should include:

* Rank
* Hostname
* Average score
* Number of visits
* Worst category
* Short coach copy
* Small score bar

Example:

```txt
#1
slowshop.com
38 / 100
12 visits

Worst category: Responsiveness

“Every click came with a loading apology.”
```

### CTA inside section

```txt
Review roast history
```

Links to:

```txt
#history
```

---

## Section F: Performance metrics

### Purpose

Translate raw timing metrics into approachable cards.

### Metrics

Use when available:

* Average load
* FCP
* LCP
* DOM interactive

### Display

Each metric card should include:

* Metric abbreviation
* Friendly name
* Average value
* Short explanation

Example:

```txt
LCP
Largest Contentful Paint
2.8s
“The main content showed up fashionably late.”
```

If data is missing:

```txt
Not enough data yet
```

Do not show `NaN`, `undefined`, or blank values.

---

## Metric explanations

### Average load

```txt
How long pages generally took to finish loading.
```

### FCP

```txt
How long it took before the first visible content appeared.
```

### LCP

```txt
How long it took before the main content was likely visible.
```

### DOM interactive

```txt
How long it took before the page structure was ready for interaction.
```

---

## Section G: Educational cards

Anchor:

```txt
#education
```

### Purpose

Help the user understand why scores matter.

This section should make the dashboard feel like a coach, not just a scoreboard.

### Cards

Use four educational cards:

1. Why speed matters
2. Why responsiveness matters
3. Why stability matters
4. Why polish matters

Each card should include:

* Simple title
* Friendly explanation
* “What to look for” hint

Example:

```txt
Why speed matters

Slow pages make every action feel more expensive. Users lose trust when the first useful thing takes too long to appear.

What to look for:
Heavy scripts, oversized images, render-blocking assets, and slow server responses.
```

Keep the language simple and practical.

---

## Section H: Roast history

Anchor:

```txt
#history
```

### Purpose

Show recent visits in a readable, entertaining way.

### User questions answered

* What pages were judged?
* What did the coach say?
* What was the score?
* When did this happen?

### Layout

Use card rows instead of a table.

Each history item should include:

* Hostname
* Roast message
* Overall score
* Category score summary
* Timestamp context
* Optional metric chips

Example:

```txt
slowshop.com
“This page loaded like it was carrying furniture upstairs.”

Score: 42 / 100
Speed: 39 · Responsiveness: 45 · Stability: 62 · Polish: 50

Visited 12 minutes ago
```

### Sorting

Default to most recent first.

Optional later enhancement:

* Filter by host
* Filter by grade
* Filter by category weakness

Do not add this unless already easy within the current UI.

---

# 8. Empty State Plan

The empty state should still feel intentionally designed.

The landing page should always look complete.

The dashboard should not collapse or look broken.

---

## Global empty dashboard message

At the top of the dashboard:

```txt
Your coach is waiting for material.
```

Supporting copy:

```txt
Create a local profile in the extension popup, browse a few sites, and Shame The Web will start turning performance data into scores, roasts, and coaching notes.
```

Primary empty CTA:

```txt
Open Extension
```

Secondary empty CTA:

```txt
Learn how scoring works
```

Links to:

```txt
#education
```

---

## Empty metric cards

Use zero or placeholder states with useful text.

Examples:

```txt
Total Roasts
0
“No sites have been roasted yet.”
```

```txt
Unique Sites
0
“Browse a few pages to start building your offender list.”
```

```txt
Average Score
—
“Not enough visits to calculate a fair score.”
```

---

## Empty history

```txt
No roast history yet
```

Supporting copy:

```txt
Once you browse with a local profile active, recent visits will appear here with scores, roasts, and timing clues.
```

---

# 9. Interaction Plan

## Anchor navigation

All major CTAs should use anchors:

```tsx
<a href="#dashboard">Open Dashboard</a>
<a href="#scores">See Scores</a>
<a href="#offenders">Review Worst Offender</a>
<a href="#history">Jump to History</a>
<a href="#education">Learn Score Rules</a>
```

Add smooth scrolling with CSS:

```css
html {
  scroll-behavior: smooth;
}
```

---

## Hover states

Cards should feel interactive without becoming noisy.

Recommended hover behavior:

* Slight lift
* Slight shadow increase
* Accent border softens or brightens
* No dramatic scaling
* No distracting animations on dashboard data

Landing cards can be more animated than dashboard cards.

---

## Buttons

Primary buttons should be visually strong.

Use lime accent for primary CTAs:

```txt
Open Dashboard
```

Use neutral or lavender treatment for secondary CTAs:

```txt
See Scores
View History
```

---

## Sidebar interactions

Sidebar links should:

* Highlight on hover
* Use soft rounded backgrounds
* Feel tappable
* Keep labels short

Optional active-state behavior can be skipped unless easy.

---

## Data visualization interactions

Keep charts simple.

Good interactions:

* Hover reveals hostname and score.
* Score bars visually fill based on value.
* Offender cards show a short diagnosis.
* History rows include chips for categories.

Avoid:

* Tooltips that are required to understand the chart.
* Overloaded legends.
* Multi-axis charts.
* Tables with many columns.

---

# 10. Copywriting Guidelines

## Voice

The product voice should be:

* Playful
* Slightly dramatic
* Helpful
* Clear
* Not cruel to the user

The websites are being shamed. The user is being coached.

---

## Good copy examples

```txt
Slow sites deserve consequences.
```

```txt
This page loaded like it was gathering courage.
```

```txt
Not cursed, just suspicious.
```

```txt
Clicks should not feel like mailing a letter.
```

```txt
The web is functional, but it is not beating the allegations.
```

```txt
Your coach found a few performance goblins.
```

---

## Avoid copy like

```txt
Your browsing is bad.
```

```txt
You failed.
```

```txt
This data proves you visit terrible sites.
```

```txt
Only developers will understand this metric.
```

The user should feel entertained and informed, not judged.

---

# 11. Component Plan

## Suggested React component structure

```txt
App
├── LandingHero
├── LandingFeatureCards
├── HowItWorks
├── DashboardShell
│   ├── DashboardSidebar
│   └── DashboardMain
│       ├── DashboardHeader
│       ├── OverviewMetrics
│       ├── CoachSummary
│       ├── ScoreAnalytics
│       ├── TrendSnapshot
│       ├── OffenderLeaderboard
│       ├── PerformanceMetrics
│       ├── EducationCards
│       └── RoastHistory
```

---

## Utility/helper files

If useful:

```txt
dashboardHelpers.ts
scoreCopy.ts
formatters.ts
```

Keep helpers close to the dashboard if they are purely display-layer logic.

---

# 12. Implementation Notes

## Data safety

When calculating averages:

* Ignore missing metric values.
* Avoid dividing by zero.
* Use fallback labels when data is missing.
* Never render raw `undefined`, `null`, or `NaN`.

---

## Hostname handling

If a visit URL is available, derive hostname safely.

Fallback order:

1. Parsed hostname from URL.
2. Existing hostname field, if available.
3. `"Unknown site"`

---

## Score handling

Clamp scores between 0 and 100 for display.

Fallbacks:

```txt
—
Not enough data
```

Do not invent real dashboard data.

Mock-looking data is acceptable on the landing page only.

---

## Timestamp handling

Show relative timestamps when possible:

```txt
12 minutes ago
2 hours ago
Yesterday
```

Fallback:

```txt
Recently
```

---

# 13. Responsive Design

## Desktop

Use the full shell layout:

* Sidebar on the left.
* Dashboard canvas on the right.
* Cards in 2–4 column grids depending on section.

---

## Tablet

* Sidebar can remain left if space allows.
* Reduce card grids to 2 columns.
* Keep charts readable.

---

## Mobile

* Stack everything vertically.
* Sidebar becomes a top nav or horizontal nav strip.
* Cards become single column.
* Hero CTAs stack.
* Avoid tiny chart labels.

The mobile dashboard should still answer the main questions without horizontal scrolling.

---

# 14. Accessibility Plan

## Required accessibility considerations

* Use semantic sections.
* Use real anchor links.
* Ensure button and link text is descriptive.
* Maintain strong contrast between text and backgrounds.
* Do not rely on color alone for score meaning.
* Add text labels to all score bars.
* Make hover states non-essential.
* Ensure keyboard users can tab through navigation and CTAs.

---

## Score visualization accessibility

Each score bar should have visible text:

```txt
Speed: 74 out of 100
```

Do not require the user to interpret bar length only.

---

# 15. Verification Plan

After implementation:

## Typecheck

Run:

```bash
npm run typecheck
```

If the project does not have a typecheck script, run the closest available TypeScript check.

---

## Build

Run:

```bash
npm run build
```

Confirm the Vite build succeeds.

---

## Lint

Run:

```bash
npm run lint
```

Fix issues in edited files.

---

## Manual visual check

Run the dev server:

```bash
npm run dev
```

Verify:

* Landing page loads first.
* Hero feels playful and brand-forward.
* `Open Dashboard` scrolls to `#dashboard`.
* `See Scores` scrolls to `#scores`.
* `Review Worst Offender` scrolls to `#offenders`.
* `Jump to History` scrolls to `#history`.
* Dashboard shell uses dark sidebar and light canvas.
* Empty state looks intentional.
* Cards do not show broken values.
* Mobile layout does not require horizontal scrolling.

---

# 16. Acceptance Criteria

The work is complete when:

* The page includes a playful landing experience before the dashboard.
* The dashboard remains a single React page with anchor navigation.
* The dashboard uses existing data only.
* The visual design follows the `design.json` direction.
* Kablammo is used only for high-personality landing moments.
* Dashboard content remains readable and useful.
* Empty states are designed and helpful.
* Core sections are present:

  * Overview metrics
  * Coach summary
  * Score analytics
  * Trend snapshot
  * Offender leaderboard
  * Performance metrics
  * Educational cards
  * Roast history
* Quick actions link to the right anchors.
* Typecheck/build/lint pass.
* The landing-to-dashboard flow works visually.

---

# 17. Overall Experience Target

The final product should feel like this:

> The landing page makes the user laugh.
> The dashboard helps the user understand what happened.
> The coaching content teaches the user what matters.
> The roasts make the data memorable.
> The whole experience feels playful, polished, and useful.
