1. Core Idea

A Chrome extension (built with Plasmo) that:

Measures how fast a website loads
Assigns it a speed score (0–100, higher = faster)
Shows a funny pop-up roast or praise
Stores all data locally only
Powers a personal dashboard on ShameTheWeb.com
2. Speed Scoring (Simple Model)

Score range:

80–100 → Very Fast
60–79 → Fast
40–59 → Average
20–39 → Slow
0–19 → Terrible

Score is based on:

Page load time
DOM ready time
Server response delay
Page size / number of requests

Keep it simple and approximate (not Lighthouse-level).

3. Core Flow

On every website visit:

Detect page load
Measure performance timings
Calculate score (0–100)
Assign speed tier
Pick a joke from local JSON
Show toast popup (funny message)
Save visit locally
4. Joke System
Store hundreds of witty lines in local JSON
Group by:
Speed tier (fast → praise, slow → roast)
Special cases (repeat offender, improvement, regression)
Randomize selection to avoid repetition
5. Data Storage (Local Only)

Store:

Domain (default, not full URL)
Timestamp
Score
Speed tier
Key metrics (load time etc.)
Visit count + averages

Rules:

No backend
No tracking
No data leaves browser
6. Extension Structure (Plasmo)

Main parts:

Background/service worker → detect navigation
Content script → read performance + show popup
Storage layer → save local data
Extension popup → quick stats
Website bridge → share local data with ShameTheWeb.com
7. Popup Behavior
Small toast (bottom corner)
Shows:
Score
Joke
Auto-dismiss
Not shown every time (avoid annoyance)

Settings:

Roast level (mild → savage)
Show only slow sites (optional)
Ignore specific domains
8. Dashboard (ShameTheWeb.com)

When user visits the site:

Extension provides local data only

Dashboard shows:

Personal Hall of Shame (slowest sites)
Fastest sites
Time wasted
Repeat offenders
Weekly summary

No cloud sync — everything is local.

9. MVP Scope

Build only:

Measure page speed
Generate score (higher = faster)
Show funny popup
Store domain-level history locally
Basic extension popup (recent sites)
Simple website dashboard integration

Skip:

Accounts
Backend
Global rankings
Complex performance audits
10. Phases

Phase 1: Define scoring + joke tone
Phase 2: Build extension (measure + popup)
Phase 3: Add local storage + popup UI
Phase 4: Connect dashboard (local data only)
Phase 5: Add witty lines or jokes + polish + settings

11. Key Constraints (Important)
Use Plasmo
Manifest V3
No backend for user data
Domain-level storage by default
witty jokes are hardcoded locally
Keep it funny, lightweight, non-intrusive
Scoring is simple, not scientific