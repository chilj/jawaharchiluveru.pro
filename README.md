# jawaharchiluveru.pro

Personal site of Jawahar Chiluveru, Technical Product Manager.

A small monorepo run with **trunk-based development**: `main` is the trunk, every push to `main`
builds and deploys, and unfinished work ships "dark" behind content flags instead of living on
long-running branches.

```
content/                  ← everything you edit
├── sections.yaml         section names, order, on/off flags
├── about.md              About: headline, stats, bio
├── career/               Career: one file per role
├── case-studies/         Case Studies: one file per story  (_template.md to copy)
├── playbook/             Playbook: TPM artifacts            (_template.md to copy)
├── toolkit.yaml          Toolkit: skills, tools, certifications, education
├── connect.md            Let's Talk: calendar booking link, email, social links
└── public/files/         downloadable files (résumé, artifact PDFs), served at /files/…
apps/
└── web/                  Astro static site that renders content/
```

## Workflow

1. Pull `main`, make a small change in `content/`, preview with `npm run dev`.
2. Commit straight to `main` and push. The site rebuilds and deploys in about a minute.
3. For a bigger change you want to review first, use a short-lived branch (merge within a day).
   Pull requests to `main` get a build check but don't deploy.

### Shipping dark

Because everything merges to trunk, half-finished content is controlled by flags rather than branches:

| Flag | Where | Effect |
|---|---|---|
| `enabled: false` | `sections.yaml` | hides a whole section and its nav link |
| `status: planned` | any case study / playbook entry | placeholder; dev only, badge **Planned** |
| `status: draft` | any case study / playbook entry | in progress; dev only, badge **Draft** |
| `status: published` | any case study / playbook entry | live |
| `TODO` value | any field | skipped when rendering |

A section with nothing published shows a "coming soon" note on the live site.

To add an entry, copy the section's `_template.md` (files starting with `_` are ignored),
fill it in, and flip `status` to `published` when it's ready.

**Book time:** set `booking.url` in `content/connect.md` to your Calendly, Cal.com or Google
Calendar appointment-schedule link. Set `embed: true` to show the scheduler inline.

## Develop

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev       # http://localhost:4321, shows planned/draft entries
npm run build     # static output in apps/web/dist
```

## Deploy

`.github/workflows/deploy.yml` builds every pull request and deploys every push to `main` to GitHub Pages.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**, then add `www.jawaharchiluveru.pro`
under **Custom domain**.
