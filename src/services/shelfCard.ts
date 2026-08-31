/**
 * Renders a shareable shelf card to a canvas. Drawing it by hand keeps the
 * feature dependency-free and makes the "Save image" / "Story" actions produce
 * a real file instead of a no-op.
 */

import { AppError } from './appError';

export interface ShelfCardOptions {
  title: string;
  subtitle: string;
  colors: string[];
  footnote: string;
  /** 'card' is a landscape share card, 'story' is a 9:16 canvas. */
  format?: 'card' | 'story';
}

const PALETTE = {
  background: '#12100E',
  surface: '#1C1916',
  border: '#3A332A',
  brass: '#C9963F',
  text: '#F4EFE6',
  muted: '#A79C8C',
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderShelfCard(options: ShelfCardOptions): HTMLCanvasElement {
  const isStory = options.format === 'story';
  const width = isStory ? 1080 : 1200;
  const height = isStory ? 1920 : 675;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppError('device.canvasUnavailable', {});

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, width, height);

  // Dotted texture
  ctx.fillStyle = PALETTE.border;
  const step = 32;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.globalAlpha = 1;

  const margin = isStory ? 80 : 90;
  const panelX = margin;
  const panelY = isStory ? height * 0.18 : margin;
  const panelW = width - margin * 2;
  const panelH = isStory ? height * 0.58 : height - margin * 2;

  ctx.fillStyle = PALETTE.surface;
  roundedRect(ctx, panelX, panelY, panelW, panelH, 28);
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const centerX = width / 2;
  let cursorY = panelY + (isStory ? 110 : 90);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.brass;
  ctx.font = `600 ${isStory ? 28 : 24}px "IBM Plex Mono", monospace`;
  ctx.fillText(options.subtitle.toUpperCase(), centerX, cursorY);

  cursorY += isStory ? 90 : 76;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 ${isStory ? 64 : 54}px Literata, Georgia, serif`;
  const maxTitleWidth = panelW - 120;
  let title = options.title;
  while (ctx.measureText(title).width > maxTitleWidth && title.length > 4) {
    title = `${title.slice(0, -2)}…`;
  }
  ctx.fillText(title, centerX, cursorY);

  // Spine strip
  cursorY += isStory ? 90 : 70;
  const stripHeight = isStory ? 260 : 190;
  const stripX = panelX + 60;
  const stripW = panelW - 120;
  const colors = options.colors.length > 0 ? options.colors : [PALETTE.brass];
  const barWidth = stripW / colors.length;

  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    const barHeight = stripHeight * (0.72 + ((index * 37) % 28) / 100);
    ctx.fillRect(stripX + index * barWidth, cursorY + (stripHeight - barHeight), Math.max(barWidth - 2, 1), barHeight);
  });

  cursorY += stripHeight + (isStory ? 110 : 80);

  ctx.strokeStyle = PALETTE.border;
  ctx.beginPath();
  ctx.moveTo(panelX + 60, cursorY - 40);
  ctx.lineTo(panelX + panelW - 60, cursorY - 40);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.brass;
  ctx.font = `700 ${isStory ? 40 : 32}px Literata, Georgia, serif`;
  ctx.fillText('Book Shelf', panelX + 60, cursorY);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `400 ${isStory ? 26 : 22}px "IBM Plex Mono", monospace`;
  ctx.fillText(options.footnote, panelX + panelW - 60, cursorY);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode the shelf card as a PNG.'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on the next tick so the download has started.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
