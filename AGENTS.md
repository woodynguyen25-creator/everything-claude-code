# Everything Claude Code (ECC) — Agent Instructions

This is a **production-ready AI coding plugin** providing 47 specialized agents, 211 skills, 79 commands, and automated hook workflows for software development.

**Version:** 1.10.0

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **Test-Driven** — Write tests before implementation, 80%+ coverage required
3. **Security-First** — Never compromise on security; validate all inputs
4. **Immutability** — Always create new objects, never mutate existing ones
5. **Plan Before Execute** — Plan complex features before writing code

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | End-to-end Playwright testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| cpp-reviewer | C/C++ code review | C and C++ projects |
| cpp-build-resolver | C/C++ build errors | C and C++ build failures |
| docs-lookup | Documentation lookup via Context7 | API/docs questions |
| go-reviewer | Go code review | Go projects |
| go-build-resolver | Go build errors | Go build failures |
| kotlin-reviewer | Kotlin code review | Kotlin/Android/KMP projects |
| kotlin-build-resolver | Kotlin/Gradle build errors | Kotlin build failures |
| database-reviewer | PostgreSQL/Supabase specialist | Schema design, query optimization |
| python-reviewer | Python code review | Python projects |
| java-reviewer | Java and Spring Boot code review | Java/Spring Boot projects |
| java-build-resolver | Java/Maven/Gradle build errors | Java build failures |
| loop-operator | Autonomous loop execution | Run loops safely, monitor stalls, intervene |
| harness-optimizer | Harness config tuning | Reliability, cost, throughput |
| rust-reviewer | Rust code review | Rust projects |
| rust-build-resolver | Rust build errors | Rust build failures |
| pytorch-build-resolver | PyTorch runtime/CUDA/training errors | PyTorch build/training failures |
| typescript-reviewer | TypeScript/JavaScript code review | TypeScript/JavaScript projects |

## Agent Orchestration

Use agents proactively without user prompt:
- Complex feature requests → **planner**
- Code just written/modified → **code-reviewer**
- Bug fix or new feature → **tdd-guide**
- Architectural decision → **architect**
- Security-sensitive code → **security-reviewer**
- Autonomous loops / loop monitoring → **loop-operator**
- Harness config reliability and cost → **harness-optimizer**

Use parallel execution for independent operations — launch multiple agents simultaneously.

## Security Guidelines

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection enabled
- Authentication/authorization verified
- Rate limiting on all endpoints
- Error messages don't leak sensitive data

**Secret management:** NEVER hardcode secrets. Use environment variables or a secret manager. Validate required secrets at startup. Rotate any exposed secrets immediately.

**If security issue found:** STOP → use security-reviewer agent → fix CRITICAL issues → rotate exposed secrets → review codebase for similar issues.

## Coding Style

**Immutability (CRITICAL):** Always create new objects, never mutate. Return new copies with changes applied.

**File organization:** Many small files over few large ones. 200-400 lines typical, 800 max. Organize by feature/domain, not by type. High cohesion, low coupling.

**Error handling:** Handle errors at every level. Provide user-friendly messages in UI code. Log detailed context server-side. Never silently swallow errors.

**Input validation:** Validate all user input at system boundaries. Use schema-based validation. Fail fast with clear messages. Never trust external data.

**Code quality checklist:**
- Functions small (<50 lines), files focused (<800 lines)
- No deep nesting (>4 levels)
- Proper error handling, no hardcoded values
- Readable, well-named identifiers

## Testing Requirements

**Minimum coverage: 80%**

Test types (all required):
1. **Unit tests** — Individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — Critical user flows

**TDD workflow (mandatory):**
1. Write test first (RED) — test should FAIL
2. Write minimal implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage 80%+

Troubleshoot failures: check test isolation → verify mocks → fix implementation (not tests, unless tests are wrong).

## Development Workflow

1. **Plan** — Use planner agent, identify dependencies and risks, break into phases
2. **TDD** — Use tdd-guide agent, write tests first, implement, refactor
3. **Review** — Use code-reviewer agent immediately, address CRITICAL/HIGH issues
4. **Capture knowledge in the right place**
   - Personal debugging notes, preferences, and temporary context → auto memory
   - Team/project knowledge (architecture decisions, API changes, runbooks) → the project's existing docs structure
   - If the current task already produces the relevant docs or code comments, do not duplicate the same information elsewhere
   - If there is no obvious project doc location, ask before creating a new top-level file
5. **Commit** — Conventional commits format, comprehensive PR summaries

## Workflow Surface Policy

- `skills/` is the canonical workflow surface.
- New workflow contributions should land in `skills/` first.
- `commands/` is a legacy slash-entry compatibility surface and should only be added or updated when a shim is still required for migration or cross-harness parity.

## Git Workflow

**Commit format:** `<type>: <description>` — Types: feat, fix, refactor, docs, test, chore, perf, ci

**PR workflow:** Analyze full commit history → draft comprehensive summary → include test plan → push with `-u` flag.

## Architecture Patterns

**API response format:** Consistent envelope with success indicator, data payload, error message, and pagination metadata.

**Repository pattern:** Encapsulate data access behind standard interface (findAll, findById, create, update, delete). Business logic depends on abstract interface, not storage mechanism.

**Skeleton projects:** Search for battle-tested templates, evaluate with parallel agents (security, extensibility, relevance), clone best match, iterate within proven structure.

## Performance

**Context management:** Avoid last 20% of context window for large refactoring and multi-file features. Lower-sensitivity tasks (single edits, docs, simple fixes) tolerate higher utilization.

**Build troubleshooting:** Use build-error-resolver agent → analyze errors → fix incrementally → verify after each fix.

## Project Structure

```
agents/          — 47 specialized subagents
skills/          — 211 workflow skills and domain knowledge
commands/        — 79 slash commands
hooks/           — Trigger-based automations
rules/           — Always-follow guidelines (common + per-language)
scripts/         — Cross-platform Node.js utilities
mcp-configs/     — 14 MCP server configurations
tests/           — Test suite
```

`commands/` remains in the repo for compatibility, but the long-term direction is skills-first.

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met


<claude-mem-context>
# Memory Context

# [everything-claude-code] recent context, 2026-05-21 10:41am CDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (13,837t read) | 131,130t work | 89% savings

### May 21, 2026
2110 9:39a 🔵 Development environment GPU and Obsidian configuration
2111 " ✅ Obsidian terminal plugin renderer switched to DOM mode
2112 " 🔵 Development toolchain versions confirmed
2113 9:41a ⚖️ Part 9 specification: Heimdall's Watch + two refinements
S576 Generate two optimized, detail-maximized prompts (one for Midjourney, one for ChatGPT) to create an opulent fantasy Tretinoin skincare product bounty poster (May 21, 9:43 AM)
2115 9:46a 🔵 Heimdall's Watch specification and existing data sources identified
2116 " 🔵 Agent conversation storage identified as Heimdall event source
2117 " ✅ ForgeAction type extended with agent field
2118 9:47a 🟣 Activity log module created for append-only forge action tracking
2119 " 🟣 Forge route wired to activity log for quick action tracking
2120 " 🟣 Refinement B: Token Burn denominators surfaced with hover tooltips
2121 " 🟣 listAllThreads added to chat module for cross-agent conversation queries
S577 Polish Obsidian vault theme and clean up configuration; determine correct terminal command and fix defaultProfile setting (May 21, 9:48 AM)
2122 9:48a 🟣 Activity aggregation layer created—all 6 event sources unified
2123 " ✅ Activity module updated to async for proper readDoctor() await
2124 " 🟣 Activity API endpoint created for Heimdall's Watch data queries
2125 " 🔄 Old events.ts removed—replaced by new activity.ts aggregation layer
2126 9:49a 🔄 events.ts recreated as thin adapter over activity.ts aggregation layer
2127 9:50a 🟣 ActivityTimeline client component implemented—dense terminal-style event browser
2128 " 🟣 Activity page implemented—Heimdall's Watch main surface complete
2129 9:51a ✅ ActivityTimeline event row structure refactored for better semantics
2130 9:52a ✅ Forge route cleanup—removed unused repoRoot variable
2131 " ✅ Activity module refactored—since variable extracted for filter clarity
S578 Fix terminal freeze, eliminate stray window, and clean up garbled text; apply final CSS polish to Obsidian vault (May 21, 9:54 AM)
2140 9:55a 🔵 xterm padding breaks character grid alignment
2142 9:56a ✅ Terminal renderer switched from DOM to Canvas
2143 " ✅ Disabled legacy Windows console host (conhost) in terminal profile
2144 " ✅ Review document created—Heimdall slice delivery summary
S579 Implement Heimdall's Watch (/activity page) with full event aggregation from 6+ sources, plus two refinements: Token Burn meter tooltips and Codex worker fallback hardening (May 21, 9:56 AM)
S580 Review completed Heimdall's Watch feature; queue final dashboard polish pass to Codex; pivot strategy toward embedding dashboard in Obsidian for real-world use rather than building more features (May 21, 9:57 AM)
S581 Fix Obsidian terminal input issue and validate all configuration files before final design review of Codex's polish work (May 21, 10:01 AM)
2146 10:12a 🔵 Dashboard build baseline confirmed for polish pass
2147 " 🔵 Route audit: All API endpoints responding with real data
2148 10:14a 🔴 Enabled Windows Console Host for Obsidian Terminal plugin
S582 Diagnose vault graph discrepancy and plan consolidation of fragmented note content across primary and legacy Obsidian vaults (May 21, 10:15 AM)
2149 10:15a 🔴 MemoryWellClient loading state prevents premature empty state display
2150 10:16a 🟣 ActivityTimeline adds shimmer skeleton during data fetch
2151 " 🟣 ScryingPool Memory tab adds loading skeleton
2152 " 🔄 Remove stub Yggdrasil realm detail route
2153 10:17a 🟣 Implement functional realm detail pages with live system metrics
2154 " 🔴 MemoryDrawer adds resilience for failed memory fetches
2155 " 🔵 Vault structure and content inventory: Primary Woody vault vs. legacy vault
2156 " 🔴 ActivityTimeline adds error handling for failed activity fetch
S583 Apply final terminal font fix (followTheme: false) and provide honest assessment of embedding Claude Code TUI in Obsidian terminal vs. alternative workflows (May 21, 10:18 AM)
2157 10:19a ✅ Sidebar logo enforces font-display minimum size rule
2158 10:20a ✅ MemoryCard enforces font-display minimum size consistency
2159 " ✅ ScryingPool Memory dropdown removes display font from small title
2160 " ✅ Yggdrasil realm labels remove display font from compact UI
2161 " ✅ Disable theme following in Windows integrated terminal
2162 " 🔄 Remove unused agent UI components and glyphs
S584 Evaluate ChatGPT-generated Tretinoin poster, identify improvements, and decide on tool strategy for poster generation (May 21, 10:20 AM)
2164 10:21a 🔵 CRITICAL: All API routes returning 500 after component deletions
2165 " 🔵 Production build succeeds after .next cache clear
2167 10:33a 🔵 Trading Assistant memory and infrastructure located across multiple systems
2168 10:34a ✅ Renamed Woody documentation folder to Command Center
2169 " ⚖️ ChatGPT locked for poster image generation; Midjourney retired
S585 Final Polish & Verification Pass on Agentic OS dashboard: Execute six tasks (route audit, loading/empty states, visual consistency, dead code cleanup, resilience checks, state documentation) (May 21, 10:34 AM)
2170 10:36a ✅ Updated AIOS dashboard renderer vault path to Command Center
2171 " 🔵 Obsidian vault configuration contains stale path to renamed folder
2172 10:38a 🔴 Fixed Obsidian vault configuration to use Command Center path

Access 131k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>