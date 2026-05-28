import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';

interface SkillInfo {
  name: string;
  version: string;
  description: string;
  command: string;
  triggerType: string;
  hasTests: boolean;
  hasReadme: boolean;
  manifestPath: string;
  mtime: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tries multiple likely skill locations: the repo-local dev path first, then
// the Droplet deployment path (in case this dashboard is colocated).
const SKILL_PATH_CANDIDATES = [
  process.env.HERMES_SKILLS_DIR,
  path.resolve(process.cwd(), 'hetzner', 'skills'),
  path.resolve(process.cwd(), 'dashboard', 'hetzner', 'skills'),
  '/home/hermes/.hermes/skills',
].filter(Boolean) as string[];

async function findSkillsDir(): Promise<string | null> {
  for (const candidate of SKILL_PATH_CANDIDATES) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return candidate;
    } catch {
      // not found, try next
    }
  }
  return null;
}

function parseMinimalYaml(text: string): Record<string, string | Record<string, string>> {
  const result: Record<string, string | Record<string, string>> = {};
  const lines = text.split('\n');
  let inDescription = false;
  const descriptionLines: string[] = [];
  let currentNested: Record<string, string> | null = null;
  let currentNestedKey: string | null = null;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const topLevel = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (topLevel) {
      const [, key, valueRaw] = topLevel;
      const value = valueRaw.trim();

      if (inDescription) {
        result.description = descriptionLines.join(' ').replace(/\s+/g, ' ').trim();
        descriptionLines.length = 0;
        inDescription = false;
      }

      if (key === 'description' && (value === '' || value.startsWith('>'))) {
        inDescription = true;
        if (value.startsWith('>')) {
          const rest = value.slice(1).trim();
          if (rest) descriptionLines.push(rest);
        }
        continue;
      }

      if (value === '') {
        currentNested = {};
        currentNestedKey = key;
        result[key] = currentNested;
      } else {
        result[key] = value.replace(/^['"]|['"]$/g, '');
        currentNested = null;
        currentNestedKey = null;
      }
      continue;
    }

    const nested = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (nested && currentNested) {
      currentNested[nested[1]] = nested[2].trim().replace(/^['"]|['"]$/g, '');
      continue;
    }

    if (inDescription) {
      descriptionLines.push(line.trim());
    }
  }

  if (inDescription && descriptionLines.length > 0) {
    result.description = descriptionLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  return result;
}

async function loadSkill(skillDir: string): Promise<SkillInfo | null> {
  const manifestPath = path.join(skillDir, 'skill.yaml');
  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const parsed = parseMinimalYaml(content);
    const stat = await fs.stat(manifestPath);

    const trigger = (typeof parsed.trigger === 'object' ? parsed.trigger : {}) as Record<string, string>;
    const dirEntries = await fs.readdir(skillDir);
    const hasTests = dirEntries.some((f) => f.startsWith('test_') && f.endsWith('.py'));
    const hasReadme = dirEntries.includes('README.md');

    return {
      name: String(parsed.name ?? path.basename(skillDir)),
      version: String(parsed.version ?? '?'),
      description: String(parsed.description ?? '').trim(),
      command: trigger.command ?? '',
      triggerType: trigger.type ?? 'unknown',
      hasTests,
      hasReadme,
      manifestPath,
      mtime: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest) {
  const skillsDir = await findSkillsDir();
  if (!skillsDir) {
    return NextResponse.json<ApiResponse<{ skills: SkillInfo[]; source: string }>>({
      success: true,
      data: { skills: [], source: 'no-skills-dir' },
    });
  }

  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch (err) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: err instanceof Error ? err.message : 'list failed' },
      { status: 500 }
    );
  }

  const skillDirs = entries.filter(
    (e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.')
  );
  const skills = (await Promise.all(skillDirs.map((e) => loadSkill(path.join(skillsDir, e.name)))))
    .filter((s): s is SkillInfo => s !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json<ApiResponse<{ skills: SkillInfo[]; source: string }>>({
    success: true,
    data: { skills, source: skillsDir },
  });
}
