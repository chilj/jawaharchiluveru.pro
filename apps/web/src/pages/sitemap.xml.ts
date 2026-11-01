import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// Only published pages; drafts and planned items stay out even in review builds.
export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const published = (e: { data: { status: string } }) => e.data.status === 'published';
  const paths = [
    '',
    ...(await getCollection('case-studies', published)).map((e) => `case-studies/${e.id}/`),
    ...(await getCollection('playbook', published)).map((e) => `playbook/${e.id}/`),
  ];
  const urls = paths.map((p) => `  <url><loc>${new URL(base + p, site)}</loc></url>`).join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
