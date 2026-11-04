-- Summaries the agent precomputes once an hour (the Site health page reads one row per visit),
-- and small settings such as the daily write guard.
CREATE TABLE IF NOT EXISTS summaries (
  days INTEGER PRIMARY KEY,     -- 7 or 30
  ts INTEGER NOT NULL,
  json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
