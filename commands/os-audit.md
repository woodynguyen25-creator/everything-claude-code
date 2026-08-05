---
description: Read-only audit of the AIOS — is it still TRUE? Checks routing integrity, index truth, freshness, and hygiene of MEMORY.md + the Obsidian vault router + memory files against reality. Emits a scored report + fix-list awaiting approval. Never fixes.
---

# /os-audit

Audits the operating system's *claims* against *reality*. Catches the failure modes that silently
rot an AIOS as it scales: **poisoning / bloat / confusion / clash** — surfaced here as routing
integrity, index truth, freshness, and hygiene. Read-only: it reports, it never changes anything.

## How to run

1. Run the deterministic checker:
   ```bash
   node scripts/os-audit/audit.js          # human-readable scored report
   node scripts/os-audit/audit.js --json   # structured, for programmatic use
   ```
   Zero-dep (Node 18+). Checks: MEMORY.md pointers resolve · vault-router folder refs resolve ·
   orphan memory files (on disk, absent from the index) · disk-vs-claimed counts · broken
   `[[wikilinks]]` · REVISIT-IF tags awaiting re-test · service liveness (Odysseus :7000, dashboard :3737).

2. **Write the report** to `<memory>/audits/os-audit-YYYY-MM-DD.md` (create the folder if absent).
   Look for the prior report first and note what changed since (regressions vs fixes).

3. **Interpret beyond the mechanical checks** — the script gives you disk reality + count-claims;
   you verify them (e.g. is "~44-site corpus" still true? does an agent/skill count claim match?).
   Then judge the subjective checks the script can't: **context placement** (any volatile data —
   prices/positions/"as of today" — living in evergreen memory that should be fetched live?) and
   **bloat/clash** (duplicate or contradicting facts across memory files).

4. **Present the scored report + a numbered fix-list — and STOP.** Do NOT fix anything without
   explicit approval. This is the exploratory phase; the human picks which fixes to run.

## Scope of fixes (only after approval)
Routing/index repair (fix broken pointers, add orphan index lines or delete stale files, correct
wikilink typos, reconcile count-claims) · freshness (retire resolved REVISIT-IF tags, restart dead
services) · hygiene (commit untracked load-bearing files). Never bulk-delete or bulk-move unattended.

## Cadence
Run weekly (a cron is ideal) and after any big memory/vault reorganization. The report is the
durable record of whether the second brain is still true.
