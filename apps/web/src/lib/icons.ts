import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Icons are read at build time and inlined, so the site loads nothing external.
const require = createRequire(import.meta.url);
const BRANDS = dirname(require.resolve('simple-icons/icons/paypal.svg'));
const UI = join(dirname(require.resolve('lucide-static/package.json')), 'icons');

const cache = new Map<string, string | undefined>();

function load(file: string, kind: 'brand' | 'ui') {
  if (!cache.has(file)) {
    let svg = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    if (svg) {
      svg = svg
        .replace(/<!--[\s\S]*?-->/, '')
        .replace(/<title>.*?<\/title>/, '')
        .replace(/\s(class|role|width|height)="[^"]*"/g, '')
        .replace('<svg', `<svg class="icon icon-${kind}" aria-hidden="true" focusable="false"${kind === 'brand' ? ' fill="currentColor"' : ''}`)
        .trim();
    }
    cache.set(file, svg);
  }
  return cache.get(file);
}

/** A Simple Icons brand mark by slug, e.g. "paypal". */
export const brandIcon = (slug?: string) => (slug ? load(join(BRANDS, `${slug}.svg`), 'brand') : undefined);

/** A Lucide UI icon by name, e.g. "briefcase". */
export const uiIcon = (name?: string) => (name ? load(join(UI, `${name}.svg`), 'ui') : undefined);

const normalize = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');

// Names as they appear in content → Simple Icons slugs, where the plain name doesn't match.
const ALIASES: Record<string, string> = {
  gitlabcicd: 'gitlab',
  gcppubsub: 'googlepubsub',
  wellsfargoadvisors: 'wellsfargo',
  certifiedscrummaster: 'scrumalliance',
  certifiedscrumproductowner: 'scrumalliance',
  java21lts: 'openjdk',
};

/** Best-effort brand icon for a tool or company name; undefined when there's no match. */
export function brandFor(name: string, explicit?: string) {
  if (explicit) return brandIcon(explicit);
  const key = normalize(name);
  return brandIcon(ALIASES[key] ?? key);
}

/** Initials for a monogram tile: "Levi Strauss & Co." → "LS". */
export function monogram(name: string) {
  const words = name.replace(/&|\b(co|inc|llc|the|of|and)\b\.?/gi, '').split(/[\s-]+/).filter(Boolean);
  if (/^\d/.test(name)) return name.replace(/[^0-9A-Za-z]/g, '').slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
