import { getEntry } from 'astro:content';
import sharp from 'sharp';
import { buildTheme } from './theme';

// Site icon: the JC monogram as a roadmap (a start milestone on the J, a delivered milestone where
// the C ends), in the current theme's colors (light mode).
// Letters are drawn as strokes, not text, so every renderer draws them the same way.
export async function iconSvg({ rounded = true } = {}) {
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

export async function iconPng(size: number, opts?: { rounded?: boolean }) {
  return sharp(Buffer.from(await iconSvg(opts)), { density: Math.max(72, (size / 64) * 72) })
    .resize(size, size).png().toBuffer();
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
