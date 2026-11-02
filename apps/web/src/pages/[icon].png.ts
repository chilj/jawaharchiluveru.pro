import type { APIRoute } from 'astro';
import { iconPng } from '../lib/favicon';

// favicon-48x48.png and favicon-96x96.png for search results, the home-screen icons, and the
// Apple touch icon (square: iOS rounds the corners itself).
const ICONS: Record<string, { size: number; rounded: boolean }> = {
  'favicon-48x48': { size: 48, rounded: true },
  'favicon-96x96': { size: 96, rounded: true },
  'icon-192': { size: 192, rounded: true },
  'icon-512': { size: 512, rounded: true },
  'apple-touch-icon': { size: 180, rounded: false },
};
export const getStaticPaths = () => Object.keys(ICONS).map((icon) => ({ params: { icon } }));
export const GET: APIRoute = async ({ params }) => {
  const { size, rounded } = ICONS[params.icon!];
  return new Response(new Uint8Array(await iconPng(size, { rounded })), { headers: { 'Content-Type': 'image/png' } });
};
