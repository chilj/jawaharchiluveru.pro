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
├── case-studies/         Case Studies: one file per story
├── playbook/             Playbook: TPM artifacts
├── education.yaml        Education: degrees and institutions
├── certifications.yaml   Certifications
├── toolkit.yaml          Toolkit: skill matrix (overall profile + groups with levels and evidence)
├── connect.md            Let's Talk: calendar booking link, email, social links
├── public/files/         downloadable files (résumé, artifact PDFs), served at /files/…
└── _templates/           starting points for new entries when editing files by hand
apps/
└── web/                  Astro static site that renders content/
    └── cms/config.yml    forms for the content editor at /admin
```

## Content editor

Go to **https://www.jawaharchiluveru.pro/admin/** to edit everything in `content/` through forms:
profile, section names, career roles, case studies, playbook artifacts, toolkit and booking link,
plus uploads for your résumé and artifact files. Each save is a commit to `main`, so the site
redeploys about a minute later.

**Sign in (one time):** create a fine-grained GitHub token at
https://github.com/settings/personal-access-tokens/new with access to only
`chilj/jawaharchiluveru.pro` and **Contents: Read and write**. Paste it under
**Sign In Using Access Token**. The token stays in that browser.

In Chrome or Edge you can instead choose **Work with Local Repository** and pick your local clone;
changes are written to disk and you commit and push them yourself.

Things to know:
- Use `status` to stage work: `planned` and `draft` items stay off the live site.
- Unconfirmed career bullets go in **Needs verification**, which is never shown.
- The editor rewrites YAML when it saves, so comments in edited files are dropped.

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

To add an entry, use **New** in the content editor, or copy a file from `content/_templates/`
into the section's folder. Flip `status` to `published` when it's ready.

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
The site URL and base path come from the Pages settings, so it works at `https://chilj.github.io/jawaharchiluveru.pro/`
and, once a custom domain is set, at the domain root with no code change.

One-time setup:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   (Pages on a private repo needs a paid GitHub plan; on GitHub Free, make the repo public.)
2. **Actions → Build & deploy → Run workflow** (or push to `main`).
3. Custom domain: at your DNS provider, add a `CNAME` record for `www` → `chilj.github.io`, plus
   `A` records for the apex `jawaharchiluveru.pro` → `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153`. Then **Settings → Pages → Custom domain:**
   `www.jawaharchiluveru.pro`, and tick **Enforce HTTPS** once the certificate is issued.
   Run the workflow again so links pick up the new base.
