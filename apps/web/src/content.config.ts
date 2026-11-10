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
    site_icon: z.string().optional(),        // detailed square icon, used at 180px and up
    site_icon_small: z.string().optional(),  // simple version for browser tabs and search results (SVG or PNG)
    header_logo: z.enum(['site_icon', 'image', 'initials']).default('site_icon'),
    header_logo_image: z.string().optional(),
    header_initials: z.string().default('JC'),
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

const blog = defineCollection({
  loader: glob({ base: `${CONTENT}/blog`, pattern: entries }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
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

// certifications.yaml holds `items: [...]`, shaped like LinkedIn's "Licenses & certifications" form.
// Older entries used `detail` for the issuer and `year` for the issue year; both still work.
const blank = (v: unknown) => (v === '' || v === null ? undefined : v);
const month = z.preprocess(blank, z.coerce.number().int().min(1).max(12).optional());
const year = z.preprocess(blank, z.coerce.number().int().min(1900).max(2100).optional());
const text = z.preprocess(blank, z.string().optional());
const certifications = defineCollection({
  loader: file(`${CONTENT}/certifications.yaml`, {
    parser: (text) => (parseYaml(text).items ?? []).map((item: Record<string, unknown>, i: number) => ({
      id: `${i}`, order: i, ...item,
      issuer: item.issuer ?? item.detail,
      issue_year: item.issue_year ?? item.year,
    })),
  }),
  schema: z.object({
    name: z.string(),
    issuer: z.string(),
    issue_month: month, issue_year: year,
    expiry_month: month, expiry_year: year,
    credential_id: z.preprocess(blank, z.string().max(80).optional()),
    credential_url: z.preprocess(blank, z.string().url().optional()),
    skills: z.array(z.string()).default([]),
    media: z.array(z.object({ url: text, file: text, title: text, description: text })).default([]),
    badge: text,   // uploaded badge image; otherwise taken from the credential URL
    logo: text,    // Simple Icons slug for the issuer
    mark: text,    // monogram when there's no badge or logo
    order: z.number(),
  }),
});

// Maintenance mode (content/maintenance.yaml).
const maintenance = defineCollection({
  loader: file(`${CONTENT}/maintenance.yaml`, { parser: (text) => [{ id: 'maintenance', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(['banner', 'page']).default('banner'),
    heading: z.string().default('Scheduled maintenance'),
    message: z.string().default('The site is being updated. Please check back shortly.'),
    back_by: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional()),
    show_contact: z.boolean().default(true),
  }),
});

// Extra header menu links (content/navigation.yaml).
const navigation = defineCollection({
  loader: file(`${CONTENT}/navigation.yaml`, { parser: (text) => [{ id: 'navigation', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    links: z.array(z.object({
      label: z.string(),
      url: z.string().regex(/^(https?:\/\/|\/)/, 'A full https:// address or a site path such as /blog/'),
      show: z.boolean().default(true),
      new_tab: z.boolean().default(false),
    })).default([]),
    // Header "Search skills" button (also opens with / or Ctrl/⌘ K).
    skill_search: z.boolean().default(true),
  }),
});

// A/B test for the top of the home page (content/experiment.yaml).
const experiment = defineCollection({
  loader: file(`${CONTENT}/experiment.yaml`, { parser: (text) => [{ id: 'experiment', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    enabled: z.boolean().default(false),
    name: z.string().regex(/^[a-z0-9-]{1,40}$/).default('landing'),
    variants: z.array(z.object({
      id: z.enum(['journey', 'bento', 'classic']),
      label: z.string().optional(),
      weight: z.number().min(0).max(100).default(0),
    })).default([]),
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
    // Real-user monitoring through the observability agent (workers/observability).
    rum_endpoint: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().url().optional()),
    rum_sample: z.number().min(0).max(100).default(100),
    status_page: z.boolean().default(true),
  }),
});

const chat = defineCollection({
  loader: file(`${CONTENT}/chat.yaml`, { parser: (text) => [{ id: 'chat', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    enabled: z.boolean().default(true),
    button_label: z.string().default('Chat'),
    title: z.string().default('Chat'),
    status: z.string().optional(),
    greeting: z.string(),
    channel: z.enum(['web3forms', 'email', 'whatsapp', 'telegram', 'tawk']).default('email'),
    web3forms_key: z.string().optional(),           // empty: reuse the feedback form's Web3Forms key
    captcha: z.boolean().default(true),             // hCaptcha before a Web3Forms message sends
    ask_email: z.enum(['required', 'optional']).default('required'),
    whatsapp_number: z.string().optional(),
    telegram_username: z.string().optional(),
    tawk_property_id: z.string().optional(),
    tawk_widget_id: z.string().optional(),
    input_placeholder: z.string().default('Type a message…'),
    handoff_note: z.string().default('Your message opens in {channel}, ready to send.'),
    faqs: z.array(z.object({
      question: z.string(),
      answer: z.string(),
      link_label: z.string().optional(),   // optional button under the answer
      link: z.string().optional(),         // #section, /path on the site, or https://…
      show: z.boolean().default(true),
    })).default([]),
  }),
});

const askField = z.enum(['hidden', 'optional', 'required']).default('optional');
const feedback = defineCollection({
  loader: file(`${CONTENT}/feedback.yaml`, { parser: (text) => [{ id: 'feedback', ...(parseYaml(text) ?? {}) }] }),
  schema: z.object({
    enabled: z.boolean().default(true),
    delivery: z.enum(['email_app', 'web3forms', 'formspree']).default('email_app'),
    service_key: z.string().optional(),
    captcha: z.boolean().default(false),   // hCaptcha check (Web3Forms only)
    button_label: z.string().default('Feedback'),
    bottom_tab: z.boolean().default(true),
    heading: z.string().default('Share feedback'),
    intro: z.string().optional(),
    rating: z.object({
      show: z.boolean().default(true),
      label: z.string().default('How useful was this site?'),
      low: z.string().default('Not useful'),
      high: z.string().default('Very useful'),
    }).default({}),
    topic_label: z.string().default('Topic'),
    topics: z.array(z.string()).default([]),
    message_label: z.string().default('Your feedback'),
    message_placeholder: z.string().optional(),
    ask_name: askField,
    ask_email: askField,
    submit_label: z.string().default('Send feedback'),
    success_message: z.string().default('Thank you! Your feedback is on its way.'),
    subject: z.string().default('Site feedback'),
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
  sections, about, career, 'case-studies': caseStudies, playbook, blog, toolkit, connect,
  resume, analytics, privacy, feedback, chat, experiment, maintenance, navigation,
  education: credentialList('education'), certifications,
  'skill-profile': skillProfile, 'toolkit-meta': toolkitMeta, theme,
};
