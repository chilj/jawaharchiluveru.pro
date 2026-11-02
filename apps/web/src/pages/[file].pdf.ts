// Publishes the current résumé at /resume.pdf (a permanent link) and at /<download_name>.pdf.
import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import { getResume } from '../lib/resume';

export const getStaticPaths: GetStaticPaths = async () => {
  const resume = await getResume();
  return resume ? resume.names.map((file) => ({ params: { file }, props: { path: resume.path } })) : [];
};

export const GET: APIRoute = ({ props }) =>
  new Response(readFileSync(props.path as string), { headers: { 'Content-Type': 'application/pdf' } });
