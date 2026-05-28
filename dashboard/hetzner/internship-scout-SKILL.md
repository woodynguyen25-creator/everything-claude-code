---
name: internship-scout
description: Daily internship pipeline scout for Woody Nguyen. Researches Houston business internships (finance/consulting/banking/corp finance/ops/wealth mgmt) at his target companies. Drafts personalized application angles. Posts Telegram digest each morning. Per Sharbel's lead-gen pattern (video 2WZAcWtwoDI), adapted for the internship hunt instead of B2B outreach.
version: 0.1.0
trigger: /internship-scout
triggers:
  - "/internship-scout"
  - "scout internships"
  - "find me internships"
  - "research Houston internships"
runtime: hermes-native (uses web search + memory toolsets)
schedule: daily 8am CT (set via `hermes cron create`)
---

# Internship Pipeline Scout

## What this skill does

Each morning at 8 AM Central, scans the open internship market for Houston-based business roles
that match Woody Nguyen's profile (UH finance major, pivoting to Economics → Bauer, summer 2027
target). Returns a Telegram digest with 3-7 fresh opportunities, each annotated with:

- Company name + role + location + application deadline
- Why it matches Woody (his major, his GPA recovery story, his target company list)
- One personalized opening angle for the cover letter
- Link to apply

## Target companies (Woody's curated list)

Energy & Houston majors: ExxonMobil, Chevron, Shell, Halliburton, ConocoPhillips, BP America, Schlumberger, Phillips 66

Houston banking + finance: BofA Houston, JPMorgan Chase Houston, Wells Fargo Houston, Truist, Cadence Bank, Frost Bank, Stifel, Stephens

Consulting: Deloitte Houston, Accenture, Bain Houston, McKinsey Houston, EY Houston, KPMG Houston, PwC Houston

Healthcare / institutional: MD Anderson, Houston Methodist, Memorial Hermann, USAA San Antonio

PE / energy alternatives: Quantum Energy Partners, EnCap Investments, Riverstone Holdings,
NGP Energy Capital, Lime Rock Partners

Tech / Houston-adjacent: BMC Software, Hewlett Packard Enterprise (HPE), Sysco, Waste Management

## How to invoke

### Manual (one-shot)
From CLI: `hermes -z "/internship-scout"`
From Telegram: send `/internship-scout` to @LeBotJamesAiosBot

### Daily automated (recommended setup)
```bash
sudo -u hermes -H bash -c "cd /home/hermes && hermes cron create \
  --name internship-scout-daily \
  --schedule '0 8 * * *' \
  --timezone 'America/Chicago' \
  --prompt 'Run the /internship-scout skill. Post the digest to Telegram chat 2019823847.'"
```

## Algorithm (what Hermes does when invoked)

1. **Search the market** using built-in `web` toolset for each tier:
   - `site:indeed.com "summer 2027" intern Houston (finance OR consulting OR analyst)`
   - `site:linkedin.com/jobs intern Houston "ExxonMobil" OR "Chevron" OR "Halliburton"`
   - `site:[company].com careers intern` — iterate through target list
2. **Filter** for: roles tagged Summer 2027, applications still open, Houston location (or remote Houston-eligible), and matches Woody's profile (undergrad finance/economics, no prior corporate experience required).
3. **Rank** by fit score (1-10):
   - +3 if exact company on target list
   - +2 if role explicitly mentions "finance" / "business" / "corp finance" / "consulting analyst"
   - +1 if posted within last 7 days
   - +1 if deadline > 2 weeks away (enough time to apply well)
4. **For each top-5 match**, draft a 2-sentence opening angle:
   - Reference Woody's UH finance → Bauer pivot
   - Tie to one specific thing about the company (a recent deal, a Houston initiative, a public statement by a partner/VP)
5. **Output:**
   - Telegram digest (markdown, ranked, with apply links + draft angles)
   - Also write to ECC bridge `/api/internships/draft` so they appear as drafts in the dashboard InternshipPanel for user ✅/❌ review
6. **Memory:**
   - Save which companies were scouted today (so we don't re-show the same listing tomorrow)
   - Save user's ✅/❌ feedback when received via Telegram reaction → improves filter for tomorrow

## Constraints (do not break)

- **NEVER auto-submit applications** — Hermes drafts only; Woody applies manually.
- **NEVER fabricate a job posting** — if no good matches today, say so honestly. "Quiet day — only 1 weak match. Try again tomorrow."
- **NEVER spam** — max 7 in a digest; if more, queue the rest for tomorrow.
- Always include the source URL so Woody can verify the posting is real.

## Why this pattern works (Sharbel framing)

> *"The bad version is 'send a thousand generic AI emails.' The good version is 'find 25 companies that match this profile, explain why each one might need this, draft a specific first message, and log everything in a sheet.'"*

Adapted for internship hunt:
- "Find 5-7 Houston business intern roles that match Woody's profile, explain why each fits, draft a specific opening angle, and log in InternshipPanel for review. Don't apply for him."

## Output format example

```markdown
🎯 *Internship Scout — Tuesday May 26*

3 strong matches today (1 deadline this week)

1. *ExxonMobil — Finance Intern, Summer 2027* — Houston (Spring HQ)
   📅 Deadline Jun 15 · 🔗 [apply](https://...) · Fit 9/10
   _Angle: "My pivot from finance to economics at UH is shaped by Bauer's increased emphasis
   on quantitative reasoning — your Treasury team's recent ESG-linked bond issuance is a
   perfect intersection of the two."_

2. *Halliburton — Corporate Finance Analyst Intern* — Houston (Westchase)
   📅 Deadline Jul 1 · 🔗 [apply](https://...) · Fit 8/10
   _Angle: "Halliburton's 2024 transition to a digital wells platform — and the unit economics
   it changed — is the kind of problem I want to learn under. Specifically, your North America
   land segment..."_

3. *Quantum Energy Partners — Summer Analyst* — Houston
   📅 Deadline Aug 1 · 🔗 [apply](https://...) · Fit 7/10
   _Angle: "Toby Neugebauer's recent talk at UH on the energy capital cycle — specifically the
   point about the gap between drilled-not-completed inventory and the next price cycle — is
   what made me want to learn the LP/GP analytical playbook from the inside..."_

Reply ✅ on any to add to your InternshipPanel. Reply ❌ to filter from future scouts.
```

## Source of truth

Skill definition: this file (`/home/hermes/.hermes/skills/internship-scout/SKILL.md`)
Companion data: `/home/hermes/.hermes/skills/internship-scout/target-companies.json` (the target list, editable)
Output writes to: `/api/internships/draft` (dashboard) + Telegram chat 2019823847
