import type { APIRoute } from 'astro';
import { socialCardPng } from '../lib/social-card';

// The link-preview image (1200×630) used when no Social image is set in the editor.
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await socialCardPng()), { headers: { 'Content-Type': 'image/png' } });
