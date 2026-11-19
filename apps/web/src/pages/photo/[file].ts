import type { APIRoute } from 'astro';
import { PHOTO_VARIANTS, photoCrop, photoSettings, type PhotoVariant } from '../../lib/photo';

// /photo/portrait-480.webp etc.: sizes of the profile photo, built only when one is set.
export async function getStaticPaths() {
  return (await photoSettings()) ? Object.keys(PHOTO_VARIANTS).map((file) => ({ params: { file } })) : [];
}
export const GET: APIRoute = async ({ params }) => {
  const v = PHOTO_VARIANTS[params.file as PhotoVariant];
  return new Response(new Uint8Array(await photoCrop(v.w, v.h, v.format)), { headers: { 'Content-Type': v.format === 'jpeg' ? 'image/jpeg' : 'image/webp' } });
};
