-- Uptime totals per address and hour, kept up to date by every check. The Site health summaries read
-- these (at most 24 × 30 × targets small rows) instead of every raw check, which kept D1's daily
-- rows-read count low as the checks table grew.
CREATE TABLE IF NOT EXISTS checks_hourly (
  hour INTEGER NOT NULL,        -- unix ms, start of the hour (UTC)
  target TEXT NOT NULL,
  n INTEGER NOT NULL,           -- checks that hour
  ok INTEGER NOT NULL,          -- of which answered
  ms_sum INTEGER NOT NULL,      -- total response time, for the average
  PRIMARY KEY (hour, target)
);
INSERT OR IGNORE INTO checks_hourly (hour, target, n, ok, ms_sum)
  SELECT (ts / 3600000) * 3600000, target, COUNT(*), SUM(ok), SUM(COALESCE(ms, 0)) FROM checks GROUP BY 1, 2;
