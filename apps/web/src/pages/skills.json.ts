import type { APIRoute } from 'astro';
import { skillIndex } from '../lib/skills';

// The skills index the site-wide skill search downloads when it is first opened.
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await skillIndex()), { headers: { 'Content-Type': 'application/json' } });
