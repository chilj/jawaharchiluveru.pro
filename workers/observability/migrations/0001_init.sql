-- Real-user measurements: one row per Web Vitals metric reported by a page view.
CREATE TABLE IF NOT EXISTS rum (
  ts INTEGER NOT NULL,          -- unix ms
  page TEXT NOT NULL,           -- path only, no query string
  metric TEXT NOT NULL,         -- LCP | INP | CLS | FCP | TTFB
  value REAL NOT NULL,          -- ms (CLS: unitless)
  rating TEXT NOT NULL,         -- good | needs-improvement | poor
  device TEXT NOT NULL,         -- mobile | desktop
  country TEXT,                 -- from Cloudflare, two letters
  variant TEXT,                 -- A/B version on the home page, if any
  host TEXT                     -- which address served the page (main or backup)
);
CREATE INDEX IF NOT EXISTS rum_ts_metric ON rum (ts, metric);

-- Synthetic checks the agent runs on a schedule.
CREATE TABLE IF NOT EXISTS checks (
  ts INTEGER NOT NULL,
  target TEXT NOT NULL,
  ok INTEGER NOT NULL,
  status INTEGER,
  ms INTEGER
);
CREATE INDEX IF NOT EXISTS checks_ts ON checks (ts, target);

-- Goals the agent found missed (one open row per kind until it recovers).
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,           -- e.g. down:main, slow:LCP
  started INTEGER NOT NULL,
  resolved INTEGER,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS incidents_open ON incidents (kind, resolved);
