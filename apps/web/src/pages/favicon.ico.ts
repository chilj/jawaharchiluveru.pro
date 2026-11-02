import type { APIRoute } from 'astro';
import { iconIco } from '../lib/favicon';
export const GET: APIRoute = async () => new Response(new Uint8Array(await iconIco()), { headers: { 'Content-Type': 'image/x-icon' } });
