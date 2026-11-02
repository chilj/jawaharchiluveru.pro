import { getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { buildTheme } from './theme';

// Site icons. If the editor has a site icon, large sizes (180px and up) come from it and small
// sizes (tabs, Google results) from the small version. Otherwise: the JC monogram with roadmap
// milestones, in the current theme's colors.
// Builds run from apps/web, like the content loaders in content.config.ts.
const PUBLIC = resolve(process.cwd(), '../../content/public') + '/';
const read = (path: string) => readFile(PUBLIC + path.replace(/^\//, ''));

async function settings() {
  const about = (await getEntry('about', 'about'))!.data;
  return { large: about.site_icon?.trim() || undefined, small: about.site_icon_small?.trim() || about.site_icon?.trim() || undefined };
}

async function monogram({ rounded = true } = {}) {
  const t = buildTheme((await getEntry('theme', 'theme'))?.data).light;
  const [a, b, fg] = [t['--accent'], t['--teal'], t['--on-accent']];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="64" height="64" rx="${rounded ? 14 : 0}" fill="url(#g)"/>
  <g fill="none" stroke="${fg}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M25 20v16a7 7 0 0 1-14 0"/>
    <path d="M50 23.5a11 11 0 1 0 0 17"/>
  </g>
  <g fill="${fg}"><circle cx="25" cy="17" r="5"/><circle cx="50" cy="40.5" r="5"/></g>
</svg>`;
}

/** favicon.svg: the small icon if it's an SVG, else the generated monogram (or a wrapper around the PNG). */
export async function iconSvg() {
  const { small } = await settings();
  if (!small) return monogram();
  if (small.endsWith('.svg')) return (await read(small)).toString();
  const png = await sharp(await read(small)).resize(64, 64).png().toBuffer();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
}

export async function iconPng(size: number, opts: { rounded?: boolean } = {}) {
  const { large, small } = await settings();
  const file = size >= 120 ? large ?? small : small;
  const src = file ? await read(file) : Buffer.from(await monogram(opts));
  const density = file && !file.endsWith('.svg') ? undefined : Math.max(72, (size / 64) * 72);
  return sharp(src, density ? { density } : {}).resize(size, size, { fit: 'cover' }).png().toBuffer();
}

/** A .ico file holding PNG images (supported by every current browser and by Google). */
export async function iconIco(sizes = [16, 32, 48]) {
  const pngs = await Promise.all(sizes.map((s) => iconPng(s)));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s >= 256 ? 0 : s, e); header.writeUInt8(s >= 256 ? 0 : s, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  return Buffer.concat([header, ...pngs]);
}
