#!/usr/bin/env node
/**
 * shipgate.mjs — the anti-slop ship gate, as a program instead of a paragraph.
 *
 * WHY (2026-08-13). SKILL.md calls the ship gate a "hard block, not advisory."
 * It is prose, so it is advisory in practice: on the AJR rebuild — the build that
 * existed to prove the doctrine — it scored 2 of 6, and the two skipped steps were
 * the two the doctrine calls decisive ("3 directions" and the external critique).
 * Prose reliably shapes what gets WRITTEN and does not reliably make anything RUN.
 * So: exit code 1, or it will keep scoring 2/6.
 *
 *   node shipgate.mjs <project-dir> [--build dist] [--json]
 *
 * Checks, in order of how often they get skipped:
 *   1. DESIGN.md exists and declares a register
 *   2. TWO references named (one reference is cloning)
 *   3. all three taste dials declared
 *   4. directions.png exists  -> proof step 2 actually happened
 *   5. a direction was CHOSEN and recorded
 *   6. detect.mjs P0 = 0 on the build output
 *   7. contact-sheet.png exists -> cross-project divergence was judged
 *   8. external critique recorded
 *
 * Never guesses. A check it cannot evaluate reports UNKNOWN and fails closed —
 * a gate whose failure looks like a pass is worse than no gate.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const GREEN = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', OFF = '\x1b[0m', YEL = '\x1b[33m';

function parse(argv) {
  const o = { dir: null, build: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--build') o.build = argv[++i];
    else if (argv[i] === '--json') o.json = true;
    else if (!o.dir) o.dir = argv[i];
  }
  return o;
}

function findFile(root, name, depth = 3) {
  const stack = [[root, 0]];
  while (stack.length) {
    const [d, lvl] = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name.startsWith('.git')) continue;
      const p = path.join(d, e.name);
      if (e.isFile() && e.name.toLowerCase() === name.toLowerCase()) return p;
      if (e.isDirectory() && lvl < depth) stack.push([p, lvl + 1]);
    }
  }
  return null;
}

function main() {
  const args = parse(process.argv.slice(2));
  if (!args.dir) {
    console.error('usage: shipgate.mjs <project-dir> [--build dist] [--json]');
    process.exit(2);
  }
  const root = path.resolve(args.dir);
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });

  // ---- 1-3 & 5: the DESIGN.md contract -------------------------------------
  const designPath = findFile(root, 'DESIGN.md');
  const design = designPath ? fs.readFileSync(designPath, 'utf8') : '';
  add('design-md', !!designPath, designPath ? path.relative(root, designPath) : 'no DESIGN.md found');

  const register = /(?:^|\n)\s*\**Register[^\n]*?:\**\s*`?([a-z-]+)`?/i.exec(design);
  add('register', !!register, register ? register[1] : 'no "Register:" line');

  // Two references, remixed. "X × Y" / "X x Y" / "A and B" on a References line.
  const refLine = /(?:^|\n)[^\n]*Reference[s]?[^\n]*:\**([^\n]+)/i.exec(design);
  const twoRefs = refLine ? /[×x✕]|\band\b/i.test(refLine[1]) && refLine[1].trim().length > 12 : false;
  add('two-references', twoRefs, refLine ? refLine[1].trim().slice(0, 64) : 'no "References remixed:" line');

  const dials = ['DESIGN_VARIANCE', 'MOTION_INTENSITY', 'VISUAL_DENSITY'].filter(d => design.includes(d));
  add('taste-dials', dials.length === 3, `${dials.length}/3 declared`);

  // ---- 4: three directions were actually explored ---------------------------
  const dirsPng = findFile(root, 'directions.png');
  add('three-directions', !!dirsPng,
    dirsPng ? path.relative(root, dirsPng) : 'no directions.png — step 2 was skipped');

  // ---- 5: and one was chosen -------------------------------------------------
  const chosen = /(?:chosen|selected|picked)\s+direction\s*:?\s*\**([A-C])\b/i.exec(design)
    || /(?:^|\n)\s*\**Direction chosen\**\s*:\s*([^\n]+)/i.exec(design);
  add('direction-chosen', !!chosen,
    chosen ? String(chosen[1]).trim().slice(0, 40) : 'DESIGN.md does not record which direction was chosen');

  // ---- 6: mechanical detector, P0 = 0 ---------------------------------------
  // Pick the FRESHEST build, not the first one that happens to exist. ajr-blends
  // carries both a legacy root dist/ and the live app/dist/, and taking the first
  // match scanned the stale one — reporting 16 anti-patterns against a build that
  // was verified clean. Auditing the wrong artifact is indistinguishable from a
  // real failure, so order by mtime of the entry file.
  const stamp = (d) => {
    for (const f of ['index.html', 'index.htm']) {
      const p = path.join(d, f);
      try { return fs.statSync(p).mtimeMs; } catch { /* next */ }
    }
    try { return fs.statSync(d).mtimeMs; } catch { return 0; }
  };
  const buildDir = args.build
    ? path.resolve(root, args.build)
    : ['dist', 'app/dist', 'build', 'out', 'app/build']
      .map(d => path.join(root, d))
      .filter(d => fs.existsSync(d))
      .sort((a, b) => stamp(b) - stamp(a))[0];
  if (!buildDir || !fs.existsSync(buildDir)) {
    add('detector', false, 'no build output found (pass --build <dir>)');
  } else {
    const detect = path.join(os.homedir(), '.claude', 'skills', 'impeccable', 'scripts', 'detect.mjs');
    if (!fs.existsSync(detect)) {
      add('detector', false, 'impeccable detect.mjs not found');
    } else {
      // The detector exits NON-ZERO when it finds anti-patterns and also prints
      // advisory notes, so execFileSync throws on a perfectly good run. Read the
      // output off the error object rather than reporting "detector failed" —
      // that misreported a real, parseable result as an infrastructure fault.
      let out = '';
      let ran = false;
      try {
        out = execFileSync(process.execPath, [detect, buildDir],
          { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
        ran = true;            // exit 0
      } catch (e) {
        out = `${e.stdout || ''}${e.stderr || ''}`;
        ran = out.trim().length > 0;   // non-zero exit WITH output is a real report
      }
      const m = /(\d+)\s+anti-pattern/.exec(out);
      if (!ran) {
        add('detector', false, 'detector could not run — cannot verify (failing closed)');
      } else {
        // A clean run exits 0 and prints nothing. That is a PASS, not an unknown.
        const n = m ? Number(m[1]) : 0;
        add('detector', n === 0,
          n === 0 ? `clean — ${path.relative(root, buildDir) || '.'}`
            : `${n} anti-pattern(s) in ${path.relative(root, buildDir)}`);
      }
    }
  }

  // ---- 7: cross-project divergence was judged --------------------------------
  const sheet = findFile(root, 'contact-sheet.png');
  add('divergence', !!sheet,
    sheet ? path.relative(root, sheet) : 'no contact-sheet.png — never compared against prior work');

  // ---- 8: external critique --------------------------------------------------
  // MUST read the checkbox STATE, not merely find the words. The first version
  // matched "External critique (codex) run and triaged" inside an UNCHECKED
  // "- [ ]" line in the Definition of Done and reported a PASS — a gate that
  // green-lights unfinished work is worse than no gate.
  const critLine = /^[ \t]*[-*][ \t]*\[([ xX])\][^\n]*(?:codex|external)[^\n]*critique[^\n]*$/im.exec(design)
    || /^[ \t]*[-*][ \t]*\[([ xX])\][^\n]*critique[^\n]*$/im.exec(design);
  let critOk, critWhy;
  if (critLine) {
    critOk = critLine[1].toLowerCase() === 'x';
    critWhy = critOk ? 'checked off in DESIGN.md' : 'listed but UNCHECKED in Definition of done';
  } else {
    // No checkbox at all: accept only an explicit past-tense record.
    critOk = /critique\s*(?:run|complete[d]?|triaged)\s*[:\-—]/i.test(design);
    critWhy = critOk ? 'recorded in DESIGN.md' : 'no external critique recorded';
  }
  add('external-critique', critOk, critWhy);

  const passed = checks.filter(c => c.ok).length;
  const total = checks.length;

  if (args.json) {
    console.log(JSON.stringify({ project: root, passed, total, checks }, null, 1));
  } else {
    console.log(`\n  SHIP GATE — ${path.basename(root)}\n`);
    for (const c of checks) {
      const mark = c.ok ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`;
      console.log(`  ${mark} ${c.id.padEnd(19)} ${DIM}${c.detail}${OFF}`);
    }
    const bar = passed === total ? GREEN : YEL;
    console.log(`\n  ${bar}${passed}/${total}${OFF} — ${passed === total
      ? `${GREEN}SHIPPABLE${OFF}`
      : `${RED}NOT DONE${OFF} (an unchecked box means not done, full stop)`}\n`);
  }
  process.exit(passed === total ? 0 : 1);
}

main();
