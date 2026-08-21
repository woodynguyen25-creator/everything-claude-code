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
    model: 'claude-opus-5',
    mandate:
      'Deepest reasoning seat. Carries the most context and is the one to trust on architecture and multi-file consequences.',
    swapWhen:
      'A newer Anthropic frontier ships (Opus 6, etc). NOTE: this is the LEAST decorrelated seat - `claude -p` inherits the same CLAUDE.md, rules and memory as the main session, so it argues in Woody\'s house style. Treat its agreement with the orchestrator as near-zero evidence.',
    verified: '2026-08-04',
  },
  {
    id: 'codex',
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
    model: 'gpt-5.6-sol',
    mandate:
      'The build-it-for-real seat. Boots a full agent session with MCP + skills, so it answers like something that actually has to ship the thing.',
    swapWhen:
      'A newer Sol/GPT frontier ships. Watch latency: 182s average and 22% failure historically, which is why it stays out of fast paths and gets summoned for depth.',
    verified: '2026-08-04',
  },
  {
    id: 'xai',
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'verified-private', // xAI exposes a Zero Data Retention setting for eligible API teams.
    tiers: ['LEAD'],
    role: 'CONTRARIAN - red-team, premise attack, uncomfortable truths',
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
      'grok-5 ships, or the xAI data-sharing free credits end - at $2/$6 per M it is the priciest seat and only economical while those credits are active.',
    verified: '2026-08-04',
  },
  {
    id: 'gemini',
    // API seat: a raw HTTPS call. NO filesystem, NO commands, NO verification.
    // Asking it to 'check the tree' produces a confident stub — measured 2026-08-21,
    // when a brief told xai it had filesystem access and it burned a dispatch
    // narrating tool use it could not perform.
    toolAccess: 'api',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // CONFIRMED BAD: ai.google.dev pricing states free tier = 'Used to improve our products: Yes'. This is why the seat is benched.
    tiers: ['BENCH'],
    // BENCHED 2026-08-21 on a PRIVACY finding, not a capability one.
    // ai.google.dev/gemini-api/docs/pricing states per model, under
    // "Used to improve our products": FREE tier = Yes, PAID tier = No.
    // This seat runs on a FREE-tier AI Studio key - re-confirmed 2026-08-20 when
    // every Pro id returned 429, which is the free-tier signature. Council prompts
    // carry trading positions, client details and personal context; that is the
    // stated reason dashboard/data/council-transcripts/ is gitignored. So every
    // convene including this seat was shipping exactly that content to Google on
    // the tier where it is used for product improvement.
    // Restore to WORKER by attaching BILLING to the AI-Studio project (which flips
    // the flag to "No"), NOT by swapping the model id - the tier is the issue.
    // agyflash covers the freed worker slot. Do NOT assume agyflash is safer on
    // privacy: it rides the CONSUMER AI Pro sub, whose data terms are unverified
    // and typically less protective than paid API. Verify before trusting it with
    // sensitive prompts.
    role: 'BREADTH - cheap bulk grinding at ~1.2s per call',
    lab: 'google',
    model: 'gemini-3.6-flash',
    mandate:
      'Fast, free and low-variance: the cheapest way to grind a fixed spec. DEMOTED from LEAD 2026-08-20 - this seat was only ever in the lead tier because it was the sole Google path, and a flash model sitting next to Opus 5 and Sol was a documented mismatch. `geminipro` now holds the Google LEAD slot on an actual frontier model, so the lab keeps ONE lead seat and this one does what it is genuinely good at.',
    swapWhen:
      'Retire if the API project is suspended again (it was, for 5 days in Jul/Aug) and `agyflash` proves it can carry worker load on the OAuth wallet instead. Do NOT promote it back to LEAD by pointing it at a pro id - every pro id is 429/404 on this key, measured again 2026-08-20.',
    // Chose on measured LATENCY VARIANCE, not median. n=5 each, 2026-08-05:
    //   3.6-flash  5/5  med 1242ms  range 1125-1293   <- picked
    //   3.5-flash  5/5  med 2026ms  range 1142-24539  <- 20x spread
    //   flash-latest      1/5  RESOURCE_EXHAUSTED x4 (shared free-tier quota pool)
    //   3-flash-preview   5/5  med 1752ms  range 878-8008
    // 3.5-flash never FAILED, it stalled: live health probes hit 5.3s / 16.1s /
    // 45.0s(timeout) on the same key minutes apart. A seat that answers in 45s is
    // dropped from quorum by the council's own timeout, so a fat tail degrades the
    // council exactly like a dead seat but without tripping the DOWN alarm.
    // Median is the wrong statistic for a quorum member; the tail is the product.
    // The 2026-08-02 note that 3.6 "flaps 403 2/3" was an artifact of the SUSPENDED
    // project on the old key, not the model - 5/5 clean on the rotated key.
    verified: '2026-08-05',
  },
  {
    id: 'deepseek',
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
      'Most-dispatched seat (349 calls) and the default synthesis provider. Best paid value in the roster.',
    swapWhen:
      'KEEP deepseek-chat for now despite it no longer appearing in the catalogue (allowlisted in KNOWN_ALIASES). Measured n=3 on 2026-08-20: deepseek-chat 1.6s / ~50 output tokens; deepseek-v4-flash 11.6s / 1086-1965 output tokens; deepseek-v4-pro 12.9s / 674-1599. The v4 models are REASONERS that burn 20-40x the output tokens on a task asking for 40 words, and this is a WORKER seat whose job is fast, cheap execution of a fixed spec - deepseek-chat is the right tool for that role and is 8x faster. Pinned successor if deepseek-chat is withdrawn: deepseek-v4-flash (peak $0.44 in / $1.32 out per M; v4-pro is 3x that at $1.32/$3.96). DeepSeek discounts off-peak by 50%, so batch grinding is materially cheaper outside peak hours.',
    verified: '2026-08-04',
  },
  {
    id: 'cerebras',
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
    model: 'qwen/qwen3.6-27b',
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
    // AGENT seat: spawns a real CLI session, so it CAN read the repo, run commands
    // and verify claims. Ask it to check things.
    toolAccess: 'agent',
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
    role: 'FRONTIER-GOOGLE - the Google lead seat, on a real Pro model',
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
    // AGENT seat: spawns a real CLI session, so it CAN read the repo, run commands
    // and verify claims. Ask it to check things.
    toolAccess: 'agent',
    // Data-use terms for THIS path. Machine-readable so a future gate can refuse
    // to route sensitive prompts to a seat that may train on them, rather than
    // relying on a comment nobody reads. 'UNVERIFIED' is NOT 'safe'.
    dataTerms: 'TRAINS-ON-INPUT', // CONFIRMED BAD 2026-08-21 from the PRIMARY source, antigravity.google/terms: "We use Interactions to evaluate, develop, and improve Google and Alphabet research, products, services and machine learning technologies" and "Google employees and contractors may access, view, review and use Interactions." Opt-out exists but is OFF BY DEFAULT and is not set on this machine.
    tiers: ['BENCH'],
    role: 'FREE LABOUR - Opus-class reasoning on Google’s wallet, not a vote',
    lab: 'anthropic',
    model: 'claude-opus-4-6-thinking (via agy)',
    mandate:
      'Anthropic Opus 4.6 served through the Google student plan at $0 marginal cost, 7-10s. Useful for one-off deep reasoning and subagent labour where the Anthropic sub would otherwise be the constraint. NOT a council vote.',
    swapWhen:
      'BENCHED BY DESIGN. Proposed 2026-08-20 as a context CONTROL for the `claude` seat and rejected 3/3 by council the same day: it varies model version AND context simultaneously, so a split cannot be attributed to either - a real ablation holds the model fixed. The honest version was then measured and is not free (`claude -p --bare` and CLAUDE_CONFIG_DIR both force API-key auth, i.e. metered spend). Do NOT promote it to LEAD: a second Anthropic seat breaks one-seat-per-lab, and its agreement with `claude` would read as corroboration while being the same lab twice. REVISIT-IF: the back-test shows a context-free seat would have flipped a non-zero number of the last 30 days of verdicts.',
    verified: '2026-08-20',
  },
  {
    id: 'agyflash',
    // AGENT seat: spawns a real CLI session, so it CAN read the repo, run commands
    // and verify claims. Ask it to check things.
    toolAccess: 'agent',
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
    // PROMOTED to WORKER 2026-08-20 to backfill cerebras (HTTP 402). Free on the
    // Google OAuth wallet and 6.6s - slower than cerebras's 0.4s, so this is a
    // ROLE CHANGE from 'fastest' to 'free', not a like-for-like swap.
    role: 'SPARE-WALLET - Google flash on OAuth instead of the API key',
    lab: 'google',
    model: 'gemini-3.7-flash-high (via agy)',
    mandate:
      'Wallet redundancy. The `gemini` API seat went dark for 5 days when its AI-Studio project was SUSPENDED (403 on every model, not quota). This path bills the OAuth wallet, so it survives that entire class of outage - a different failure domain, not just a different key.',
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

module.exports = { SEATS, SEAT_BY_ID, LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, AGENT_SEATS, API_SEATS, SYNTH_PREFERENCE, SYNTH_CHAIN, CATALOGUES, KNOWN_ALIASES };
