# Architecture

How jawaharchiluveru.pro is built, styled and deployed. For day-to-day editing, see the
[README](../README.md).

## Tech stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Site framework | Astro | 7.4.1 | Builds the whole site as static HTML; no server |
| Language | TypeScript (strict) and Astro components | — | Pages, components, build logic |
| Runtime | Node.js | 22 (`.nvmrc`) | Build and local development |
| Monorepo | npm workspaces | — | `apps/web` plus a top-level `content/` folder |
| Content | Markdown and YAML via Astro content collections with Zod schemas | `yaml` 2.9.1 | Every section is a file |
| Content editor | Sveltia CMS, self-hosted at `/admin` | 0.248.0 | Forms for all content; saves are Git commits |
| Custom editor | Skills by role grid at `/admin/skills-by-role/` | — | Edits role skills through the GitHub API |
| Fonts | Sora and IBM Plex Sans (variable, self-hosted) | Fontsource 5.3.0 | Two preloaded files |
| Icons | Lucide (UI) and Simple Icons (brands) | 1.57.0 / 16.35.0 | Inlined as SVG at build time |
| Hosting | GitHub Pages | — | Static hosting with HTTPS |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) | v4–v5 actions | Push to `main` builds and deploys; pull requests get a build check |
| DNS | Cloudflare | — | Domain records |
| Analytics | Microsoft Clarity, Google Analytics 4 (Cloudflare Web Analytics supported) | — | Heatmaps, recordings, events |
| Quality tooling (development) | Playwright, Lighthouse, axe-core | — | Browser tests, performance and accessibility audits |

## System overview

```
            ┌────────────── content/ (Markdown + YAML) ──────────────┐
 Owner ─▶ /admin (Sveltia CMS) ──┐                                     │
 Owner ─▶ /admin/skills-by-role ─┼─▶ commit to main ──▶ GitHub Actions
 Code  ─▶ branch ─▶ preview ─▶ merge ┘                       │  npm ci → astro build
                                                              │  (schemas, theme guardrail,
                                                              │   résumé check, sitemap)
                                                              ▼
                                     GitHub Pages ◀── static site (HTML, fonts, PDFs)
                                          ▲
                   Cloudflare DNS ── www.jawaharchiluveru.pro ── visitors
                                                              │ after page load and consent
                                                              ▼
                                               Microsoft Clarity · Google Analytics 4
```

## Repository layout

```
content/                    everything editable (see README for each file)
  _templates/               starting points for hand-written entries
  public/files/             uploads (résumé PDFs, images), served at /files/…
apps/web/
  astro.config.mjs          site URL and base path from GitHub Pages; inline CSS; CMS integration
  cms/config.yml            editor forms (validated against Sveltia's JSON schema)
  integrations/cms.mjs      copies the Sveltia build and config into /admin
  src/content.config.ts     content collections and schemas
  src/pages/                index, case-studies/[id], playbook/[id], privacy, 404,
                            [file].pdf (résumé), sitemap.xml, robots.txt, admin/
  src/components/           Section, LogoTile, LevelMeter, Icon, Status, Analytics, MeetingRequest
  src/lib/                  content.ts, icons.ts, theme.ts, resume.ts
  src/layouts/Base.astro    head, theme tokens, header, footer, page scripts
  src/styles/global.css     design tokens and component styles
.github/workflows/deploy.yml
CLAUDE.md                   working rules (preview before merging to main)
```

## Key decisions

- **Static site, no server.** Free hosting and nothing to patch. Dynamic behaviour (analytics,
  consent, search, filters, meeting slots) runs in the browser.
- **Content separate from code.** Content files are validated against typed schemas, so a mistake
  fails the build instead of reaching the live site.
- **Trunk-based development.** Unfinished content ships hidden behind `status`
  (`planned` / `draft` / `published`). Code changes go through a short-lived branch, a preview the
  owner reviews, then a merge to `main`.
- **Guardrails in the build.** WCAG color checks, analytics ID format checks, and a hidden Résumé
  button when its file is missing: problems are caught before deployment.
- **Privacy.** Analytics loads after the page renders, only after consent for visitors in Europe,
  and never for visitors with Do Not Track or Global Privacy Control.
- **Base-path aware.** Site URL and base path come from GitHub Pages at build time, so the site works
  on the github.io project path and on the custom domain without code changes.

## Design spec

### Principles
Content first, accessible by default (WCAG 2.1 AA enforced at build time), fast (nothing blocks
first paint), and editable without touching code.

### Color (`src/lib/theme.ts`)
- Six presets (Ocean, Emerald, Indigo, Graphite, Sunset, Crimson) or custom accent and secondary
  colors per light and dark mode, set in `content/theme.yaml`.
- Neutrals are fixed: background `#f7f8fb` / `#0c0f15`, text `#141821` / `#e8ebf2`,
  grey text `#495063` / `#9aa2b5`.
- Derived tokens: `--accent`, `--teal` (secondary), `--on-accent`, `--accent-soft`, `--shade-2`,
  `--shade-3`, `--mark-bg`, `--dot`, `--glow-a/b/c`. Emitted as `html:root` CSS so they override the
  defaults in `global.css`.
- Guardrail: text pairings need 4.5:1 and meter segments 3:1. Colors that fall short are nudged
  darker (light mode) or lighter (dark mode); glows are softened if text over them would fail; the
  build throws if anything still fails. Adjustments are logged as `[theme]` warnings.

### Typography
- Headings: Sora (600–700), slightly tight tracking, `text-wrap: balance`.
- Body: IBM Plex Sans (400–600), line height 1.6.
- Fluid scale: all sizes in rem; `html { font-size: clamp(15px, 13.5px + 0.3vw, 20px) }`, so type,
  spacing and column width scale together from phones to 2560px screens.
- Running text is justified; hyphenation on for phones, off for wide blocks (About, hero summary).

### Layout
- Single column, max width `61.25rem`; side gutter at least 16px (2rem from 720px).
- Centered hero: role line, name, summary, buttons, headline numbers.
- Collapsible sections with icon, title and count; Expand all / Collapse all; state remembered per
  visitor. Phone menu below 640px.
- Background: dot grid and three drifting glows (static with reduced motion).

### Components
Career journey timeline (logo or monogram tile, tenure, Current badge, expandable highlights);
education and certification cards; Toolkit T-shaped profile, skills-by-role evidence map (pinned
skill column on phones) and searchable skill grid with level filter and level-mix bars; four-segment
level meter with half levels; meeting-request form; cookie consent banner.

### Accessibility
Semantic headings (job titles are headings), visible focus outlines, `aria-pressed` toggles, live
regions for status messages, reduced-motion support, `[hidden]` always wins over display rules.
Verified with Lighthouse (Accessibility 100) and axe with every section expanded.

## Runtime behaviour in the browser

| Feature | Where | Notes |
|---|---|---|
| Section and role folding | `Base.astro` script | State in `localStorage` (`jc-folds`) |
| Skill search and level filter | `Base.astro` script | Hides rows and empty groups; highlights matches |
| Evidence map details | `Base.astro` script | Shows the evidence for the selected cell |
| Analytics, consent, tap tracking | `components/Analytics.astro` | Loads after `load`; consent in `localStorage` (`jc-consent`, 180 days) |
| Meeting request | `components/MeetingRequest.astro` | Builds slots from availability with time-zone maths; composes a `mailto:` |
| Skills by role editor | `pages/admin/skills-by-role.astro` | GitHub REST API with the owner's token; one commit per save |

## Build-time outputs

`/` · `/case-studies/<id>/` and `/playbook/<id>/` (published only) · `/privacy/` · `/404.html` ·
`/resume.pdf` and `/<download name>.pdf` · `/sitemap.xml` (published pages only) · `/robots.txt`
(blocks `/admin/`) · `/admin/` (Sveltia) · `/admin/skills-by-role/`.
