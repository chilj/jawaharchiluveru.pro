import { getCollection } from 'astro:content';

type Status = 'planned' | 'draft' | 'published';

/** Unpublished entries show up in `npm run dev` and review builds, never on the live site. */
export const showUnpublished = import.meta.env.DEV || process.env.SHOW_DRAFTS === 'true';

export const isVisible = (status: Status) => status === 'published' || showUnpublished;

/** A field still holding a "TODO" placeholder. */
export const isPlaceholder = (value?: string) => !value || ['TODO', 'TBD'].includes(value.trim().toUpperCase());

/** Sections that list entries; each stays hidden (with its nav link) until an entry is visible. */
const LISTING_SECTIONS = ['case-studies', 'playbook'] as const;

export async function getSections() {
  const all = await getCollection('sections');
  const empty = new Set<string>();
  for (const id of LISTING_SECTIONS) {
    const entries = await getCollection(id, (e) => isVisible(e.data.status));
    if (entries.length === 0) empty.add(id);
  }
  const enabled = all
    .filter((s) => s.data.enabled && !empty.has(s.id))
    .sort((a, b) => a.data.order - b.data.order);
  const byId = Object.fromEntries(all.map((s) => [s.id, s.data]));
  return { nav: enabled.map((s) => ({ id: s.id, label: s.data.label })), byId };
}

export const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export function formatMonth(ym?: string) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m || 1) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function yearRange(start: string, end?: string) {
  const [a, b] = [start.slice(0, 4), end ? end.slice(0, 4) : 'Present'];
  return a === b ? a : `${a}–${b}`;
}

/** Whole months between two YYYY-MM strings (end defaults to now). */
export function months(start: string, end?: string) {
  const [y1, m1] = start.split('-').map(Number);
  const now = new Date();
  const [y2, m2] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1));
}

/** "5 yrs", "1 yr 6 mos", "7 mos". */
export function tenure(start: string, end?: string) {
  const total = months(start, end);
  const y = Math.floor(total / 12), m = total % 12;
  const part = (n: number, unit: string) => (n ? `${n} ${unit}${n > 1 ? 's' : ''}` : '');
  return [part(y, 'yr'), part(m, 'mo')].filter(Boolean).join(' ');
}

/** Prefix a site-relative path from content (e.g. "/files/resume.pdf") with the deploy base. */
export const withBase = (path: string) =>
  path.startsWith('/') ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}` : path;

/** Skill levels from the skill matrix, with a score out of 4 for the meter. */
export const LEVELS = {
  expert: { label: 'Expert', score: 4 },
  'advanced-expert': { label: 'Advanced–Expert', score: 3.5 },
  advanced: { label: 'Advanced', score: 3 },
  'working-advanced': { label: 'Working–Advanced', score: 2.5 },
  working: { label: 'Working', score: 2 },
  exposure: { label: 'Exposure', score: 1 },
} as const;
export type Level = keyof typeof LEVELS;
