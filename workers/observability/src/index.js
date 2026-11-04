// Observability agent for jawaharchiluveru.pro (a Cloudflare Worker with a D1 database).
//
//   POST /rum      real-user Web Vitals sent by the site (no cookies, no personal data)
//   GET  /summary  7-day RUM, uptime and incidents for the site's Site health page
//   cron           every 10 minutes: check the site's addresses, evaluate goals, prune old data
//
// Goals: Google's "good" Web Vitals thresholds at the 75th percentile, and the site answering.

// [good up to, poor from]
const THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };
const MAX_VALUE = { LCP: 120000, INP: 60000, CLS: 50, FCP: 120000, TTFB: 120000 };
const METRICS = Object.keys(THRESHOLDS);
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime/i;
const DAY = 86400000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
    const cors = allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    }
    try {
      if (url.pathname === '/rum' && request.method === 'POST') return await collect(request, env, cors, allowed.includes(origin), origin);
      if (url.pathname === '/summary' && request.method === 'GET') return await summary(url, env, ctx, cors);
      if (url.pathname === '/') return new Response('jc-observability: RUM, uptime checks and goals for jawaharchiluveru.pro\n', { headers: { 'Content-Type': 'text/plain' } });
      return new Response('Not found', { status: 404, headers: cors });
    } catch (e) {
      console.error(e);
      return new Response('Error', { status: 500, headers: cors });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAgent(env));
  },
};

// ---- RUM collection ----

async function collect(request, env, cors, allowedOrigin, origin) {
  // The site sends with navigator.sendBeacon (text/plain, no preflight) from an allowed page.
  if (!allowedOrigin) return new Response(null, { status: 403 });
  const ua = request.headers.get('User-Agent') || '';
  if (BOTS.test(ua)) return new Response(null, { status: 204, headers: cors });
  const text = await request.text();
  if (text.length > 4096) return new Response(null, { status: 413, headers: cors });
  let body;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400, headers: cors }); }

  const page = cleanPath(body.p);
  const variant = typeof body.v === 'string' && /^[a-z]{1,20}$/.test(body.v) ? body.v : null;
  const device = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
  const country = typeof request.cf?.country === 'string' ? request.cf.country.slice(0, 2) : null;
  let host = 'main';
  try { host = new URL(origin).hostname.endsWith('pages.dev') ? 'backup' : 'main'; } catch {}
  const now = Date.now();

  const rows = (Array.isArray(body.m) ? body.m : []).slice(0, 10).filter((m) =>
    m && METRICS.includes(m.n) && typeof m.v === 'number' && Number.isFinite(m.v) && m.v >= 0 && m.v <= MAX_VALUE[m.n]);
  if (!page || !rows.length) return new Response(null, { status: 204, headers: cors });

  const insert = env.DB.prepare('INSERT INTO rum (ts, page, metric, value, rating, device, country, variant, host) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  await env.DB.batch(rows.map((m) => insert.bind(now, page, m.n, round(m.v, m.n === 'CLS' ? 4 : 0), rate(m.n, m.v), device, country, variant, host)));
  return new Response(null, { status: 204, headers: cors });
}

function cleanPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/')) return null;
  return p.split(/[?#]/)[0].replace(/[^A-Za-z0-9/._~-]/g, '').slice(0, 120) || '/';
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const rate = (metric, v) => (v <= THRESHOLDS[metric][0] ? 'good' : v <= THRESHOLDS[metric][1] ? 'needs-improvement' : 'poor');

function p75(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(0.75 * s.length) - 1)];
}

function stats(rows) {
  const out = {};
  for (const m of METRICS) {
    const r = rows.filter((x) => x.metric === m);
    if (!r.length) continue;
    const count = (k) => r.filter((x) => x.rating === k).length / r.length;
    const v = p75(r.map((x) => x.value));
    out[m] = { n: r.length, p75: v, rating: rate(m, v), good: count('good'), needs: count('needs-improvement'), poor: count('poor') };
  }
  return out;
}

const groupBy = (rows, key) => rows.reduce((acc, r) => { const k = r[key]; if (k) (acc[k] ??= []).push(r); return acc; }, {});

// ---- Summary for the Site health page ----

async function summary(url, env, ctx, cors) {
  const days = Math.min(30, Math.max(1, parseInt(url.searchParams.get('days') || '7', 10) || 7));
  const cache = caches.default;
  const key = new Request(`https://cache.local/summary?days=${days}`);
  const hit = await cache.match(key);
  if (hit) return withHeaders(hit, cors);

  const since = Date.now() - days * DAY;
  const { results: rum } = await env.DB.prepare('SELECT ts, page, metric, value, rating, device, variant FROM rum WHERE ts > ? ORDER BY ts DESC LIMIT 60000').bind(since).all();
  const { results: checks } = await env.DB.prepare('SELECT ts, target, ok, status, ms FROM checks WHERE ts > ? ORDER BY ts DESC').bind(since).all();
  const { results: incidents } = await env.DB.prepare('SELECT kind, started, resolved, detail FROM incidents WHERE resolved IS NULL OR started > ? ORDER BY started DESC LIMIT 10').bind(since).all();

  const byDay = groupBy(rum.map((r) => ({ ...r, day: new Date(r.ts).toISOString().slice(0, 10) })), 'day');
  const daily = Object.keys(byDay).sort().map((day) => {
    const s = stats(byDay[day]);
    return { day, LCP: s.LCP?.p75 ?? null, INP: s.INP?.p75 ?? null, CLS: s.CLS?.p75 ?? null, views: byDay[day].filter((r) => r.metric === 'TTFB').length };
  });
  const pages = Object.entries(groupBy(rum, 'page'))
    .map(([page, r]) => ({ page, views: r.filter((x) => x.metric === 'TTFB').length, LCP: stats(r).LCP?.p75 ?? null }))
    .sort((a, b) => b.views - a.views).slice(0, 6);
  const uptime = Object.entries(groupBy(checks, 'target')).map(([target, c]) => ({
    target,
    checks: c.length,
    uptime: c.filter((x) => x.ok).length / c.length,
    avgMs: Math.round(c.reduce((n, x) => n + (x.ms || 0), 0) / c.length),
    last: { ts: c[0].ts, ok: !!c[0].ok, status: c[0].status, ms: c[0].ms },
  }));

  const body = {
    generated: Date.now(), days, thresholds: THRESHOLDS,
    views: rum.filter((r) => r.metric === 'TTFB').length,
    metrics: stats(rum),
    devices: Object.fromEntries(Object.entries(groupBy(rum, 'device')).map(([k, r]) => [k, stats(r)])),
    variants: Object.fromEntries(Object.entries(groupBy(rum.filter((r) => r.page === '/'), 'variant')).map(([k, r]) => [k, stats(r)])),
    daily, pages, uptime, incidents,
  };
  const res = new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' } });
  ctx.waitUntil(cache.put(key, res.clone()));
  return withHeaders(res, cors);
}

function withHeaders(res, extra) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}

// ---- The agent's scheduled run ----

async function runAgent(env) {
  const now = Date.now();
  const targets = env.TARGETS.split(',').map((t) => t.trim().split('=')).filter(([n, u]) => n && u);

  // 1. Synthetic checks: does each address answer, and how fast?
  const results = await Promise.all(targets.map(async ([target, url]) => {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'jc-observability/1.0 (uptime check)' }, cf: { cacheTtl: 0 } });
      return { target, ok: res.ok, status: res.status, ms: Date.now() - t0 };
    } catch {
      return { target, ok: false, status: null, ms: Date.now() - t0 };
    }
  }));
  const insert = env.DB.prepare('INSERT INTO checks (ts, target, ok, status, ms) VALUES (?, ?, ?, ?, ?)');
  await env.DB.batch(results.map((r) => insert.bind(now, r.target, r.ok ? 1 : 0, r.status, r.ms)));

  // 2. Goals. Down: two failed checks in a row. Slow: a Web Vital's 24-hour p75 above "good".
  for (const r of results) {
    const { results: last } = await env.DB.prepare('SELECT ok FROM checks WHERE target = ? ORDER BY ts DESC LIMIT 2').bind(r.target).all();
    const down = last.length === 2 && last.every((x) => !x.ok);
    await incident(env, `down:${r.target}`, down, now, `${r.target} not answering (last status ${r.status ?? 'no response'})`, r.ok);
  }
  const { results: recent } = await env.DB.prepare("SELECT metric, value FROM rum WHERE ts > ? AND metric IN ('LCP','INP','CLS')").bind(now - DAY).all();
  for (const m of ['LCP', 'INP', 'CLS']) {
    const v = recent.filter((x) => x.metric === m).map((x) => x.value);
    if (v.length < 20) continue; // too few visits to judge
    const p = p75(v);
    const slow = p > THRESHOLDS[m][0];
    await incident(env, `slow:${m}`, slow, now, `${m} p75 ${m === 'CLS' ? p.toFixed(3) : `${Math.round(p)} ms`} over the last 24 hours (goal ≤ ${THRESHOLDS[m][0]}${m === 'CLS' ? '' : ' ms'})`, !slow);
  }

  // 3. Retention.
  const cutoff = now - (parseInt(env.RETENTION_DAYS || '90', 10) || 90) * DAY;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM rum WHERE ts < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM checks WHERE ts < ?').bind(cutoff),
    env.DB.prepare('DELETE FROM incidents WHERE resolved IS NOT NULL AND resolved < ?').bind(cutoff),
  ]);
}

async function incident(env, kind, failing, now, detail, recovered) {
  const open = await env.DB.prepare('SELECT id FROM incidents WHERE kind = ? AND resolved IS NULL').bind(kind).first();
  if (failing && !open) await env.DB.prepare('INSERT INTO incidents (kind, started, detail) VALUES (?, ?, ?)').bind(kind, now, detail).run();
  else if (open && recovered) await env.DB.prepare('UPDATE incidents SET resolved = ? WHERE id = ?').bind(now, open.id).run();
}
