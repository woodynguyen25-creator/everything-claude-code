// ============================================================================
// Decoration Sprites — Walls, backgrounds, zone labels, night overlay
// ============================================================================

import { gridToScreen, TILE_W, TILE_H, MAP_OFFSET_X, MAP_OFFSET_Y } from '@/throne-engine/engine/isometric';
import { MAP_COLS, MAP_ROWS } from '@/throne-engine/office/layout';

// ---------------------------------------------------------------------------
// Background / Sky
// ---------------------------------------------------------------------------

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightPhase: number,
): void {
  // Dark neon-cyber sky (androoagi look): near-black with a cool vignette
  void dayNightPhase;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0a0a16');
  grad.addColorStop(0.55, '#070710');
  grad.addColorStop(1, '#04040a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Faint starfield (always on)
  ctx.fillStyle = 'rgba(120, 200, 255, 0.18)';
  const stars = [
    [50, 20], [150, 35], [280, 15], [400, 40], [550, 25],
    [700, 30], [100, 55], [350, 50], [500, 45], [650, 55],
    [200, 60], [450, 20], [600, 50], [820, 28], [960, 44], [1040, 18],
  ];
  for (const [sx, sy] of stars) {
    ctx.fillRect(sx, sy, 2, 2);
  }
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

export function drawWalls(ctx: CanvasRenderingContext2D): void {
  // Draw outer wall base along the top & left edges of the map
  ctx.strokeStyle = 'rgba(94, 246, 255, 0.35)';
  ctx.lineWidth = 2;

  // Top-left wall edge
  const topLeft = gridToScreen({ col: 0, row: 0 });
  const topRight = gridToScreen({ col: MAP_COLS - 1, row: 0 });
  const bottomLeft = gridToScreen({ col: 0, row: MAP_ROWS - 1 });

  ctx.beginPath();
  ctx.moveTo(bottomLeft.x - TILE_W / 2, bottomLeft.y);
  ctx.lineTo(topLeft.x, topLeft.y - TILE_H / 2);
  ctx.lineTo(topRight.x + TILE_W / 2, topRight.y);
  ctx.stroke();
}

export function drawDividerWall(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
): void {
  const { x, y } = gridToScreen({ col, row });
  const wallH = 18;

  // Top surface
  ctx.fillStyle = '#18202c';
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_H / 2 - wallH);
  ctx.lineTo(x + TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x - TILE_W / 2, y - wallH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(94, 246, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Left face
  ctx.fillStyle = '#0f0f18';
  ctx.beginPath();
  ctx.moveTo(x - TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x - TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.moveTo(x + TILE_W / 2, y - wallH);
  ctx.lineTo(x, y + TILE_H / 2 - wallH);
  ctx.lineTo(x, y + TILE_H / 2);
  ctx.lineTo(x + TILE_W / 2, y);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Zone Labels
// ---------------------------------------------------------------------------

export function drawZoneLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  emoji: string,
  col: number,
  row: number,
  alpha: number,
): void {
  const { x, y } = gridToScreen({ col, row });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(94, 246, 255, 0.85)';
  ctx.fillText(`${emoji} ${label.toUpperCase()}`, x, y + TILE_H + 4);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Night Overlay
// ---------------------------------------------------------------------------

export function drawNightOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dayNightPhase: number,
): void {
  if (dayNightPhase <= 0.3) return;
  const alpha = Math.min(0.35, (dayNightPhase - 0.3) * 0.5);
  ctx.fillStyle = `rgba(10, 10, 30, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}

// ---------------------------------------------------------------------------
// Neon Room Border — glowing isometric outline around a room zone
// (androoagi "grid of discrete neon rooms" look)
// ---------------------------------------------------------------------------

export function drawRoomBorder(
  ctx: CanvasRenderingContext2D,
  minCol: number,
  maxCol: number,
  minRow: number,
  maxRow: number,
  color: string,
): void {
  const top = gridToScreen({ col: minCol, row: minRow });
  const right = gridToScreen({ col: maxCol, row: minRow });
  const bottom = gridToScreen({ col: maxCol, row: maxRow });
  const left = gridToScreen({ col: minCol, row: maxRow });

  const pts = [
    { x: top.x, y: top.y - TILE_H / 2 },
    { x: right.x + TILE_W / 2, y: right.y },
    { x: bottom.x, y: bottom.y + TILE_H / 2 },
    { x: left.x - TILE_W / 2, y: left.y },
  ];

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();

  // faint inner glow fill
  ctx.fillStyle = `${color}14`;
  ctx.fill();

  // outer neon glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // bright inner core line
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = `${color}E6`;
  ctx.stroke();
  ctx.restore();
}
