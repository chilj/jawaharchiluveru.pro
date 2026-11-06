-- More than one site: every measurement, incident and summary belongs to a site.
-- Existing data is the portfolio's.
ALTER TABLE rum ADD COLUMN site TEXT NOT NULL DEFAULT 'portfolio';
CREATE INDEX IF NOT EXISTS rum_site_ts ON rum (site, ts);
ALTER TABLE incidents ADD COLUMN site TEXT NOT NULL DEFAULT 'portfolio';
CREATE TABLE IF NOT EXISTS site_summaries (
  site TEXT NOT NULL,
  days INTEGER NOT NULL,
  ts INTEGER NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (site, days)
);
DROP TABLE IF EXISTS summaries;
