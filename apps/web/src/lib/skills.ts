import { getCollection } from 'astro:content';
import { isPlaceholder, isVisible, LEVELS } from './content';

/** Anchor id for a skill row in the Toolkit (also used by the site-wide skill search). */
export const skillId = (name: string) => `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** Every skill with its group, level, evidence and the roles it was used in (for /skills.json). */
export async function skillIndex() {
  const toolkit = (await getCollection('toolkit')).sort((a, b) => a.data.order - b.data.order);
  const career = (await getCollection('career', (e) => isVisible(e.data.status) && e.data.status === 'published'))
    .sort((a, b) => b.data.start.localeCompare(a.data.start));
  const roles = new Map<string, { role: string; evidence?: string }[]>();
  for (const { data: r } of career) {
    const label = `${r.short?.trim() || r.org} (${r.start.slice(0, 4)}${r.end ? (r.end.slice(0, 4) === r.start.slice(0, 4) ? '' : `–${r.end.slice(2, 4)}`) : '–'})`;
    for (const s of r.skills) {
      const k = s.name.toLowerCase();
      if (!roles.has(k)) roles.set(k, []);
      roles.get(k)!.push({ role: label, ...(s.evidence ? { evidence: s.evidence } : {}) });
    }
  }
  const seen = new Set<string>();
  return toolkit.flatMap((g) => g.data.items.filter((i) => !isPlaceholder(i.name)).map((i) => {
    let id = skillId(i.name);
    while (seen.has(id)) id += '-2';
    seen.add(id);
    return {
      id,
      name: i.name,
      group: g.data.label,
      level: i.level ? LEVELS[i.level].label : undefined,
      score: i.level ? LEVELS[i.level].score : 0,
      evidence: i.evidence,
      roles: roles.get(i.name.toLowerCase()) ?? [],
    };
  }));
}
