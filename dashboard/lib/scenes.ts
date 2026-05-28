import fs from 'node:fs';
import path from 'node:path';
import type { ModeName } from '@/lib/mode';

const sceneMap: Record<ModeName, string> = {
  dawn: '/art/scenes/dawn-asgard.webp',
  day: '/art/scenes/day-olympus.webp',
  dusk: '/art/scenes/dusk-mordor.webp',
  night: '/art/scenes/night-norse-stars.webp',
};

export function getSceneSource(mode: ModeName) {
  const src = sceneMap[mode];
  const fullPath = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
  return {
    src,
    exists: fs.existsSync(fullPath),
  };
}
