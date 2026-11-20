import { getEntry } from 'astro:content';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Profile photo (About → Photo, or /admin/photo/). The original is kept as uploaded; every size the
// site shows is cropped here around the photo's focus point, resized and compressed, with metadata
// (camera details, location) dropped.
const PUBLIC = resolve(process.cwd(), '../../content/public') + '/';

export const PHOTO_VARIANTS = {
  'portrait-480.webp': { w: 480, h: 600, format: 'webp' },
  'portrait-960.webp': { w: 960, h: 1200, format: 'webp' },
  'portrait-960.jpg': { w: 960, h: 1200, format: 'jpeg' },
  'square-256.webp': { w: 256, h: 256, format: 'webp' },
  'square-512.webp': { w: 512, h: 512, format: 'webp' },
} as const;
export type PhotoVariant = keyof typeof PHOTO_VARIANTS;

export async function photoSettings() {
  const a = (await getEntry('about', 'about'))!.data;
  const path = a.photo?.trim();
  if (!path) return undefined;
  const [fx, fy] = a.photo_focus.split(' ').map((v) => Math.min(100, Math.max(0, parseInt(v))) / 100);
  return { path, alt: a.photo_alt?.trim() || a.name, fx, fy, inAbout: a.photo_in_about, onCard: a.photo_on_card };
}

/** A crop of the photo at w×h, keeping the focus point as central as the image allows. */
export async function photoCrop(w: number, h: number, format: 'webp' | 'jpeg' | 'png' = 'webp') {
  const s = await photoSettings();
  if (!s) throw new Error('No profile photo set');
  const img = sharp(await readFile(PUBLIC + s.path.replace(/^\//, ''))).rotate(); // apply camera orientation
  const { width: iw = 0, height: ih = 0 } = await img.clone().metadata().then((m) =>
    (m.orientation ?? 1) >= 5 ? { width: m.height, height: m.width } : m);
  const scale = Math.max(w / iw, h / ih);
  const cw = Math.round(w / scale), ch = Math.round(h / scale);
  const left = Math.round(Math.min(Math.max(s.fx * iw - cw / 2, 0), iw - cw));
  const top = Math.round(Math.min(Math.max(s.fy * ih - ch / 2, 0), ih - ch));
  const out = img.extract({ left, top, width: Math.min(cw, iw), height: Math.min(ch, ih) }).resize(w, h, { fit: 'cover' });
  return (format === 'jpeg' ? out.jpeg({ quality: 82, mozjpeg: true }) : format === 'png' ? out.png() : out.webp({ quality: 80 })).toBuffer();
}
