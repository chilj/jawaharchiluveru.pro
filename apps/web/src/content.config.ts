import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';

// All editable content lives in /content at the repo root.
const CONTENT = '../../content';
const entries = ['**/*.md', '!**/_*.md'];

// planned: placeholder, draft: in progress. Both are visible in `npm run dev` only.
const status = z.enum(['planned', 'draft', 'published']).default('planned');

const sections = defineCollection({
  loader: file(`${CONTENT}/sections.yaml`),
  schema: z.object({
    label: z.string(),
    icon: z.string().default('circle'),
    order: z.number(),
    enabled: z.boolean().default(true),
    collapsed: z.boolean().default(false),
  }),
});

const about = defineCollection({
  loader: glob({ base: CONTENT, pattern: 'about.md' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    location: z.string().optional(),
    tagline: z.string(),
    seo_title: z.string().optional(),     // home page <title>; default "name | role"
    description: z.string(),
    social_image: z.string().optional(),  // 1200×630 preview for LinkedIn, Slack, X
    social_image_alt: z.string().optional(),
    stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  }),
});

const career = defineCollection({
  loader: glob({ base: `${CONTENT}/career`, pattern: entries }),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    via: z.string().optional(),
    logo: z.string().optional(),   // Simple Icons slug
    mark: z.string().optional(),   // monogram when there's no logo
    product: z.string().optional(),
    start: z.string(),
    end: z.string().optional(),
    location: z.string().optional(),
    clients: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
    to_verify: z.array(z.string()).default([]),   // notes for you; never shown on the site
    short: z.string().optional(),                 // column label in the evidence map; default: org
    skills: z.array(z.object({ name: z.string(), evidence: z.string().optional() })).default([]),  // evidence map
    earlier: z.boolean().default(false),
    status,
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: `${CONTENT}/case-studies`, pattern: entries }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    domain: z.string().optional(),
    client: z.string().optional(),
    year: z.number().optional(),
    outcome: z.string().optional(),
    order: z.number().default(99),
    status,
  }),
});

const playbook = defineCollection({
  loader: glob({ base: `${CONTENT}/playbook`, pattern: entries }),
  schema: z.object({
    title: z.string(),
    kind: z.string(),
    summary: z.string(),
    file: z.string().optional(),
    order: z.number().default(99),
    status,
  }),
});

const level = z.enum(['expert', 'advanced-expert', 'advanced', 'working-advanced', 'working', 'exposure']);

// toolkit.yaml holds `overall: [...]` (domain summary) and `groups: [...]`; list position sets order.
const toolkit = defineCollection({
  loader: file(`${CONTENT}/toolkit.yaml`, {
    parser: (text) => parseYaml(text).groups.map((g: Record<string, unknown>, i: number) => ({ order: i, ...g })),
  }),
  schema: z.object({
    label: z.string(),
    icon: z.string().default('wrench'),
    order: z.number().default(99),
    items: z.array(z.union([
      z.string().transform((name) => ({ name })),
      z.object({
        name: z.string(),
        level: level.optional(),
        evidence: z.string().optional(),
        logo: z.string().optional(),
        mark: z.string().optional(),
      }),
    ])),
  }),
});

const toolkitMeta = defineCollection({
  loader: file(`${CONTENT}/toolkit.yaml`, {
    parser: (text) => [{ id: 't-shape', ...(parseYaml(text).t_shape ?? {}) }],
  }),
  schema: z.object({ title: z.string().default('Depth'), summary: z.string().optional() }),
});

const skillProfile = defineCollection({
  loader: file(`${CONTENT}/toolkit.yaml`, {
    parser: (text) => (parseYaml(text).overall ?? []).map((d: Record<string, unknown>, i: number) => ({ id: `${i}`, order: i, ...d })),
  }),
  schema: z.object({ name: z.string(), level, order: z.number() }),
});

// education.yaml and certifications.yaml hold `items: [...]`; list position sets display order.
const credentialList = (name: string) => defineCollection({
  loader: file(`${CONTENT}/${name}.yaml`, {
    parser: (text) => (parseYaml(text).items ?? []).map((item: Record<string, unknown>, i: number) => ({ id: `${i}`, order: i, ...item })),
  }),
  schema: z.object({
    name: z.string(),
    detail: z.string().optional(),
    year: z.union([z.string(), z.number()]).transform(String).optional(),
    logo: z.string().optional(),
    mark: z.string().optional(),
    order: z.number(),
  }),
});

const theme = defineCollection({
  loader: file(`${CONTENT}/theme.yaml`, { parser: (text) => [{ id: 'theme', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    preset: z.string().default('ocean'),
    custom: z.object({
      light: z.object({ accent: z.string().optional(), secondary: z.string().optional() }).partial().optional(),
      dark: z.object({ accent: z.string().optional(), secondary: z.string().optional() }).partial().optional(),
    }).partial().optional(),
  }),
});

const resume = defineCollection({
  loader: file(`${CONTENT}/resume.yaml`, { parser: (text) => [{ id: 'resume', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    file: z.string().optional(),
    show: z.boolean().default(true),
    label: z.string().default('Résumé'),
    download_name: z.string().optional(),
    updated: z.coerce.date().optional(),
  }),
});

const analytics = defineCollection({
  loader: file(`${CONTENT}/analytics.yaml`, { parser: (text) => [{ id: 'analytics', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    clarity_id: z.string().optional(),
    ga4_id: z.string().optional(),
    cloudflare_token: z.string().optional(),
    respect_privacy_signals: z.boolean().default(true),
    consent: z.enum(['europe', 'everyone', 'off']).default('europe'),
    consent_text: z.string().default('This site uses analytics cookies to see which content is useful.'),
    consent_accept: z.string().default('Accept'),
    consent_decline: z.string().default('Decline'),
  }),
});

const privacy = defineCollection({
  loader: glob({ base: CONTENT, pattern: 'privacy.md' }),
  schema: z.object({ title: z.string().default('Privacy') }),
});

const connect = defineCollection({
  loader: glob({ base: CONTENT, pattern: 'connect.md' }),
  schema: z.object({
    heading: z.string(),
    intro: z.string().optional(),
    booking: z.object({
      label: z.string().default('Book time'),
      url: z.string().optional(),
      embed: z.boolean().default(false),
    }),
    email: z.string().optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
    meeting: z.object({
      enabled: z.boolean().default(false),
      heading: z.string().default('Request a meeting'),
      intro: z.string().optional(),
      timezone: z.string().default('America/Chicago'),
      days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).default(['mon', 'tue', 'wed', 'thu', 'fri']),
      start: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
      end: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
      length: z.number().int().min(15).max(120).default(30),
      min_notice_hours: z.number().int().min(0).default(24),
      weeks_ahead: z.number().int().min(1).max(12).default(3),
      blocked_dates: z.array(z.coerce.date()).default([]),
    }).optional(),
  }),
});

export const collections = {
  sections, about, career, 'case-studies': caseStudies, playbook, toolkit, connect,
  resume, analytics, privacy,
  education: credentialList('education'), certifications: credentialList('certifications'),
  'skill-profile': skillProfile, 'toolkit-meta': toolkitMeta, theme,
};
