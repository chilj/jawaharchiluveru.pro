# jawaharchiluveru.pro

Personal site of Jawahar Chiluveru, Technical Product Manager.

Content and code are kept apart: **edit `content/` to update the site**; `apps/web/` only renders it.

```
content/                  ← everything you edit
├── sections.yaml         section names, order, show/hide
├── about.md              About: headline, stats, bio
├── career/               Career: one file per role
├── case-studies/         Case Studies: one file per story  (_template.md to copy)
├── playbook/             Playbook: TPM artifacts            (_template.md to copy)
├── toolkit.yaml          Toolkit: skills, tools, certifications, education
├── connect.md            Let's Talk: booking link, email, social links
└── public/files/         downloadable files (résumé, artifact PDFs), served at /files/…
apps/
└── web/                  Astro static site
```

## Publishing workflow

Every case study and playbook entry has a `status`:

| status      | `npm run dev` | live site |
|-------------|---------------|-----------|
| `tbd`       | shown, **TBD** badge | hidden |
| `draft`     | shown, **Draft** badge | hidden |
| `published` | shown | shown |

Any field left as `TBD` is skipped when rendering. A section with nothing published shows a "coming soon" note.

To add an entry, copy the section's `_template.md` (files starting with `_` are ignored), fill it in, and set `status: published`.

**Book time:** set `booking.url` in `content/connect.md` to your Calendly, Cal.com or Google Calendar appointment-schedule link. Set `embed: true` to show the scheduler inline.

## Develop

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev       # http://localhost:4321, shows TBD/draft entries
npm run build     # static output in apps/web/dist
```

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**, then add `www.jawaharchiluveru.pro` under **Custom domain**.
