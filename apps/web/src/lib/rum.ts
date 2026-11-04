import { getEntry } from 'astro:content';

/** The observability agent's address: the editor setting, else the one the deploy just published. */
export async function rumConfig() {
  const a = (await getEntry('analytics', 'analytics'))?.data;
  const raw = (a?.rum_endpoint || process.env.RUM_ENDPOINT || '').replace(/\/+$/, '');
  // https only, except a local agent (wrangler dev) for testing.
  const endpoint = /^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(raw) ? raw : '';
  return {
    endpoint,
    sample: a?.rum_sample ?? 100,
    respectPrivacy: a?.respect_privacy_signals ?? true,
    statusPage: (a?.status_page ?? true) && !!endpoint,
  };
}
