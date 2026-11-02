import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Reads a web page at build time and pulls out what a link preview needs: title, description,
// preview image (og:image / twitter:image) and site icon. Used for certification credential URLs
// (e.g. a Credly badge page gives the badge image) and media links. Every failure is soft: the
// site falls back to logos and plain links, and the build never stops because a page is down.

export type LinkMeta = { url: string; title?: string; description?: string; image?: string; icon?: string; site?: string };

const TIMEOUT = 8000, MAX_HTML = 1_500_000, MAX_IMAGE = 5_000_000;
const pages = new Map<string, Promise<LinkMeta | undefined>>();
const images = new Map<string, Promise<Buffer | undefined>>();

const okUrl = (u?: string) => { try { return !!u && /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

async function get(url: string, max: number, accept: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; jawaharchiluveru.pro site build; +https://www.jawaharchiluveru.pro)', Accept: accept,
    } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const len = Number(res.headers.get('content-length') || 0);
    if (len > max) throw new Error('too large');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > max) throw new Error('too large');
    return { buf, finalUrl: res.url || url };
  } finally { clearTimeout(timer); }
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function parse(html: string, base: string): LinkMeta {
  const head = html.slice(0, 300_000);
  const meta = (key: string) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      const k = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
      const v = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
      if (k === key && v) return decode(v);
    }
  };
  const abs = (u?: string) => { try { return u ? new URL(u, base).href : undefined; } catch { return undefined; } };
  let icon: string | undefined;
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (href && /apple-touch-icon/.test(rel)) { icon = abs(href); break; }
    if (href && /\bicon\b/.test(rel) && !icon) icon = abs(href);
  }
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];
  return {
    url: base,
    title: meta('og:title') ?? meta('twitter:title') ?? (title ? decode(title) : undefined),
    description: meta('og:description') ?? meta('twitter:description') ?? meta('description'),
    image: abs(meta('og:image:secure_url') ?? meta('og:image') ?? meta('twitter:image') ?? meta('twitter:image:src')),
    icon: icon ?? abs('/favicon.ico'),
    site: meta('og:site_name'),
  };
}

/** Title, description, preview image and icon for a page (cached per build). */
export function linkMeta(url?: string): Promise<LinkMeta | undefined> {
  if (!okUrl(url)) return Promise.resolve(undefined);
  if (!pages.has(url!)) {
    pages.set(url!, get(url!, MAX_HTML, 'text/html,application/xhtml+xml')
      .then(({ buf, finalUrl }) => parse(buf.toString('utf8'), finalUrl))
      .catch((e) => { console.warn(`[linkmeta] couldn't read ${url}: ${e.message ?? e}`); return undefined; }));
  }
  return pages.get(url!)!;
}

/** Downloads an image and converts it to WebP in the given box (cached per build). */
export function remoteImage(url: string | undefined, width: number, height = width, fit: 'contain' | 'cover' = 'contain') {
  if (!okUrl(url)) return Promise.resolve(undefined);
  const key = `${url}|${width}x${height}|${fit}`;
  if (!images.has(key)) {
    images.set(key, get(url!, MAX_IMAGE, 'image/*')
      .then(({ buf }) => sharp(buf).resize(width, height, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer())
      .catch((e) => { console.warn(`[linkmeta] couldn't use image ${url}: ${e.message ?? e}`); return undefined; }));
  }
  return images.get(key)!;
}

/** Stable short file name for an asset built from a URL. */
export const assetName = (url: string, suffix: string) => `${createHash('sha1').update(url).digest('hex').slice(0, 12)}-${suffix}.webp`;
