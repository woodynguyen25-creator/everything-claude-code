/**
 * Council roster - SEATS ARE ROLES, MODELS ARE SWAPPABLE PARTS.
 *
 * Design rule (Woody, 2026-08-04): a seat is defined by the JOB it does in the
 * system. The model filling it is a replaceable component with an expiry date.
 * New frontier models ship constantly; when a better one lands, change `model`
 * on the seat it serves and leave everything else alone.
 *
 * This file is the SINGLE SOURCE OF TRUTH for seat placement. It exists because
 * model ids used to be hardcoded across providers.js, council.js, router.js and
 * council-models.ts - and three of them silently rotted:
 *   - cerebras' "primary" alias pointed at qwen-3-235b-a22b -> 404, gone
 *   - cerebrasFast pointed at llama3.1-8b -> 404, never existed on that key
 *   - groqGemma pointed at gemma2-9b-it  -> 400, decommissioned by Groq
 * Nothing surfaced any of it. `node scripts/council/health.js --models` now
 * checks every configured id against the provider's live catalogue.
 *
 * -- THE TWO TIERS ---------------------------------------------------------
 * LEAD   = DECIDE. Frontier models ideate, argue, stress-test. Kept
 *          DECORRELATED on purpose: each answers independently through its own
 *          lens and never sees another seat's round-1 answer. Correlated seats
 *          manufacture false consensus, which is worse than no council at all.
 *          Prefer one seat per LAB - same-lab models share training data and
 *          fail the same way.
 * WORKER = EXECUTE a spec a lead already fixed. Correlation is fine here;
 *          faithful execution is the goal, not divergence. Lenses off.
 *
 * A seat may serve BOTH tiers (`tiers: ['LEAD','WORKER']`) when it is good
 * enough to hold an opinion and cheap enough to grind - gemini is the example.
 */
'use strict';

/**
 * @typedef {Object} Seat
 * @property {string} id      seat id used by --to, and the key into SEATS in providers.js
 * @property {Array<'LEAD'|'WORKER'|'BENCH'>} tiers  a seat may serve more than one
 * @property {string} role    the JOB this seat does - the durable part
 * @property {'agent'|'api'} toolAccess  'agent' = spawns a CLI that can read files and run
 *                                       commands; 'api' = a raw HTTPS call with none of that
 * @property {string} lab     vendor/lab, so decorrelation can be reasoned about
 * @property {string} model   the swappable part
 * @property {string} mandate why this seat exists in Woody's system
 * @property {string} swapWhen the condition under which the model gets replaced
 * @property {string} verified ISO date the model id was last confirmed live
 */

/** @type {Seat[]} */
const SEATS = [
  {
    id: 'claude',
    vision: 'read-tool', // MEASURED 2026-08-23: claude -p, path in prompt -> Read tool, 3/3 on the probe.
    // AGENT seat: spawns a real CLI session, so it CAN read the repo, run commands
    // and verify claims. Ask it to check things.
    toolAccess: 'agent',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'verified-private', // Anthropic API/Console: published retention controls + zero-data-retention docs. Consumer Claude plan for the CLI path.
    tiers: ['LEAD'],
    role: 'ARCHITECT - systems reasoning, long-context synthesis, final review',
    lab: 'anthropic',
    model: 'claude-opus-5-5', // promoted 2026-09-22 (release day): CLI PONG 8.2s; $4/$20 per M, 20% under Opus 5.
    mandate:
      'Deepest reasoning seat. Carries the most context and is the one to trust on architecture and multi-file consequences.',
    swapWhen:
      'A newer Anthropic frontier ships (Opus 6, etc). NOTE: this is the LEAST decorrelated seat - `claude -p` inherits the same CLAUDE.md, rules and memory as the main session, so it argues in Woody\'s house style. Treat its agreement with the orchestrator as near-zero evidence.',
    verified: '2026-09-22',
  },
  {
    id: 'codex',
    vision: 'native',    // MEASURED 2026-08-23 on gpt-5.6-sol; RE-MEASURED 2026-09-05 on gpt-6-astra (fresh codeword probe, exact text+counts+colors, 17.7s).
    // AGENT seat: spawns a real CLI session, so it CAN read the repo, run commands
    // and verify claims. Ask it to check things.
    toolAccess: 'agent',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'verified-private', // OpenAI states API inputs/outputs are NOT used for training by default.
    tiers: ['LEAD'],
    role: 'ENGINEER - code correctness, implementation realism, spec rigour',
    lab: 'openai',
    model: 'gpt-6-astra',
    mandate:
      'The build-it-for-real seat. Boots a full agent session with MCP + skills, so it answers like something that actually has to ship the thing. Promoted to GPT-6 Astra 2026-09-05 (day-2 of public rollout; latency/failure stats reset — the 182s/22% history belongs to gpt-5.6-sol).',
    swapWhen:
      'A newer GPT frontier ships, or Astra proves flakier than Sol did (compare fresh ledger rows before trusting any timeout tuning). Interactive Sol in ~/.codex/config.toml is a separate pin — swapping one is NOT swapping the other.',
    verified: '2026-09-05',
  },
  {
    id: 'xai',
    vision: 'native',    // MEASURED 2026-08-23: image_url on chat/completions AND input_image on /v1/responses, 3/3 both.
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'verified-private', // xAI exposes a Zero Data Retention setting for eligible API teams.
    // LIVE SEARCH — the only seat that can see anything that happened today.
    //
    // Declared HERE and not only in providers.js, for the reason the toolAccess
    // field exists at all: a capability that lives in the runner is a capability
    // nothing can check, and this roster has been burned by that twice (xai
    // narrating a repo inspection it could not perform, every agy seat claiming
    // tools it cannot use). If a second seat ever gains search — the likeliest
    // being a BILLED Gemini key with Google Search grounding — it declares it
    // here and the research lens picks it up with no other change.
    //
    // OFF unless --research asks for it, because it is METERED SEPARATELY from
    // tokens: xAI bills Web/X Search per use, and budget.js models that as a
    // per-call surcharge. Woody approved enabling it 2026-08-23.
    liveSearch: true,
    tiers: ['LEAD'],
    role: 'CONTRARIAN - red-team, premise attack, uncomfortable truths; the only seat with LIVE web + X search',
    lab: 'xai',
    model: 'grok-4.6',
    // UPGRADED 4.5 -> 4.6 on 2026-08-20. Measured n=3 on an identical reasoning
    // prompt: SAME headline price ($2/$6 per M, both double above a 200k prompt),
    // same median latency (~24s vs ~25s), but 4.6 billed **222 input tokens vs
    // 4.5's 510** for the same question - a 57% cut in billed input. Cache-hit
    // input is worse on 4.6 ($0.50 vs $0.30) but the council almost never hits
    // cache (every convene is a fresh prompt), so cache-miss economics dominate.
    // ⚠️ On a real reasoning prompt this seat is ~24s, NOT the ~1.4s a one-word
    // PONG health probe suggests. Do not size timeouts off the health probe.
    mandate:
      'Most reliable seat in the roster (0% failure over 128 calls, highest average output). Least filtered, which is what the red-team lens needs.',
    swapWhen:
      'grok-5 ships, or the xAI data-sharing free credits end - at $2/$6 per M it is the priciest seat and only economical while those credits are active. grok-4.7 was bake-offed 2026-09-22 and NOT taken: 8/8 accuracy on both across two runs, but worst-case 91.7s and 135.7s against 4.6\'s 53.5s and 53.4s. Re-test when a 4.7 point release ships.',
    verified: '2026-09-22',
  },
  {
    id: 'gemini',
    vision: 'gemini-api',// MEASURED 2026-08-23: agy has NO image flag and its read_file is DENIED non-interactively, so this seat's vision runs over the Gemini API (inline_data), 3/3. Same lab, same dataTerms, different transport.
    // API seat — PROMPT-BOUND. It cannot check anything; do not ask it to.
    //
    // ⚠ This is NOT the obvious call and it was wrong for one hour on 2026-08-22.
    // agy DOES spawn a real CLI, so 'agent' looks right and every agy seat in this
    // file was marked that way. A live canary — "read roster.js and report the
    // `verified` value on the groq seat" — proved otherwise:
    //   exit 1 [agy-refusal]: permission check failed for command
    //   "Get-ChildItem -Path . -Recurse -Filter roster.js ..."
    //   user denied permission to run command
    // agy gates tool use behind an INTERACTIVE approval prompt. A council dispatch
    // is non-interactive, so the approval can never arrive: the seat does not
    // merely decline to use tools, it BURNS THE WHOLE DISPATCH (0/1 answered,
    // degraded quorum). Marked 'api' because the only question this field exists
    // to answer is "can this seat verify a claim", and the answer is no.
    // Consequence beyond bookkeeping: council.js appends a `[NO TOOLS]` line to
    // api seats, which stops the model reaching for a command it cannot run — so
    // the honest label is also the fix. This is the xai lesson recurring exactly:
    // a capability that lives in the runner and not in the roster is a capability
    // nothing can check. Caught by the codex seat reviewing this very change.
    // ⚠ geminipro, agyopus and agyflash carry the same false 'agent' claim and the
    // same canary should be run against them before either is trusted to verify.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so the dispatch gate can
    // refuse to route sensitive prompts to a seat that may train on them, rather
    // than relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // antigravity.google/terms: Interactions train Google ML AND "employees and contractors may access, view, review and use Interactions". Not tier-differentiated — AI Pro/Ultra/student get free-tier treatment.
    // ── THE GOOGLE SEAT (Woody's ruling, 2026-08-22): "have Gemini as his own
    // seat, on the best model, just how we have Opus 5 and GPT-5.6 Sol."
    //
    // PATH CHANGE, not just a model swap. This id previously ran the FREE-TIER
    // AI Studio API key (gemini-3.6-flash, raw HTTPS, toolAccess 'api'). It now
    // runs Gemini 3.7 Flash (High) through the `agy` CLI on the AI Pro student
    // plan: agent tool access, a different wallet, and a different failure
    // domain. The old API code is in git at 6f050fef (providers.js runGemini) if
    // an API seat is ever wanted again — see swapWhen for when that becomes the
    // right move.
    // ⚠ LEDGER DISCONTINUITY: rows before 2026-08-22 under provider="gemini" are
    // the ~1.2s free-tier API path; rows after are the ~11s agy path. Slice by
    // `model`, never compute cross-era latency stats on the seat id alone.
    //
    // MODEL CHOSEN BY MEASUREMENT, 2026-08-22 — a 2x2 bake-off against the other
    // agy frontier id (gemini-3.1-pro-high) on a known-answer JS semantics task,
    // run in BOTH directions so a pass meant something:
    //   equivalent refactor (right answer YES) · non-equivalent one (right NO)
    //   3.7-flash-high  YES ✓ 12.7s · NO ✓  9.9s   <- picked
    //   3.1-pro-high    YES ✓ 97.4s · NO ✓ 16.0s
    // Identical accuracy 4/4 each; 3.7 Flash is a LATER generation than 3.1 Pro
    // and answered 1.7-7.7x faster. The 97.4s Pro outlier is the deciding fact:
    // this file's own doctrine is that for a quorum member the TAIL is the
    // product, not the median — a 97s seat is one timeout from being dropped,
    // which is the same argument that put 3.6-flash over 3.5-flash on 2026-08-05.
    // Thin evidence, stated honestly: n=2 per model on ONE task type. It is
    // enough to reject "Pro is obviously stronger"; it is NOT a claim that Flash
    // wins on long multi-file architecture reasoning, which is untested.
    //
    // STANDING LEAD SEAT since 2026-08-23, on Woody's explicit ruling: "I don't
    // consider any of the work I do here truly private. I want to fully utilise
    // the strongest model we get from Gemini in the Council."
    //
    // It was BENCH-by-default until then, joining LEAD only under --public. That
    // default was correct while the owner had not ruled and wrong the moment he
    // did: it cost a fourth decorrelated frontier lab, at $0, on a plan already
    // paid for. Measured before the flip — 13 agy dispatches in a month, exactly
    // one of which fed a real decision. A gate nobody opens is a disabled seat.
    //
    // ⚠ WHAT THIS SEAT STILL CANNOT SEE, and it is not a capability limit:
    // Google's terms for this path say Interactions train their models AND that
    // employees and contractors may review them. Woody may donate his own data;
    // he cannot donate a CLIENT's. So `--private` excludes this seat, `--trading`
    // implies `--private` (positions are not ours to give away), and any convene
    // that seats it says so out loud. Full parity with claude/codex still needs
    // a BILLED AI-Studio key — see swapWhen.
    tiers: ['LEAD'],
    role: 'FRONTIER-GOOGLE - the Google lead seat, fourth lab in the LEAD roster',
    lab: 'google',
    model: 'gemini-3.8-flash-high (via agy)', // 2026-09-22 bake-off: ties 3.7 on accuracy (7/8 each), half the worst-case latency (70.5s vs 140.3s).
    mandate:
      'The one Google seat, and the fourth independent lab in the LEAD roster alongside Anthropic, OpenAI and xAI — at $0 on the AI Pro student plan. Consolidates what were three overlapping Google-ish seats (gemini/geminipro/agyflash) into one named seat with one job. Its value is DECORRELATION, not cost: the whole metered roster runs about $1.42/month, so this seat does not meaningfully save money — it adds a viewpoint that Anthropic, OpenAI and xAI cannot supply.',
    swapWhen:
      'A newer agy id ships (`node scripts/council/health.js --discover` reports arrivals) — as of 2026-09-22 3.8-flash-high is the best measured id on the plan. THE REAL UPGRADE IS NOT A MODEL: attaching BILLING to an AI-Studio project flips ai.google.dev\'s "Used to improve our products" from Yes to No, which would give a VERIFIED-PRIVATE Google seat that works on trading and client prompts like claude and codex do. That is the only path to true parity; it costs cents and needs Woody\'s card. Falls back to `geminipro` if Google changes the Antigravity allocation.',
    verified: '2026-08-22',
  },
  {
    id: 'haiku',
    vision: 'read-tool', // MEASURED 2026-08-23: same claude.exe path as the lead seat, 3/3 on the probe.
    // Same Anthropic CLI path as the claude seat — published retention controls,
    // consumer Max plan. Verified-private by the same evidence.
    dataTerms: 'verified-private',
    // Spawns the full claude CLI, so it CAN read files and run commands.
    toolAccess: 'agent',
    tiers: ['WORKER'],
    role: 'SUBAGENT-GRINDER - fast cheap execution with real tool access, on the Anthropic sub',
    lab: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    // ADDED 2026-08-21 on Woody's direction: "we can just summon sub-agents from
    // Claude to be our workers." This makes that a first-class seat instead of an
    // ad-hoc pattern. $0 marginal on the Max sub he already pays; probed before
    // adding (PONG 10.5s, exit 0). It is the ONLY worker with tool access — the
    // other workers are raw HTTPS — so specs that need a seat to CHECK something
    // (read a file, run a test) route here, not to deepseek/groq.
    // Lab correlation with the claude LEAD seat is acceptable BY DESIGN: workers
    // execute a fixed spec, they do not vote, and one-seat-per-lab is a LEAD-tier
    // invariant (see the tier doctrine at the top of this file).
    // ⚠ CONTEXT INHERITANCE, demonstrated on its first live convene (2026-08-21):
    // like the claude seat, `claude -p` loads Woody's CLAUDE.md/memory, and haiku
    // answered a GENERIC council question by citing OUR OWN roster memory instead.
    // Helpful for executing specs against this system; near-zero evidence when
    // asked for an independent opinion. Never promote to LEAD.
    mandate:
      'Free tool-capable grinding. The worker tier was down to two raw-API seats after cerebras (402) and the agy seats (privacy) were benched; this restores execution capacity on a wallet already paid for.',
    swapWhen:
      'A newer Haiku ships (swap the model id), or the Max plan is dropped. If Anthropic sub-metering ever throttles bulk -p calls, fall back to deepseek for volume.',
    verified: '2026-08-21',
  },
  {
    id: 'deepseek',
    vision: false,       // MEASURED 2026-08-23: HTTP 400 "This model does not support image". An honest refusal — believe it.
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'UNVERIFIED', // Not audited.
    tiers: ['WORKER'],
    role: 'SYNTHESIST - merges seat answers, drafts, bulk reasoning',
    lab: 'deepseek',
    model: 'deepseek-chat',
    mandate:
      'Most-dispatched seat and the default synthesis provider. Best paid value in the roster. STACK RULING (Woody, 2026-08-21): the paid stack is Claude Max + ChatGPT Plus + xAI metered + Google AI Pro (free student) + the droplet; DeepSeek is the one discretionary metered extra and stays because its lifetime cost (~$0.55 over 74 days) is noise next to the synthesis reliability it buys. If its bill ever matters, `haiku` absorbs the grinding at $0.',
    swapWhen:
      'KEEP deepseek-chat for now despite it no longer appearing in the catalogue (allowlisted in KNOWN_ALIASES). Measured n=3 on 2026-08-20: deepseek-chat 1.6s / ~50 output tokens; deepseek-v4-flash 11.6s / 1086-1965 output tokens; deepseek-v4-pro 12.9s / 674-1599. The v4 models are REASONERS that burn 20-40x the output tokens on a task asking for 40 words, and this is a WORKER seat whose job is fast, cheap execution of a fixed spec - deepseek-chat is the right tool for that role and is 8x faster. Pinned successor if deepseek-chat is withdrawn: deepseek-v4-flash (peak $0.44 in / $1.32 out per M; v4-pro is 3x that at $1.32/$3.96). DeepSeek discounts off-peak by 50%, so batch grinding is materially cheaper outside peak hours.',
    verified: '2026-08-04',
  },
  {
    id: 'cerebras',
    vision: false,       // Dead seat (402 Payment Required); untested and irrelevant until funded.
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'UNVERIFIED', // Not audited.
    tiers: ['BENCH'],
    // BENCHED 2026-08-20: HTTP 402 Payment Required on every chat call.
    // NOT a 429 and not a dead key - the /models catalogue still answers on the
    // same key, so the account is alive and the balance is out. Benched rather
    // than left in WORKER so it cannot silently degrade quorum. Restore by
    // topping up at cloud.cerebras.ai; it is genuinely the fastest seat (0.4s).
    role: 'SPEED - sub-second bulk execution, high-volume mechanical passes',
    lab: 'openai-oss',
    model: 'gpt-oss-120b',
    mandate:
      'Fastest seat (~390ms) at 1% failure over 176 calls. The default workhorse for anything mechanical.',
    swapWhen:
      'Something faster or stronger appears on the Cerebras key, which serves exactly three models: gpt-oss-120b, gemma-4-31b, zai-glm-4.7. zai-glm-4.7 was TESTED 2026-08-04 and returns HTTP 200 with an EMPTY body - do not adopt. gemma-4-31b works and is a valid smaller fallback. WARNING: this is OpenAI open-weights, so it is partially correlated with the codex seat - never read cerebras+codex agreement as independent.',
    verified: '2026-08-04',
  },
  {
    id: 'groq',
    vision: 'native',    // MEASURED 2026-08-23: qwen/qwen3.6-27b took image_url and scored 3/3. Re-measured on its successor qwen3.8-27b 2026-09-22: image read correctly, 2.0s.
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'UNVERIFIED', // Not audited.
    tiers: ['WORKER'],
    role: 'CHEAP DRAFT - throwaway passes where substance barely matters',
    lab: 'meta',
    model: 'qwen/qwen3.8-27b', // 3.6 retired by Groq (404, found 2026-09-22)
    // DRIFT FIX 2026-08-20, caught by `health.js --models`. Groq decommissioned
    // llama-3.3-70b-versatile (404, found by probe 2026-08-17) and providers.js
    // was swapped to qwen3.6 that day - but THIS file, the declared single source
    // of truth, was not. So the roster advertised a model that had not existed for
    // three days. Exactly the drift this file exists to prevent, recurring inside
    // the file meant to prevent it: fixing providers.js is only half the swap.
    mandate:
      'Demoted out of LEAD 2026-08-02: 2,325 average output chars vs cerebras 6,316 on identical prompts, 5x the failure rate, and it flunked an exact-instruction probe (asked for "PONG", answered "PING"). Kept for lab diversity and raw speed only.',
    swapWhen:
      'openai/gpt-oss-120b is on the Groq key and benchmarked faster (746ms vs 964ms) - but it DUPLICATES the cerebras seat exactly, collapsing two workers into one model. qwen/qwen3.6-27b is stronger but LEAKS raw <think> tags into output. Both rejected 2026-08-04; revisit if either changes.',
    verified: '2026-08-04',
  },
  {
    id: 'geminipro',
    vision: false,       // agy transport: no image flag, read_file denied non-interactively. Hand-summon only.
    // API seat — PROMPT-BOUND. See the `gemini` seat for the canary evidence:
    // agy gates tool use behind an interactive approval a council dispatch can
    // never answer, so an implied file read kills the dispatch outright.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // CONFIRMED BAD 2026-08-21 from the PRIMARY source, antigravity.google/terms: "We use Interactions to evaluate, develop, and improve Google and Alphabet research, products, services and machine learning technologies" and "Google employees and contractors may access, view, review and use Interactions." Opt-out exists but is OFF BY DEFAULT and is not set on this machine.
    // BENCHED 2026-08-21 on a VERIFIED privacy finding — same rule that benched the
    // `gemini` seat that morning, applied to stronger evidence. The agy/Antigravity
    // path is governed by antigravity.google/terms, which says Interactions are used
    // to improve Google's machine-learning technologies AND that "Google employees and
    // contractors may access, view, review and use Interactions." Council prompts carry
    // trading positions and client detail — that is the documented reason
    // dashboard/data/council-transcripts/ is gitignored — so this path was strictly
    // WORSE than the free-tier API seat already benched for training, because it adds
    // HUMAN review. Verified twice against the primary source; a secondary source
    // claiming Antigravity "will not collect prompts" is WRONG, that sentence is not
    // in the terms.
    // The terms are NOT tier-differentiated: AI Pro / Ultra / student get the same
    // treatment as free. Only Workspace/Cloud enterprise is carved out.
    // RESTORE BY: opting out in Antigravity settings (the terms say "navigate to
    // settings to change your preference on how such data is used"), CONFIRMING the
    // toggle is off, then flipping dataTerms here. It is off-by-default in the wrong
    // direction: no preference recorded on this machine == data IS being used.
    tiers: ['BENCH'],
    // HAND-SUMMON ONLY as of 2026-08-22. Held the public-LEAD Google slot for one
    // day and LOST it to `gemini` (3.7 Flash High) in a measured 2x2 bake-off:
    // identical accuracy 4/4, but 97.4s on one of two calls versus Flash's
    // 9.9-12.7s. One-seat-per-lab means Google gets exactly one LEAD seat, and a
    // fat latency tail loses that slot — the seat that stalls is the seat quorum
    // drops. Still the deeper-tier model on paper, so it stays summonable by hand
    // (`--to geminipro --public`) for a genuinely hard one-off where 90s is fine.
    // REVISIT-IF: a 3.7-era PRO id appears in `agy models` (today the plan tops
    // out at 3.1 for Pro), or Flash regresses on a task Pro handles.
    role: 'DEEP-GOOGLE - hand-summoned Pro-tier reasoning, not a standing vote',
    lab: 'google',
    model: 'gemini-3.1-pro-high (via agy)',
    mandate:
      'Sub-metered through the Google AI Pro plan rather than API quota, which matters because EVERY Gemini pro id is 429/404 on the API key. PROMOTED from BENCH to LEAD 2026-08-20 after the student plan cleared Antigravity; it takes the Google lead slot from the flash-tier `gemini` seat, which keeps the roster at one lead seat per lab.',
    swapWhen:
      'ON PROBATION - 0-for-4 for its whole prior life, 3-for-3 since the plan landed. Watch the ledger; demote if it regresses. Falls back to `gemini` (flash, API wallet) if agy eligibility is ever pulled. Marginal cost is $0, so it is only ever worth what it answers.',
    // Was BENCHED for three weeks on a misread. Google's block was never a tier,
    // billing, credential or version problem: the AI Pro entitlement sat on a
    // GIFTED account (tranhaiquyenanh86631995@) that Google's abuse system was
    // holding back for lack of a verified identity. The student plan put the
    // entitlement on woodynguyen25@ - Woody's own long-verified account - and it
    // cleared immediately. The old diagnosis was correct; the fix was an identity
    // Google already trusts, not a better credential dance.
    verified: '2026-08-20',
  },
  {
    id: 'agyopus',
    vision: false,       // agy transport: no image flag, read_file denied non-interactively.
    // API seat — PROMPT-BOUND. See the `gemini` seat for the canary evidence.
    // Note what this costs: Opus-class reasoning on Google's wallet sounded like
    // free agent labour, but it cannot read a file, so it is free REASONING only.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // CONFIRMED BAD 2026-08-21 from the PRIMARY source, antigravity.google/terms: "We use Interactions to evaluate, develop, and improve Google and Alphabet research, products, services and machine learning technologies" and "Google employees and contractors may access, view, review and use Interactions." Opt-out exists but is OFF BY DEFAULT and is not set on this machine.
    // PROMOTED BENCH -> WORKER 2026-08-23 under Woody's "use everything the plan
    // gives us" ruling. This is the single biggest capability the flip unlocked:
    // Opus-class reasoning, billed to Google rather than to the Anthropic sub, in
    // the tier that grinds. Lab correlation with `claude` is irrelevant HERE —
    // workers execute a fixed spec and never vote, which is the same reason
    // `haiku` (also Anthropic) sits in this tier. The LEAD ban below still stands.
    tiers: ['WORKER'],
    role: 'FREE HEAVY LABOUR - Opus-class reasoning on Google’s wallet, never a vote',
    lab: 'anthropic',
    model: 'claude-opus-4-6-thinking (via agy)',
    mandate:
      'Anthropic Opus 4.6 served through the Google student plan at $0 marginal cost, 7-10s. The heavyweight of the worker tier: route specs here when the job needs real reasoning rather than fast bulk, and keep `haiku` for volume. Spends Google\'s wallet instead of the Anthropic sub, which matters when the Max plan is the binding constraint. NOT a council vote.',
    swapWhen:
      'BENCHED BY DESIGN. Proposed 2026-08-20 as a context CONTROL for the `claude` seat and rejected 3/3 by council the same day: it varies model version AND context simultaneously, so a split cannot be attributed to either - a real ablation holds the model fixed. The honest version was then measured and is not free (`claude -p --bare` and CLAUDE_CONFIG_DIR both force API-key auth, i.e. metered spend). Do NOT promote it to LEAD: a second Anthropic seat breaks one-seat-per-lab, and its agreement with `claude` would read as corroboration while being the same lab twice. REVISIT-IF: the back-test shows a context-free seat would have flipped a non-zero number of the last 30 days of verdicts.',
    verified: '2026-08-20',
  },
  {
    id: 'agyflash',
    vision: false,       // agy transport: no image flag, read_file denied non-interactively.
    // API seat — PROMPT-BOUND. This seat supplied the SECOND canary that proved
    // the gate is the PATH and not the model: on 2026-08-22 it ran the same
    // "read roster.js" probe on a DIFFERENT model (3.6-flash-high) and failed
    // with the identical agy permission refusal. One failure could have been the
    // model; two across two models is the agy CLI.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // CONFIRMED BAD 2026-08-21 from the PRIMARY source, antigravity.google/terms: "We use Interactions to evaluate, develop, and improve Google and Alphabet research, products, services and machine learning technologies" and "Google employees and contractors may access, view, review and use Interactions." Opt-out exists but is OFF BY DEFAULT and is not set on this machine.
    // BENCHED 2026-08-21 on a VERIFIED privacy finding — same rule that benched the
    // `gemini` seat that morning, applied to stronger evidence. The agy/Antigravity
    // path is governed by antigravity.google/terms, which says Interactions are used
    // to improve Google's machine-learning technologies AND that "Google employees and
    // contractors may access, view, review and use Interactions." Council prompts carry
    // trading positions and client detail — that is the documented reason
    // dashboard/data/council-transcripts/ is gitignored — so this path was strictly
    // WORSE than the free-tier API seat already benched for training, because it adds
    // HUMAN review. Verified twice against the primary source; a secondary source
    // claiming Antigravity "will not collect prompts" is WRONG, that sentence is not
    // in the terms.
    // The terms are NOT tier-differentiated: AI Pro / Ultra / student get the same
    // treatment as free. Only Workspace/Cloud enterprise is carved out.
    // RESTORE BY: opting out in Antigravity settings (the terms say "navigate to
    // settings to change your preference on how such data is used"), CONFIRMING the
    // toggle is off, then flipping dataTerms here. It is off-by-default in the wrong
    // direction: no preference recorded on this machine == data IS being used.
    // STANDING WORKER since 2026-08-23 (Woody's ruling — see the `gemini` seat).
    // Was --public-only; now free Google execution capacity in every convene that
    // is not marked --private.
    tiers: ['WORKER'],
    // MOVED 3.7-flash-high -> 3.6-flash-high on 2026-08-22, deliberately DOWN a
    // generation. 3.7 Flash (High) won the frontier bake-off and now fills the
    // `gemini` LEAD seat; running the identical model here too would put the same
    // weights in two rosters at once. Harmless for voting (workers execute a fixed
    // spec, they never vote) but it wastes the diversity and makes a --public
    // convene look like it consulted two Google seats when it consulted one model
    // twice. A worker's job is faithful execution, where 3.6 Flash is ample.
    // PROMOTED to WORKER 2026-08-20 to backfill cerebras (HTTP 402). Free on the
    // Google OAuth wallet and 6.6s - slower than cerebras's 0.4s, so this is a
    // ROLE CHANGE from 'fastest' to 'free', not a like-for-like swap.
    role: 'SPARE-WALLET - free Google execution capacity on the OAuth plan',
    lab: 'google',
    model: 'gemini-3.6-flash-high (via agy)',
    mandate:
      'Free Google execution capacity under --public. ⚠ ITS ORIGINAL MANDATE IS DEAD, recorded here rather than quietly deleted: this seat existed for WALLET REDUNDANCY against the `gemini` API seat, which went dark for 5 days when its AI-Studio project was suspended. On 2026-08-22 `gemini` itself moved onto agy, so both seats now share one binary, one OAuth account, one eligibility check and one failure domain. Different weights are not infrastructure redundancy — if agy goes down, BOTH Google seats go down together. Caught by the codex seat reviewing the consolidation. Real redundancy returns only when a second Google PATH exists (a billed AI-Studio key).',
    swapWhen:
      'Deliberately NOT wired as automatic failover: silent failover would mask a dead key, which is exactly the silent-degradation failure this roster already warns about. If the API seat dies we want the ALARM, then a manual `--to agyflash`. Promote to WORKER only if the API seat proves chronically unreliable.',
    verified: '2026-08-20',
  },
];

const byTier = tier => SEATS.filter(s => s.tiers.includes(tier)).map(s => s.id);

/** Frontier seats: ideate and decide. Decorrelated. */
const LEAD_SEATS = byTier('LEAD');

/** Cheap seats: execute a fixed spec. Correlation is fine. */
const WORKER_SEATS = byTier('WORKER');

/** Defined but deliberately out of every roster. */
const BENCHED_SEATS = byTier('BENCH');

/** Seat lookup by id, for tools that need role/model metadata. */
const SEAT_BY_ID = Object.fromEntries(SEATS.map(s => [s.id, s]));

/**
 * Seats that can actually VERIFY a claim — they spawn a CLI with filesystem and
 * command access. Everything else is a raw HTTPS call that can only reason from
 * what is in the prompt.
 *
 * Recorded 2026-08-21 after a brief asserted "you have filesystem access" to the
 * whole LEAD roster. `xai` is an API seat: it returned a 3.5s stub narrating a repo
 * inspection it could not perform. The capability was nowhere in the roster, so
 * nothing could have caught it. Of the current LEAD tier only claude and codex can
 * check anything — which is also WHY the 8/21 audit's best answer came from a CLI
 * seat: the API seats were structurally unable to refuse the premise.
 */
const AGENT_SEATS = SEATS.filter(s => s.toolAccess === 'agent').map(s => s.id);
const API_SEATS = SEATS.filter(s => s.toolAccess === 'api').map(s => s.id);

/**
 * Preference order for the SYNTHESIS seat — the one that merges the other seats'
 * answers after a convene.
 *
 * MOVED HERE 2026-08-21. council.js hardcoded
 * `SYNTH_FALLBACK_CHAIN = ['deepseek', 'xai', 'cerebras']`, which made it a
 * SECOND, PRIVATE COPY of seat placement living outside the file that declares
 * itself the single source of truth — the exact drift this file's header
 * documents four prior instances of. It had already rotted: `cerebras` was
 * benched on HTTP 402 Payment Required, so the last-resort synthesiser was a seat
 * that could not answer, and the failure surfaced as a payment error rather than
 * "no synth seat available".
 *
 * Derived, not written down: benched seats are filtered out, so benching a seat
 * anywhere in this file now removes it from synthesis automatically. `groq` was
 * added to keep THREE live links, which is what the original chain intended
 * before cerebras died — it is the weakest of the three and is genuinely a last
 * resort, but a live last resort beats a dead one.
 *
 * NOT ordered by raw capability. Synthesis is a MERGE job, not an opinion job:
 * the seat is summarising answers that already exist, so cheap-and-reliable beats
 * frontier-and-slow. That is why the deepseek WORKER seat leads a chain whose
 * second link is a LEAD seat.
 */
const SYNTH_PREFERENCE = ['deepseek', 'xai', 'cerebras', 'groq'];

/**
 * Live synthesis chain. Filtering introduces a new way to fail — bench enough
 * seats and synthesis would silently vanish — so tests/council/roster.test.js
 * asserts this is never empty.
 */
const SYNTH_CHAIN = SYNTH_PREFERENCE.filter(id => !byTier('BENCH').includes(id));

/**
 * Seats a `--private` convene must DROP.
 *
 * This replaced the PUBLIC tier on 2026-08-23. The old model made Google's free
 * capacity opt-IN (`--public`); Woody's ruling made it standing, so the list that
 * matters is now the inverse — who leaves when a prompt is somebody else's to
 * protect. Derived from `dataTerms`, so a seat can never be excluded from privacy
 * routing by forgetting to add it to a hand-maintained list: declaring the terms
 * IS the enrolment. The dispatch gate refuses these seats independently, so a
 * direct `--to gemini --private` is still refused pre-network. Two layers, one
 * rule — the rule just points the other way now.
 */
const TRAINS_ON_INPUT_SEATS = SEATS.filter(s => s.dataTerms === 'TRAINS-ON-INPUT').map(s => s.id);

/**
 * Seats that can retrieve information that did not exist at training time.
 *
 * Added 2026-08-23 from Woody's framing: "utilise each model for its best
 * strengths." The honest axis for that is NOT which model is smarter — that is
 * unmeasured here, contested everywhere, and stale every release. It is what a
 * model can REACH, which is verifiable today:
 *   claude · codex · haiku  filesystem + shell (can check a claim against disk)
 *   xai                     live web + X search
 *   everything else         prompt-bound
 *
 * And specialising this way ADDS decorrelation rather than spending it: a seat
 * quoting today's web fails differently from a seat reasoning off priors, which
 * is the same orthogonal-error effect that made a weak model improve a frontier
 * panel in arXiv 2603.20324. Routing by assumed intelligence would collapse the
 * council toward one opinion; routing by access widens it.
 */
const SEARCH_SEATS = SEATS.filter(s => s.liveSearch).map(s => s.id);

/**
 * Seats that can actually SEE an attached image, and by what mechanism.
 *
 * Added 2026-08-23 on Woody's instruction: "I want each council seat to be used
 * to their maximum extent. If Gemini can read images, let Gemini do that." Until
 * then every runner took a plain string and an attached image simply did not
 * exist — the whole council was blind.
 *
 * Declared here for the same reason liveSearch and toolAccess are: a capability
 * that lives in the runner is a capability nothing can check, and THIS roster has
 * been burned by exactly that twice (xai narrating a repo inspection it could not
 * perform; every agy seat claiming tools it cannot use). Every value below was
 * measured on 2026-08-23 against one probe image carrying a codeword and exact
 * shape counts — a seat had to report 'SALTMARSH-7, 3 red circles, 2 blue squares'
 * to be marked capable. Nothing here is inferred from a vendor's marketing page.
 *
 *   'native'     the transport accepts the image itself (codex -i, image_url, input_image)
 *   'read-tool'  a CLI agent opens the file from an absolute path in the prompt
 *   'gemini-api' agy cannot carry an image, so this seat's vision uses the Gemini API
 *   false        blind — measured, or structurally impossible on this transport
 *
 * THE RULE THAT MATTERS IS THE EXCLUSION, NOT THE LIST. A blind seat handed an
 * image question does not say "I cannot see it" — it answers anyway, fluently and
 * wrongly, which is the false-capability failure this file already carries two
 * scars from. So council.js DROPS every blind seat from a convene that has images
 * attached and prints why, rather than letting four confident paragraphs about a
 * screenshot nobody looked at reach a verdict.
 */
const VISION_SEATS = SEATS.filter(s => s.vision).map(s => s.id);
const VISION_MODE = Object.fromEntries(SEATS.filter(s => s.vision).map(s => [s.id, s.vision]));

/**
 * Provider model-catalogue endpoints, for rot detection. A seat whose model id
 * has vanished from its provider is the exact failure this file exists to stop.
 *
 * `auth` differs by vendor: most take a Bearer header, Gemini takes the key as
 * a query param. CLI-backed seats (claude, codex, geminipro) expose no
 * catalogue at all and are covered by the liveness probe instead.
 */
const CATALOGUES = {
  cerebras: { url: 'https://api.cerebras.ai/v1/models', key: 'CEREBRAS_API_KEY', auth: 'bearer' },
  groq: { url: 'https://api.groq.com/openai/v1/models', key: 'GROQ_API_KEY', auth: 'bearer' },
  xai: { url: 'https://api.x.ai/v1/models', key: 'XAI_API_KEY', auth: 'bearer' },
  deepseek: { url: 'https://api.deepseek.com/models', key: 'DEEPSEEK_API_KEY', auth: 'bearer' },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
    key: 'GEMINI_API_KEY',
    auth: 'query',
  },
};

/**
 * Working model ids a provider serves but does NOT list in its catalogue, so
 * the rot check stops crying wolf on them. Keep this SHORT: every entry is a
 * spot where rot detection is blind, so each needs a probe-verified date, and
 * a stale entry here is worse than a WARN (it silences a real rot).
 */
const KNOWN_ALIASES = {
  // DeepSeek's documented always-current alias for its chat model; /models
  // lists only concrete version ids. Probe-verified UP 2026-08-05 (~1s PONG).
  deepseek: ['deepseek-chat'],
};

module.exports = { SEATS, SEAT_BY_ID, LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, TRAINS_ON_INPUT_SEATS, SEARCH_SEATS, VISION_SEATS, VISION_MODE, AGENT_SEATS, API_SEATS, SYNTH_PREFERENCE, SYNTH_CHAIN, CATALOGUES, KNOWN_ALIASES };
