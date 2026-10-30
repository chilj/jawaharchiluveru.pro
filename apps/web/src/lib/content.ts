import { getCollection } from 'astro:content';

type Status = 'tbd' | 'draft' | 'published';

/** Unpublished entries show up while developing locally, never on the live site. */
export const isVisible = (status: Status) => status === 'published' || import.meta.env.DEV;

/** A field still holding the "TBD" placeholder. */
export const isTbd = (value?: string) => !value || value.trim().toUpperCase() === 'TBD';

export async function getSections() {
  const all = await getCollection('sections');
  const enabled = all.filter((s) => s.data.enabled).sort((a, b) => a.data.order - b.data.order);
  const byId = Object.fromEntries(all.map((s) => [s.id, s.data]));
  return { nav: enabled.map((s) => ({ id: s.id, label: s.data.label })), byId };
}

export const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export function formatMonth(ym?: string) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m || 1) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
