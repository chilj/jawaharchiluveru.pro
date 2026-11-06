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
- **Certifications** (Profile & settings → Certifications) use LinkedIn's fields: name, issuing
  organization, issue and expiration dates, credential ID and URL, skills and media. When the site
  builds it reads each **Credential URL** for the badge image (Credly, Accredible and most issuers
  publish one) and each media link for a title and preview image. Pages that can't be read fall
  back to the issuer logo or monogram; expired credentials are labeled. Clicks send
  `credential_open` and `credential_media` events.
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

**A/B test (home page):** Profile & settings → **A/B test (home page)** splits visitors between two
versions of the top of the home page: **B · Career journey** (a clickable timeline of roles) and
**D · Bento dashboard** (tiles: intro, current role, stats, skills, certifications, latest post).
The current hero is the control (0% by default). Each visitor is assigned once (stored in their
browser) and keeps the same version; the choice is made before the page paints, so there is no
flicker. Preview any version with `?variant=journey`, `?variant=bento` or `?variant=classic`;
previews aren't stored or counted. To end the test, give the winner 100 and the others 0, or turn
it off to go back to the current hero. Changing **Test name** starts a fresh test.
Analytics: every event carries `ab_variant`, GA4 gets the user property `landing_variant`, Clarity
gets the tag `landing_variant`, and each test page view sends `experiment_exposure`. In GA4, add
custom dimensions once (Admin → Custom definitions): **landing_variant** (User scope) and
**ab_variant** (Event scope). Then compare, per version, `resume_download`, `contact_click` and
`feedback_submit` against `experiment_exposure` (Explore → Free form, rows: ab_variant).
In Clarity, filter recordings and heatmaps by **Custom tags → landing_variant**.

**Meeting requests:** the form in Let's Talk offers open slots from the availability under
Profile & settings → Let's Talk → Meeting request form (time zone, days, hours, length, notice,
weeks ahead, unavailable dates). Submitting opens the visitor's email app with the request,
both proposed times (in your time zone and theirs) and a link back to Let's Talk; nothing is
booked until you reply.

**Book time:** set `booking.url` in `content/connect.md` to your Calendly, Cal.com or Google
Calendar appointment-schedule link. Set `embed: true` to show the scheduler inline.

## Rollback and maintenance

**Rollback.** Every production deploy is tagged `deploy-YYYYMMDD-HHMMSS` (the 30 newest are kept).
If a release breaks something:

1. **Actions → Roll back site → Run workflow.** Leave **Version** as `previous` (the release before
   the newest) or enter a `deploy-…` tag or a commit. Tick the agent box to also return the
   observability Worker to its previous version. The site is restored in about two minutes, on the
   main domain and the backup copy. `main` itself is not changed.
2. **Hold deploys while you fix:** Settings → Secrets and variables → Actions → Variables → add
   `DEPLOY_HOLD` = `true`. Pushes and site-editor saves are then built but not deployed (the run
   shows a warning).
3. **Fix forward** on a branch, merge, then delete `DEPLOY_HOLD` and run **Build & deploy**.

Other undo paths: the backup copy can also be rolled back in Cloudflare (Workers & Pages →
jawaharchiluveru → Deployments), and the agent with `npx wrangler rollback` in
`workers/observability`. Database migrations only add tables and columns, so they never need undoing.

**Maintenance mode.** Profile & settings → **Maintenance** (live about a minute after saving):
**Banner** keeps the site usable with a notice at the top; **Maintenance page** covers the site with
your message, an optional return time (shown in each visitor's time zone) and email/LinkedIn links.
The page's real content stays in the HTML so search engines keep seeing it; /admin and Site health
keep working; add `?maintenance=off` to an address to see the site yourself during maintenance.

## Observability agent and Site health

`workers/observability/` is a Cloudflare Worker with a D1 database, deployed by the same workflow:

- **Real-user monitoring (RUM):** every page measures Core Web Vitals (LCP, INP, CLS, FCP, TTFB) in
  the visitor's browser with `web-vitals` and sends them when the page is hidden: page path, values,
  A/B version; the agent adds device type and country. No cookies or identifiers; Do Not Track and
  Global Privacy Control are honored; bots are ignored; data is kept 90 days.
- **Uptime checks** every 10 minutes for the main site and the backup copy.
- **Goals:** an incident opens when a site fails two checks in a row, or when a Web Vital's 24-hour
  75th percentile misses Google's "good" threshold (with at least 20 samples), and closes on recovery.
- **Site health page** at `/status/` (footer link) shows 7- or 30-day results, the daily LCP trend,
  results by device and by A/B version, top pages, uptime and incidents.

**Free plans only.** Everything runs on free tiers: GitHub Pages and Actions (public repo), Cloudflare
Workers, D1 and Pages, Clarity, GA4, Web3Forms (with hCaptcha) and Tawk.to. Free plans don't bill for
going over a limit; they pause or return errors until the next day. The agent is built to stay well
inside Cloudflare's free limits: percentiles and grouping run in D1's SQL (the free plan gives a
Worker very little CPU time), the 7- and 30-day summaries are computed once an hour so each Site
health visit reads one row, and collection pauses for the rest of the day (UTC) if 80,000 rows were
written (D1's free allowance is 100,000 a day, about 20,000 page views). Lower **Share of page views
measured** if traffic ever gets near that.

**Other sites (ready4peak.jawaharchiluveru.pro).** The agent measures more than one site: `SITES` in
`workers/observability/wrangler.toml` lists each site's id, label and hostnames, and `TARGETS` its
uptime check. Another site adds one line to its pages, before `</body>`:
`<script src="https://jc-observability.jawahar-ch14.workers.dev/rum.js" defer></script>`.
Its data is kept separate (Site health has a site switcher, or link `/status/?site=ready4peak`). Its
page paths come from the visitor's address bar, so the agent replaces ID-like segments (numbers,
long hex or token strings, anything with @) with `:id`, and lists only pages with 5+ views.

Settings: Profile & settings → Analytics (agent address, share of page views measured, page on/off).
The agent's address is filled in automatically from each deploy; set it in the editor to pin it.

One-time setup, on top of the backup copy's token: in Cloudflare, edit the API token and add
**Account → Workers Scripts → Edit** and **Account → D1 → Edit**, and make sure your account has a
workers.dev subdomain (Workers & Pages → Overview shows it). The first deploy creates the
`jc-observability` database and Worker; the step's log prints the agent's address.

Local test: `cd workers/observability`, then `npx wrangler@4.45.0 d1 migrations apply jc-observability --local`
and `npx wrangler@4.45.0 dev --local --test-scheduled`.

## Develop

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev       # http://localhost:4321, shows planned/draft entries
npm run build     # static output in apps/web/dist
```

## Deploy

**Backup address (Cloudflare Pages).** Some work networks block new or uncommon domains. Every
deploy can also publish the same site to `https://<project>.pages.dev` (search engines are told not
to index it; the main domain stays canonical). Send that link to anyone who can't open the main one.
To switch it on:

1. In Cloudflare: **My Profile → API Tokens → Create Token → Custom token**, permission
   **Account → Cloudflare Pages → Edit**, then copy the token. Copy your **Account ID** from the
   right side of any Cloudflare dashboard page (Workers & Pages overview).
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Re-run **Actions → Build & deploy** (or push to `main`). The project is created on the first run
   as `jawaharchiluveru` (set the `CLOUDFLARE_PAGES_PROJECT` repository variable to change it); the
   step's log shows the exact address.

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
