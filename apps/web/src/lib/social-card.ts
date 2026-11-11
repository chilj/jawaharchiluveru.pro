import { getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import * as fontkit from 'fontkit';
import wawoff from 'wawoff2';
import sharp from 'sharp';
import { buildTheme } from './theme';

// The 1200×630 preview image LinkedIn, Slack, X and messaging apps show when the site is shared
// (/social-card.png). Built from the editor's content (name, role, location, stats, site icon) in
// the current theme, so it stays up to date. Text is drawn as shapes from the site's own fonts,
// so the image looks the same on any build machine. A Social image set in the editor replaces it.

// PAD keeps everything inside the ~1.5:1 centre crop some apps (LinkedIn's small card) show.
const W = 1200, H = 630, PAD = 136;
const PUBLIC = resolve(process.cwd(), '../../content/public') + '/';
const req = createRequire(import.meta.url);

type Font = { layout: (s: string) => any; unitsPerEm: number };
async function font(pkg: string, file: string, wght: number): Promise<Font> {
  const woff2 = await readFile(join(dirname(req.resolve(`${pkg}/package.json`)), 'files', file));
  return (fontkit.create(Buffer.from(await wawoff.decompress(woff2))) as any).getVariation({ wght });
}

function measure(f: Font, str: string, size: number) {
  const run = f.layout(str);
  return (run.positions as any[]).reduce((w, p) => w + p.xAdvance, 0) * (size / f.unitsPerEm);
}
function text(f: Font, str: string, size: number, x: number, y: number, fill: string) {
  const run = f.layout(str);
  let pen = 0, d = '';
  run.glyphs.forEach((g: any, i: number) => { d += g.path.translate(pen + (run.positions[i].xOffset || 0), run.positions[i].yOffset || 0).toSVG(); pen += run.positions[i].xAdvance; });
  const s = size / f.unitsPerEm;
  return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})" d="${d}" fill="${fill}"/>`;
}
/** Greedy word wrap to a width; the last allowed line ends with "…" if text is left over. */
function wrap(f: Font, str: string, size: number, width: number, maxLines: number) {
  const words = str.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (measure(f, next, size) <= width || !line) { line = next; continue; }
    lines.push(line); line = w;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length) {
    let last = lines[maxLines - 1];
    while (last && measure(f, `${last}…`, size) > width) last = last.replace(/\s*\S+$/, '');
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}
/** Largest size (down to min) at which the text fits on one line. */
function fit(f: Font, str: string, size: number, min: number, width: number) {
  while (size > min && measure(f, str, size) > width) size -= 2;
  return size;
}

export async function socialCardPng() {
  const about = (await getEntry('about', 'about'))!.data as any;
  const t = buildTheme((await getEntry('theme', 'theme'))?.data).light;
  // Neutrals as in global.css (light mode); accent colors from the theme.
  const c = { bg: '#f7f8fb', surface: '#ffffff', text: '#141821', muted: '#495063', line: '#e3e6ee', accent: t['--accent'], teal: t['--teal'] };
  const [display, displayBold, body, bodyMedium] = await Promise.all([
    font('@fontsource-variable/sora', 'sora-latin-wght-normal.woff2', 600),
    font('@fontsource-variable/sora', 'sora-latin-wght-normal.woff2', 700),
    font('@fontsource-variable/ibm-plex-sans', 'ibm-plex-sans-latin-wght-normal.woff2', 400),
    font('@fontsource-variable/ibm-plex-sans', 'ibm-plex-sans-latin-wght-normal.woff2', 500),
  ]);

  const parts: string[] = [];
  const inner = W - PAD * 2;
  // Site icon, top left (the editor's site icon, or none).
  let iconSvg = '';
  const iconPath = about.site_icon?.trim();
  if (iconPath) {
    const src = await readFile(PUBLIC + iconPath.replace(/^\//, ''));
    const png = await sharp(src, iconPath.endsWith('.svg') ? { density: 300 } : {}).resize(88, 88, { fit: 'cover' }).png().toBuffer();
    iconSvg = `<image x="${PAD}" y="72" width="88" height="88" href="data:image/png;base64,${png.toString('base64')}"/>`;
  }
  const domain = 'jawaharchiluveru.pro';
  parts.push(text(bodyMedium, domain, 26, W - PAD - measure(bodyMedium, domain, 26), 126, c.muted));

  // Name, then role · location.
  const nameSize = fit(displayBold, about.name, 84, 56, inner);
  parts.push(text(displayBold, about.name, nameSize, PAD, 268, c.text));
  const role = [about.role, about.location].filter(Boolean).join('  ·  ');
  const roleSize = fit(body, role, 36, 26, inner);
  parts.push(text(body, role, roleSize, PAD, 326, c.muted));

  // Up to three stats as tiles along the bottom.
  const stats = ((about.stats ?? []) as { value: string; label: string }[]).slice(0, 3);
  if (stats.length) {
    const gap = 20, tileW = (inner - gap * (stats.length - 1)) / stats.length, top = 376, tileH = 196;
    stats.forEach((s, i) => {
      const x = PAD + i * (tileW + gap);
      parts.push(`<rect x="${x}" y="${top}" width="${tileW}" height="${tileH}" rx="18" fill="${c.surface}" stroke="${c.line}" stroke-width="2"/>`);
      parts.push(`<rect x="${x + 20}" y="${top + 26}" width="5" height="${tileH - 52}" rx="2.5" fill="url(#accent)"/>`);
      parts.push(text(display, s.value, 50, x + 42, top + 74, c.accent));
      wrap(body, s.label, 21, tileW - 62, 3).forEach((l, k) => parts.push(text(body, l, 21, x + 42, top + 112 + k * 27, c.muted)));
    });
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.teal}"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.accent}"/><stop offset="1" stop-color="${c.teal}"/></linearGradient>
    <radialGradient id="glowA" cx="0.92" cy="0.05" r="0.6"><stop offset="0" stop-color="${c.teal}" stop-opacity="0.22"/><stop offset="1" stop-color="${c.teal}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowB" cx="0.05" cy="1" r="0.55"><stop offset="0" stop-color="${c.accent}" stop-opacity="0.12"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="${c.line}"/></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)" opacity="0.55"/>
  <rect width="${W}" height="${H}" fill="url(#glowA)"/>
  <rect width="${W}" height="${H}" fill="url(#glowB)"/>
  <rect y="${H - 12}" width="${W}" height="12" fill="url(#bar)"/>
  ${iconSvg}
  ${parts.join('\n  ')}
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
