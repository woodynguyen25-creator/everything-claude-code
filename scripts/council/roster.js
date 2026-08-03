/**
 * Council rosters — the single source of truth for which seats sit where.
 * Split out of council.js (2026-08-02) so health.js probes exactly the seats
 * the council actually dispatches to, instead of a copy that silently drifts.
 *
 * Two rosters, two jobs. The distinction is deliberate:
 *
 *   LEAD  = DECIDE. Frontier models ideate, argue, and stress-test a call.
 *           Kept DECORRELATED on purpose — each seat answers independently
 *           through its own lens, and never sees another seat's round-1 answer.
 *           Correlated seats manufacture false consensus: five models echoing
 *           one opinion *feels* like agreement while carrying no information.
 *           That is strictly worse than not convening a council.
 *   WORK  = EXECUTE. Cheap/fast seats implement a spec a lead already fixed.
 *           Correlation is FINE here — faithful execution is the goal, not
 *           divergence. Lenses are off for this roster.
 *
 * Ledger evidence over 1,076 dispatches (2026-06-09 → 2026-08-02):
 *   xai      128 calls   0% fail  6,442 avg ch   most reliable seat in the roster
 *   cerebras 176 calls   1% fail  6,316 avg ch
 *   deepseek 349 calls   4% fail  4,192 avg ch   also the synthesis seat
 *   groq     198 calls   5% fail  2,325 avg ch   ~1/3 the substance of cerebras on
 *                                                identical prompts, and it flunked
 *                                                an exact-instruction probe
 *                                                (asked for "PONG", said "PING")
 *                                                → demoted to WORKER only
 *   codex    109 calls  22% fail  182s avg       slow and flaky, but frontier
 *   gemini   113 calls  44% fail                 project was SUSPENDED; key rotated
 *                                                2026-08-02 → ON PROBATION
 */
'use strict';

/** Frontier seats: ideate and decide. Decorrelated. */
const LEAD_SEATS = ['claude', 'codex', 'xai', 'gemini'];

/** Cheap seats: execute a fixed spec. Correlation is fine. */
const WORKER_SEATS = ['groq', 'gemini', 'deepseek', 'cerebras'];

/**
 * Seats that exist as runners but belong to NO roster.
 * geminipro: 0-for-3 lifetime. `agy` refuses every Google account tried
 * ("not eligible for Antigravity") and the gemini CLI has been cut off for all
 * individual accounts since 2026-06-18. Still callable via --to for testing.
 * REVISIT-IF: an `agy` login clears Google's identity verification.
 */
const BENCHED_SEATS = ['geminipro'];

module.exports = { LEAD_SEATS, WORKER_SEATS, BENCHED_SEATS };
