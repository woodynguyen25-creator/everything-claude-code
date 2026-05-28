import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export type PersonaMeta = {
  agent: string;
  title: string;
  mythology: string;
  role: string;
  voice: string;
  route: string;
  contextFiles: string[];
};

function personaPath(slug: string) {
  return path.join(process.cwd(), 'personas', `${slug}.md`);
}

function expandPath(p: string): string {
  return p.replace(/^~/, os.homedir()).replace(/%USERPROFILE%/gi, os.homedir());
}

export async function readPersona(slug: string): Promise<{ meta: PersonaMeta; body: string }> {
  // Normalize CRLF → LF so the frontmatter regex works on Windows-edited files
  const raw = (await fs.readFile(personaPath(slug), 'utf8')).replace(/\r\n/g, '\n');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid persona file: ${slug}`);
  }

  const frontmatter = match[1];
  const body = match[2].trim();
  const pairs = frontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split(':');
      return [key.trim(), rest.join(':').trim()] as const;
    });

  const map = Object.fromEntries(pairs);

  // context_files: pipe-separated list of absolute paths to inject into system prompt
  const contextFiles = map.context_files
    ? map.context_files.split('|').map((p) => expandPath(p.trim())).filter(Boolean)
    : [];

  return {
    meta: {
      agent: map.agent || slug,
      title: map.title || slug,
      mythology: map.mythology || '',
      role: map.role || '',
      voice: map.voice || '',
      route: map.route || `/${slug}`,
      contextFiles,
    },
    body,
  };
}

export async function readPersonaSystemPrompt(slug: string): Promise<string> {
  const { body, meta } = await readPersona(slug);
  const match = body.match(/## System Prompt\s+([\s\S]*?)(?:\n## |\n---|$)/);
  let systemPrompt = (match?.[1] || body).trim();

  // Inject context files — each file's content appended as a named section
  for (const filePath of meta.contextFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const label = path.basename(filePath, path.extname(filePath)).toUpperCase().replace(/[-_]/g, ' ');
      systemPrompt += `\n\n---\n\n## LIVE CONTEXT: ${label}\n\n${content.trim()}`;
    } catch {
      // File missing or unreadable — skip silently, don't break the agent
    }
  }

  return systemPrompt;
}
