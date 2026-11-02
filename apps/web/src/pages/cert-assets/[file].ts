import type { APIRoute } from 'astro';
import { certificationAssets } from '../../lib/certifications';

// Badge and media preview images read from credential URLs at build time.
export async function getStaticPaths() {
  const assets = await certificationAssets();
  const built = await Promise.all(assets.map(async (a) => ({ file: a.file, data: await a.data() })));
  return built.filter((a) => a.data).map((a) => ({ params: { file: a.file }, props: { data: a.data } }));
}
export const GET: APIRoute = ({ props }) => new Response(new Uint8Array(props.data as Buffer), { headers: { 'Content-Type': 'image/webp' } });
