import { getCollection } from 'astro:content';
import { assetName, linkMeta, remoteImage } from './linkmeta';

// Certifications with everything the page needs, including assets read from credential and media
// URLs at build time. Assets are served from /cert-assets/ (see pages/cert-assets/[file].ts).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (m?: number, y?: number) => (y ? `${m ? `${MONTHS[m - 1]} ` : ''}${y}` : undefined);
const IMAGE = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

type Asset = { file: string; data: () => Promise<Buffer | undefined> };
const assets = new Map<string, Asset>();
function remote(url: string, suffix: string, w: number, h: number, fit: 'contain' | 'cover') {
  const file = assetName(url, suffix);
  assets.set(file, { file, data: () => remoteImage(url, w, h, fit) });
  return file;
}

export async function getCertifications() {
  const base = import.meta.env.BASE_URL;
  const local = (p: string) => (/^https?:/.test(p) ? p : `${base}${p.replace(/^\//, '')}`);
  const now = new Date();
  const items = (await getCollection('certifications')).sort((a, b) => a.data.order - b.data.order);
  return Promise.all(items.map(async ({ data: c }) => {
    const meta = await linkMeta(c.credential_url);
    // Badge: uploaded image, else the credential page's preview image (works for Credly, Accredible...).
    let badge: string | undefined = c.badge ? local(c.badge) : undefined;
    if (!badge && meta?.image && (await remoteImage(meta.image, 96, 96, 'contain'))) badge = `${base}cert-assets/${remote(meta.image, 'badge', 96, 96, 'contain')}`;
    const expires = c.expiry_year ? new Date(Date.UTC(c.expiry_year, (c.expiry_month ?? 12) - 1 + 1, 0)) : undefined;
    const media = await Promise.all(c.media.filter((m) => m.url || m.file).map(async (m) => {
      if (m.file) {
        return { href: local(m.file), title: m.title ?? m.file.split('/').pop()!, description: m.description,
          thumb: IMAGE.test(m.file) ? local(m.file) : undefined, kind: IMAGE.test(m.file) ? 'image' : 'file' };
      }
      const mm = await linkMeta(m.url);
      const img = mm?.image && (await remoteImage(mm.image, 320, 180, 'cover')) ? `${base}cert-assets/${remote(mm.image, 'media', 320, 180, 'cover')}` : undefined;
      let host = ''; try { host = new URL(m.url!).hostname.replace(/^www\./, ''); } catch {}
      return { href: m.url!, title: m.title ?? mm?.title ?? host, description: m.description ?? mm?.description, thumb: img, kind: 'link', host };
    }));
    return {
      ...c,
      issued: label(c.issue_month, c.issue_year),
      expiresLabel: label(c.expiry_month, c.expiry_year),
      expired: !!expires && expires < now,
      issuedIso: c.issue_year ? `${c.issue_year}-${String(c.issue_month ?? 1).padStart(2, '0')}` : undefined,
      expiresIso: c.expiry_year ? `${c.expiry_year}-${String(c.expiry_month ?? 12).padStart(2, '0')}` : undefined,
      badge,
      verifiedTitle: meta?.title,
      media,
    };
  }));
}

/** Every asset the certifications use, for the static route that writes them out. */
export async function certificationAssets() {
  await getCertifications();
  return [...assets.values()];
}
