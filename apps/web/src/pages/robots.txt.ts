import type { APIRoute } from 'astro';
import { preprod } from '../lib/content';

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL;
  if (preprod) return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: ${base}admin/\n\nSitemap: ${new URL(`${base}sitemap.xml`, site)}\n`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
};
