---
slug: launching-my-portfolio-like-a-product
title: I launched my portfolio like a product, with AI as my engineering team
summary: As the Technical Product Manager, I directed Claude Code to build and launch this site in 12 hours over 4 days. Here is how we worked, what shipped, what it cost, and what it taught me about product management with AI.
date: 2026-11-02
tags: [Product management, AI, Build in public]
status: published
---

**TL;DR:** I treated my portfolio, jawaharchiluveru.pro, as a product. I was the Technical Product Manager; Claude Code was my engineering team. In about 12 hours of my time over 4 days, we went from an empty repository to a live, measured, accessible site that scores 100/100/100/100 on desktop PageSpeed Insights. It cost about a tenth of what hiring a freelance engineer would have.

## Why run a portfolio like a product

A portfolio has customers (hiring managers, recruiters and peers), a job to be done (show what I can do, quickly and credibly) and a backlog that never ends. I also wanted to answer a question every product leader is asking right now: what can a TPM ship when AI writes the code and the product decisions stay with me?

So I set one rule for the split. I owned intent, priorities and acceptance. Claude Code owned design, code, tests and deploys, and nothing went live without my approval.

## By the numbers

- **92 commits**: 35 by Claude, plus 56 content edits I made myself in the site editor
- **4 days** with commits, **about 12 hours** of my time
- **About 4 million tokens** of AI usage
- **100 / 100 / 100 / 100** on desktop PageSpeed Insights (Performance, Accessibility, Best Practices, SEO); **98 / 100 / 100 / 100** on mobile
- **About $1,000–1,850 all-in**, counting my time, against an estimated $9,000–33,000 for a freelance engineer

## How we worked

Every change, from the first page to the last feature, followed the same loop:

1. **State intent.** One plain request, often a single line.
2. **Build on a branch.** Claude writes the code, then tests it in a real browser.
3. **Preview.** A private link showing exactly what will go live.
4. **Decide.** I review it, then reply "merge" or ask for changes.
5. **Ship.** Merging to main deploys the site in about a minute.

One rule was non-negotiable: nothing merges to main until I have reviewed a live preview. It is written into the repository's instructions, so it holds in every session.

## From empty repo to launch

The site grew in more than 20 small, reversible increments. Roughly in order:

- **Foundation.** A one-page portfolio built from my LinkedIn profile export, then a monorepo with trunk-based development, where unfinished sections ship hidden behind status flags.
- **Look and feel.** An animated dot-grid background, collapsible sections, brand logos, and a layout that scales from 320px phones to 2560px screens.
- **Going live.** GitHub Pages deploys on every push, on my own domain through Cloudflare DNS. Fixing an unstyled first deploy and a 404 from the old address were part of the job.
- **Self-service.** A content editor at /admin, so I can change any section without an engineer.
- **Findability.** Structured data, a sitemap, social previews, and self-hosted fonts.
- **Depth.** My skill matrix: 152 skills with levels and evidence, a T-shaped profile, and a skills-by-role map with its own grid editor.
- **Guardrails.** A color scheme configurator in which every color pairing is checked against WCAG 2.1 AA, and the build stops if one fails.
- **Conversion.** A permanent résumé link and a meeting-request form that offers open slots in both time zones and writes the email.
- **Measurement.** Microsoft Clarity and Google Analytics 4 with an event for every tap, cookie consent for European visitors, and a plain-language privacy page.

## The TPM work behind it

The code was delegated. The product management was not.

- **Discovery and scope.** Started from my LinkedIn profile, shipped a thin first slice, and kept placeholder sections hidden until they were ready.
- **Prioritization.** Each increment was one clear request with a single outcome, small enough to reverse.
- **Delivery process.** Trunk-based development with a preview gate before every merge.
- **Acceptance criteria.** Every change was tested in a real browser, on phone and desktop, in light and dark mode, before I approved it.
- **Non-functional requirements as build gates.** Contrast failures stop a deploy instead of waiting for someone to notice.
- **Build vs. buy.** A Git-based CMS, Clarity and GA4 instead of custom builds.
- **Instrumentation.** Résumé downloads and contact clicks are tracked as key events.
- **Risk and compliance.** Consent where it is required, Do Not Track and Global Privacy Control honored.
- **Self-service for the customer.** I update every section myself, and changes are live in about a minute.
- **Documentation.** Architecture, design spec and decisions live in the repository.

## Quality evidence

| Measure | Result | How it was measured |
|---|---|---|
| Desktop: Performance, Accessibility, Best Practices, SEO | 100 / 100 / 100 / 100 | Google PageSpeed Insights; largest paint 0.3 s, blocking time 0 ms, layout shift 0 |
| Mobile: Performance, Accessibility, Best Practices, SEO | 98 / 100 / 100 / 100 | Emulated Moto G Power on slow 4G; largest paint 1.1 s, blocking time 30 ms, layout shift 0 |
| Agentic Browsing | 2 / 2 | Google's checks for how well AI agents can use the site |
| Home page size | 44 KB | Compressed HTML with inline CSS and icons, plus 79 KB of fonts |
| WCAG 2.1 AA color checks | 151 / 151 pass | Every preset, plus deliberately bad custom colors |
| Contrast issues, all sections expanded | 0 | axe-core, six color schemes, light and dark |

## The stack

A static site with no server: content lives in files, every change is a Git commit, and a build turns it into HTML.

| Layer | Technology | Role |
|---|---|---|
| Site framework | Astro 7 + TypeScript | Builds the whole site as static HTML |
| Content | Markdown + YAML | Typed schemas, so a mistake fails the build, not the live site |
| Content editor | Sveltia CMS | Forms at /admin; every save is a Git commit |
| Hosting and CI/CD | GitHub Pages + GitHub Actions | Every push to main builds and deploys |
| DNS | Cloudflare | Custom domain |
| Analytics | Microsoft Clarity + Google Analytics 4 | Heatmaps, recordings and an event for every tap |
| Quality tooling | Playwright, Lighthouse, axe | Browser tests and audits during development |
| AI | Claude Code | Design, code, tests and deploys, with every merge approved by me |

```
Me ------> /admin (Sveltia CMS) ------+
Me ------> /admin/skills-by-role -----+--> commit to main
Claude --> branch -> preview -> merge +          |
                                                 v
                                  GitHub Actions: astro build
                                  (schemas, WCAG guardrail,
                                   résumé check, sitemap)
                                                 |
                                                 v
                                  GitHub Pages (static HTML,
                                  fonts, PDFs)
                                                 |
                                                 v
             Cloudflare DNS: www.jawaharchiluveru.pro --> visitors
```

## What it cost

I compared this build with one experienced freelance full-stack engineer delivering the same scope, from domain setup to launch, at $75–150 an hour. I priced my own 12 hours at the same rate to keep it fair. The domain and hosting cost the same either way (GitHub Pages and Cloudflare are free here).

| | Freelance engineer | AI-assisted (this build) |
|---|---|---|
| Calendar time | 4–8 weeks | 4 days |
| Hands-on hours | 120–220 | About 12 (mine) |
| Labor | $9,000–33,000 | $900–1,800 |
| AI usage | None | About $10–30 |
| **Total** | **$9,000–33,000** | **About $1,000–1,850** |

The engineer's estimate, by workstream:

| Workstream | Hours | Cost |
|---|---|---|
| Domain, DNS, CI/CD | 4–8 | $300–1,200 |
| Monorepo and site foundation | 8–16 | $600–2,400 |
| Content model and migration | 6–12 | $450–1,800 |
| Visual design and responsive layout | 16–30 | $1,200–4,500 |
| Content editor (/admin) | 8–16 | $600–2,400 |
| Skills-by-role editor | 12–24 | $900–3,600 |
| Skill matrix UI | 12–20 | $900–3,000 |
| SEO and social previews | 4–8 | $300–1,200 |
| Color configurator with WCAG guardrail | 12–20 | $900–3,000 |
| Résumé tool | 3–6 | $225–900 |
| Analytics and tap tracking | 6–10 | $450–1,500 |
| Consent banner and privacy page | 6–10 | $450–1,500 |
| Meeting request form | 8–14 | $600–2,100 |
| Accessibility and performance | 6–12 | $450–1,800 |
| Docs, reviews, overhead | 8–16 | $600–2,400 |
| **Total** | **About 120–220** | **$9,000–33,000** |

AI usage is about 4 million tokens priced at Claude Opus API list rates; on a Claude subscription it is part of the monthly plan. Depending on which ends of the ranges you compare, the AI-assisted build cost 5 to 30 times less and took a fraction of the calendar time.

What the AI did not replace: deciding what to build, judging every preview, and owning the result. Those 12 hours were product management.

## What it taught me about product management with AI

1. **AI moves the bottleneck to product judgment.** Clear intent, fast feedback and decisive calls set the pace, not typing speed.
2. **Previews beat specs.** Seeing the change settles debates a document can't.
3. **Encode quality as guardrails in the pipeline**, not as review checklists.
4. **Verify outcomes, not outputs.** A few "passing" checks still hid real bugs on screen.
5. **Small slices compound** into a lot of shipped value.
6. **The economics change what's worth building.** Ideas that never cleared the bar for an engineer's time are now an afternoon's work.

## What's next

The case studies and playbook sections are still in draft, and the analytics will show which parts of the site people actually use. Have a look around and tell me what you would change. If you'd like to talk product, platforms or AI-assisted delivery, you can [request a meeting](https://www.jawaharchiluveru.pro/#connect) right on the site.
