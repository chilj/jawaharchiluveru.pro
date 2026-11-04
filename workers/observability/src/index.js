// Observability agent for jawaharchiluveru.pro (a Cloudflare Worker with a D1 database).
//
//   POST /rum      real-user Web Vitals sent by the site (no cookies, no personal data)
//   GET  /summary  RUM, uptime and incidents for the site's Site health page (precomputed)
//   cron           every 10 minutes: check the site's addresses and evaluate goals; once an hour:
//                  precompute the 7- and 30-day summaries, check the daily write guard, prune
//
// Goals: Google's "good" Web Vitals thresholds at the 75th percentile, and the site answering.
//
// Built for Cloudflare's free plan: heavy work (percentiles, grouping) runs in D1's SQL so the
// Worker stays within its small CPU allowance; the page reads one precomputed row per visit; and
// collection pauses for the day before D1's free daily write allowance is reached.

// [good up to, poor from]
const THRESHOLDS = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };
const MAX_VALUE = { LCP: 120000, INP: 60000, CLS: 50, FCP: 120000, TTFB: 120000 };
const METRICS = Object.keys(THRESHOLDS);
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime/i;
const DAY = 86400000;
const MIN_PUBLIC_COUNT = 5;      // countries with fewer page views are grouped as "other" in the public summary
const HOUR = 3600000;
const DAILY_WRITE_GUARD = 80000; // rows/day; D1's free plan allows 100,000 written rows a day

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

  // Daily write guard (set by the hourly run): stop storing until tomorrow (UTC).
  const paused = await env.DB.prepare("SELECT value FROM meta WHERE key = 'paused_until'").first('value');
  if (paused && Number(paused) > now) return new Response(null, { status: 204, headers: cors });

  const rows = (Array.isArray(body.m) ? body.m : []).slice(0, 10).filter((m) =>
    m && METRICS.includes(m.n) && typeof m.v === 'number' && Number.isFinite(m.v) && m.v >= 0 && m.v <= MAX_VALUE[m.n]);
  if (!page || !rows.length) return new Response(null, { status: 204, headers: cors });

  const insert = env.DB.prepare('INSERT INTO rum (ts, page, metric, value, rating, device, country, variant, host) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  // Data minimization: times are stored to the hour, enough for daily charts and 24-hour goals.
  const hour = Math.floor(now / HOUR) * HOUR;
  await env.DB.batch(rows.map((m) => insert.bind(hour, page, m.n, round(m.v, m.n === 'CLS' ? 4 : 0), rate(m.n, m.v), device, country, variant, host)));
  return new Response(null, { status: 204, headers: cors });
}

function cleanPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/')) return null;
  return p.split(/[?#]/)[0].replace(/[^A-Za-z0-9/._~-]/g, '').slice(0, 120) || '/';
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const rate = (metric, v) => (v <= THRESHOLDS[metric][0] ? 'good' : v <= THRESHOLDS[metric][1] ? 'needs-improvement' : 'poor');

// ---- Summary for the Site health page ----

async function summary(url, env, ctx, cors) {
  const days = url.searchParams.get('days') === '30' ? 30 : 7;
  let row = await env.DB.prepare('SELECT json FROM summaries WHERE days = ?').bind(days).first();
  if (!row) { // first visit before the hourly run: compute once and store
    await storeSummaries(env);
    row = await env.DB.prepare('SELECT json FROM summaries WHERE days = ?').bind(days).first();
  }
  return new Response(row?.json ?? '{}', { headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
}

async function storeSummaries(env) {
  const now = Date.now();
  const stmts = [];
  for (const days of [7, 30]) {
    const body = await computeSummary(env, days, now);
    stmts.push(env.DB.prepare('INSERT INTO summaries (days, ts, json) VALUES (?, ?, ?) ON CONFLICT(days) DO UPDATE SET ts = excluded.ts, json = excluded.json').bind(days, now, JSON.stringify(body)));
  }
  await env.DB.batch(stmts);
}

// Percentiles and rating shares are computed in SQL (window functions), grouped by `by`.
// p75 = the value at row ceil(0.75 × count) of each group, sorted.
const CTE = "WITH r AS (SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS day, page, metric, value, rating, device, variant, country FROM rum WHERE ts > ?1)";
const p75Sql = (by, where = '') => `${CTE} SELECT ${by}, value AS p75 FROM (SELECT ${by}, value, ROW_NUMBER() OVER (PARTITION BY ${by} ORDER BY value) AS rn, COUNT(*) OVER (PARTITION BY ${by}) AS cnt FROM r WHERE 1 = 1 ${where}) WHERE rn = (3 * cnt + 3) / 4`;
const shareSql = (by, where = '') => `${CTE} SELECT ${by}, COUNT(*) AS n, SUM(rating = 'good') AS good, SUM(rating = 'poor') AS poor FROM r WHERE 1 = 1 ${where} GROUP BY ${by}`;

async function computeSummary(env, days, now) {
  const since = now - days * DAY;
  const q = (sql) => env.DB.prepare(sql).bind(since);
  const groups = { all: ['metric', ''], device: ['device, metric', ''], variant: ['variant, metric', "AND page = '/' AND variant IS NOT NULL"] };
  const stmts = [];
  for (const [, [by, where]] of Object.entries(groups)) stmts.push(q(p75Sql(by, where)), q(shareSql(by, where)));
  stmts.push(
    q(p75Sql('day, metric', "AND metric IN ('LCP', 'INP', 'CLS')")),
    q(`${CTE} SELECT day, COUNT(*) AS views FROM r WHERE metric = 'TTFB' GROUP BY day`),
    q(`${CTE} SELECT page, COUNT(*) AS views FROM r WHERE metric = 'TTFB' GROUP BY page ORDER BY views DESC LIMIT 6`),
    q(p75Sql('page, metric', "AND metric = 'LCP'")),
    q(`${CTE} SELECT country, COUNT(*) AS views FROM r WHERE metric = 'TTFB' AND country IS NOT NULL AND country != 'XX' AND country != 'T1' GROUP BY country ORDER BY views DESC`),
    q('SELECT target, COUNT(*) AS checks, SUM(ok) AS ok, AVG(ms) AS avg FROM checks WHERE ts > ?1 GROUP BY target'),
    env.DB.prepare('SELECT target, ts, ok, status, ms FROM checks c WHERE ts = (SELECT MAX(ts) FROM checks WHERE target = c.target)'),
    q('SELECT kind, started, resolved, detail FROM incidents WHERE resolved IS NULL OR started > ?1 ORDER BY started DESC LIMIT 10'),
  );
  const res = (await env.DB.batch(stmts)).map((x) => x.results);

  // Merge p75 rows and share rows into { [key]: { [metric]: stat } }.
  const merge = (p75rows, shareRows, key) => {
    const out = {};
    for (const s of shareRows) {
      const k = key ? s[key] : '_';
      const p = p75rows.find((x) => x.metric === s.metric && (!key || x[key] === s[key]))?.p75 ?? null;
      (out[k] ??= {})[s.metric] = { n: s.n, p75: p, rating: p == null ? null : rate(s.metric, p), good: s.good / s.n, needs: (s.n - s.good - s.poor) / s.n, poor: s.poor / s.n };
    }
    return out;
  };
  const [allP, allS, devP, devS, varP, varS, dayP, dayViews, topPages, pageP, byCountry, upAgg, upLast, incidents] = res;
  const metrics = merge(allP, allS, null)._ ?? {};
  const dayList = [...new Set(dayP.map((x) => x.day))].sort();
  return {
    generated: now, days, thresholds: THRESHOLDS,
    views: metrics.TTFB?.n ?? 0,
    metrics,
    devices: merge(devP, devS, 'device'),
    variants: merge(varP, varS, 'variant'),
    daily: dayList.map((day) => ({
      day,
      LCP: dayP.find((x) => x.day === day && x.metric === 'LCP')?.p75 ?? null,
      INP: dayP.find((x) => x.day === day && x.metric === 'INP')?.p75 ?? null,
      CLS: dayP.find((x) => x.day === day && x.metric === 'CLS')?.p75 ?? null,
      views: dayViews.find((x) => x.day === day)?.views ?? 0,
    })),
    pages: topPages.map((p) => ({ page: p.page, views: p.views, LCP: pageP.find((x) => x.page === p.page)?.p75 ?? null })),
    // Page views by country (two-letter codes from Cloudflare; XX = unknown and T1 = Tor are left out).
    // Countries with fewer than MIN_PUBLIC_COUNT page views are grouped so no single visitor stands out.
    countries: [
      ...byCountry.filter((c) => c.views >= MIN_PUBLIC_COUNT).map((c) => ({ country: c.country, views: c.views })),
      ...(() => { const n = byCountry.filter((c) => c.views < MIN_PUBLIC_COUNT).reduce((t, c) => t + c.views, 0); return n ? [{ country: 'other', views: n }] : []; })(),
    ],
    uptime: upAgg.map((u) => {
      const last = upLast.find((x) => x.target === u.target);
      return { target: u.target, checks: u.checks, uptime: u.ok / u.checks, avgMs: Math.round(u.avg || 0), last: last ? { ts: last.ts, ok: !!last.ok, status: last.status, ms: last.ms } : null };
    }),
    incidents,
  };
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
  const { results: p24 } = await env.DB.prepare(p75Sql('metric', "AND metric IN ('LCP', 'INP', 'CLS')").replace('SELECT metric, value AS p75', 'SELECT metric, value AS p75, cnt')).bind(now - DAY).all();
  for (const m of ['LCP', 'INP', 'CLS']) {
    const row = p24.find((x) => x.metric === m);
    if (!row || row.cnt < 20) continue; // too few visits to judge
    const p = row.p75;
    const slow = p > THRESHOLDS[m][0];
    await incident(env, `slow:${m}`, slow, now, `${m} p75 ${m === 'CLS' ? p.toFixed(3) : `${Math.round(p)} ms`} over the last 24 hours (goal ≤ ${THRESHOLDS[m][0]}${m === 'CLS' ? '' : ' ms'})`, !slow);
  }

  // 3. Once an hour (and on the very first run): summaries, write guard, retention.
  const hourly = new Date(now).getUTCMinutes() < 10 || !(await env.DB.prepare('SELECT 1 FROM summaries LIMIT 1').first());
  if (!hourly) return;
  await storeSummaries(env);
  const startOfDay = Math.floor(now / DAY) * DAY;
  const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM rum WHERE ts >= ?').bind(startOfDay).first('n');
  if (today >= DAILY_WRITE_GUARD) {
    await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('paused_until', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(startOfDay + DAY)).run();
  }
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
