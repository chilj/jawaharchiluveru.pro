import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { buildTheme } from '../lib/theme';

export const GET: APIRoute = async () => {
  const about = (await getEntry('about', 'about'))!.data;
  const theme = buildTheme((await getEntry('theme', 'theme'))?.data);
  const base = import.meta.env.BASE_URL;
  return new Response(JSON.stringify({
    name: about.name,
    short_name: about.name.split(' ')[0],
    start_url: base,
    display: 'browser',
    theme_color: theme.light['--accent'],
    background_color: theme.light['--bg'] ?? '#ffffff',
    icons: [192, 512].map((s) => ({ src: `${base}icon-${s}.png`, sizes: `${s}x${s}`, type: 'image/png' })),
  }, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
};
