import { getEntry } from 'astro:content';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// content/public is served at the site root (see astro.config.mjs).
const PUBLIC_DIR = resolve(process.cwd(), '../../content/public');

/** The published résumé, or null when it's switched off or its file is missing. */
export async function getResume() {
  const r = (await getEntry('resume', 'resume'))?.data;
  if (!r?.show || !r.file) return null;
  const path = resolve(PUBLIC_DIR, r.file.replace(/^\/+/, ''));
  if (!existsSync(path)) {
    console.warn(`[resume] ${r.file} not found in content/public; hiding the Résumé button.`);
    return null;
  }
  const name = (r.download_name || 'resume.pdf').replace(/[^A-Za-z0-9._-]/g, '-').replace(/\.pdf$/i, '');
  return {
    label: r.label || 'Résumé',
    path,
    names: [...new Set(['resume', name])],
    href: `/${name}.pdf`,
    updated: r.updated,
    sizeKb: Math.round(statSync(path).size / 1024),
  };
}
