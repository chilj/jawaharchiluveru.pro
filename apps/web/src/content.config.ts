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
    resume: z.string().optional(),
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

const toolkit = defineCollection({
  // toolkit.yaml holds `groups: [...]`; list position sets display order.
  loader: file(`${CONTENT}/toolkit.yaml`, {
    parser: (text) => parseYaml(text).groups.map((g: Record<string, unknown>, i: number) => ({ order: i, ...g })),
  }),
  schema: z.object({
    label: z.string(),
    icon: z.string().default('wrench'),
    order: z.number().default(99),
    layout: z.enum(['chips', 'list']).default('chips'),
    items: z.array(z.union([
      z.string().transform((name) => ({ name })),
      z.object({ name: z.string(), detail: z.string().optional(), logo: z.string().optional(), mark: z.string().optional() }),
    ])),
  }),
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
  }),
});

export const collections = {
  sections, about, career, 'case-studies': caseStudies, playbook, toolkit, connect,
  education: credentialList('education'), certifications: credentialList('certifications'),
};
