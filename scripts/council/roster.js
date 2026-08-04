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
    tiers: ['LEAD'],
    role: 'CONTRARIAN - red-team, premise attack, uncomfortable truths',
    lab: 'xai',
    model: 'grok-4.5',
    mandate:
      'Most reliable seat in the roster (0% failure over 128 calls, highest average output). Least filtered, which is what the red-team lens needs.',
    swapWhen:
      'grok-5 ships, or the xAI data-sharing free credits end - at $2/$6 per M it is the priciest seat and only economical while those credits are active.',
    verified: '2026-08-04',
  },
  {
    id: 'gemini',
    tiers: ['LEAD', 'WORKER'],
    role: 'BREADTH - fast wide-angle takes as a lead, cheap bulk grinding as a worker',
    lab: 'google',
    model: 'gemini-3.5-flash',
    mandate:
      'Google lab representation, which the roster otherwise lacks entirely. Fast and free enough to also carry worker load. Currently FLASH-tier, a genuine mismatch sitting next to Opus 5 and Sol.',
    swapWhen:
      'PROMOTE to gemini-3.1-pro-preview the moment Cloud billing is linked to the AI-Studio project - every pro id is 429 quota-0 on the free tier today. Or defer to `geminipro` if Antigravity ever clears, since that reaches Gemini 3 Pro via the subscription instead of API quota. On probation: 44% lifetime failure, key rotated 2026-08-02.',
    verified: '2026-08-04',
  },
  {
    id: 'deepseek',
    tiers: ['WORKER'],
    role: 'SYNTHESIST - merges seat answers, drafts, bulk reasoning',
    lab: 'deepseek',
    model: 'deepseek-chat',
    mandate:
      'Most-dispatched seat (349 calls) and the default synthesis provider. Best paid value in the roster.',
    swapWhen:
      'deepseek-v4-pro measured SLOWER (12s vs 2.8s) and shorter than the deepseek-chat alias on an identical prompt - a newer id is not automatically better, so re-measure before swapping. deepseek-reasoner is live if a thinking variant is ever wanted.',
    verified: '2026-08-04',
  },
  {
    id: 'cerebras',
    tiers: ['WORKER'],
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
    tiers: ['WORKER'],
    role: 'CHEAP DRAFT - throwaway passes where substance barely matters',
    lab: 'meta',
    model: 'llama-3.3-70b-versatile',
    mandate:
      'Demoted out of LEAD 2026-08-02: 2,325 average output chars vs cerebras 6,316 on identical prompts, 5x the failure rate, and it flunked an exact-instruction probe (asked for "PONG", answered "PING"). Kept for lab diversity and raw speed only.',
    swapWhen:
      'openai/gpt-oss-120b is on the Groq key and benchmarked faster (746ms vs 964ms) - but it DUPLICATES the cerebras seat exactly, collapsing two workers into one model. qwen/qwen3.6-27b is stronger but LEAKS raw <think> tags into output. Both rejected 2026-08-04; revisit if either changes.',
    verified: '2026-08-04',
  },
  {
    id: 'geminipro',
    tiers: ['BENCH'],
    role: 'FRONTIER-GOOGLE - the only path to Gemini 3 Pro that exists here',
    lab: 'google',
    model: 'gemini-3-pro (via agy)',
    mandate:
      'Sub-metered through the Google AI Pro subscription rather than API quota, which matters because EVERY Gemini pro id is 429 quota-0 on the API key. If it ever works it is a real frontier seat, not a flash seat.',
    swapWhen:
      'BLOCKED, 0-for-4 lifetime. Google returns VALIDATION_REQUIRED (al_alert). Antigravity requires age 18+, an approved geography, and a personal account. The account is personal and email-verified, but its id_token carries NO locale claim and it was registered under a Vietnamese name - country association is the prime suspect, age second. Promote to LEAD on probation if it ever clears.',
    verified: '2026-08-04',
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

module.exports = { SEATS, SEAT_BY_ID, LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS, CATALOGUES };
