# jawaharchiluveru.pro

Personal site of Jawahar Chiluveru, Technical Product Manager.

A small monorepo run with **trunk-based development**: `main` is the trunk, every push to `main`
builds and deploys, and unfinished work ships "dark" behind content flags instead of living on
long-running branches.

Tech stack, design spec and architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
content/                  ← everything you edit
├── sections.yaml         section names, order, on/off flags
├── about.md              About: headline, stats, bio
├── career/               Career: one file per role
├── case-studies/         Case Studies: one file per story
├── playbook/             Playbook: TPM artifacts
├── blog/                 Blog: one Markdown file per post, at /blog/<slug>/
├── education.yaml        Education: degrees and institutions
├── certifications.yaml   Certifications
├── theme.yaml            Theme & colors: preset palette or custom accent/secondary per mode
├── toolkit.yaml          Toolkit: skill matrix (overall profile + groups with levels and evidence)
├── resume.yaml           Résumé button: PDF, button text, download name, last updated
├── analytics.yaml        Analytics: Microsoft Clarity, Google Analytics 4, Cloudflare Web Analytics IDs
├── chat.yaml             Chat: greeting, suggested questions and answers, where typed messages go
├── feedback.yaml         Feedback form: delivery, wording, rating, topics, which fields to ask for
├── privacy.md            Privacy page (/privacy/)
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
- **Toolkit** has three parts, all editable:
  - *T-shaped profile*: breadth comes from the skill groups; depth lists the Advanced–Expert and
    Expert domains in **Toolkit → Overall profile**. Edit the depth heading under **T-shaped profile**.
  - *Skills by role*: edit the whole map at **/admin/skills-by-role/**. Sign in with the same
    GitHub token, click cells to add or remove a skill for a role, pick or type the evidence,
    then **Save to GitHub** (one commit for all changed roles). Skill names come from the matrix,
    so levels always match. Behind the scenes each role's **Skills shown in Toolkit** list holds it.
  - *Every skill*: change any skill's level or evidence in **Toolkit → Skill groups**.
- The editor rewrites YAML when it saves, so comments in edited files are dropped.
- **Theme & colors** (Profile & settings): pick a preset (Ocean, Emerald, Indigo, Graphite, Sunset,
  Crimson) or set custom accent and secondary colors for light and dark mode. Every color pairing
  is checked against WCAG 2.1 AA (4.5:1 for text, 3:1 for meters); colors that fall short are
  darkened (light mode) or lightened (dark mode) automatically, background glows are softened if
  needed, and the build stops rather than publish a palette that still fails. Adjustments are
  listed in the build log.
- **Blog**: write a post under **Blog → New**. Set **Web address** for a clean link
  (/blog/<web-address>/), and **Status: published** to put it live. The Blog link appears in the
  menu once a post is published; posts are in the sitemap and carry article metadata for search.
- **Site icon** (Profile & settings → About): **Site icon (large)** is used for phone home screens
  and other big icons; **Site icon (small)** for browser tabs and Google results, where icons are
  16–48 pixels, so keep it simple (SVG is best). Leave both empty for a JC icon in your theme colors.
  **Header logo** (same page) sets the top-left square: the small site icon, your own image, or
  initials on a color tile.
- **Résumé** (Profile & settings): upload a new PDF to replace the current one. The live résumé is
  always at **jawaharchiluveru.pro/resume.pdf** (a permanent link for LinkedIn or email
  signatures) and at `/<File name for visitors>`. If the file goes missing, the button hides
  instead of linking to a dead file.
- **Analytics** (Profile & settings): paste a Microsoft Clarity project ID (visits, heatmaps,
  recordings), and optionally a Google Analytics 4 measurement ID and a Cloudflare Web Analytics
  token. Each switches on when its ID is set and loads after the page renders. Every tappable
  control sends `ui_click` (label, section, and open/close state for collapsible headers). Named
  events on top: `resume_download`, `contact_click` (email, LinkedIn, booking), `case_study_open`,
  `playbook_open`, `playbook_download`, `file_download`, `outbound_click`, `skill_search`,
  `feedback_open`, `feedback_submit`, and the `chat_*` events below.
  Visitors with Do Not Track or Global Privacy Control get no analytics (switchable).
  Cookie consent: visitors in Europe (by time zone; or everyone, or no one) see a banner, and
  Clarity/GA4 load only after **Accept**. The choice lasts 6 months; **Cookie settings** in the
  footer reopens it. The Privacy page text is editable under Profile & settings.

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

**Feedback form:** every page has a **Feedback** link in the footer and, optionally, a **Feedback**
tab pinned to the bottom-left edge. Set it up under Profile & settings → Feedback form. By default it opens the visitor's email
app addressed to the email in Let's Talk. To have feedback arrive in your inbox without that step,
choose **Web3Forms** and paste the free access key from web3forms.com (or **Formspree** and a form
ID). If the service can't be reached, visitors are offered their email app instead. Turn on **Spam check
(hCaptcha)** to require an "I am human" check before Web3Forms sends; it loads only when the form opens. Submissions
send a `feedback_submit` analytics event with the topic and rating.

**Chat:** a floating **Chat** button at the bottom-right of every page (set it up under Profile &
settings → Chat). It answers your suggested questions on the page (add, edit, reorder or hide them
under **Suggested questions**; each answer can have a link button, e.g. to #connect or /resume.pdf), and a typed message goes to the
channel you choose: Web3Forms (straight to your inbox; uses the Feedback form's key unless you set
one, asks for the visitor's email, and has an hCaptcha check), email (the visitor's email app), WhatsApp (your number becomes visible in the page), Telegram
(your username; number stays private) or Tawk.to live chat (reply from the Tawk app on your phone;
it loads only when a visitor starts a chat; with a Web3Forms key, visitors can also leave a message). The Feedback tab and Chat button never overlap, hide
behind the cookie banner, or cover the end of a page. Events: `chat_open`, `chat_reopen`,
`chat_close`, `chat_faq` (the question), `chat_faq_link`, `chat_message` (the channel), `chat_live_start`,
`chat_live_connected`, `chat_message_failed`.

**Meeting requests:** the form in Let's Talk offers open slots from the availability under
Profile & settings → Let's Talk → Meeting request form (time zone, days, hours, length, notice,
weeks ahead, unavailable dates). Submitting opens the visitor's email app with the request,
both proposed times (in your time zone and theirs) and a link back to Let's Talk; nothing is
booked until you reply.

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
