import { defineConfig } from 'astro/config';

// In CI these come from GitHub Pages (actions/configure-pages), so the site works both at
// https://<user>.github.io/<repo>/ and, once a custom domain is set, at the domain root.
const site = process.env.SITE_URL || 'https://www.jawaharchiluveru.pro';
const base = `${(process.env.BASE_PATH || '').replace(/\/$/, '')}/`;

export default defineConfig({
  site,
  base,
  // Static files (résumé, headshot, playbook downloads) live with the content.
  publicDir: '../../content/public',
});
