-- Run once against your D1 database:
--   npx wrangler d1 execute cosmic-picnic-signups --file=schema.sql
-- For local dev:
--   npx wrangler d1 execute cosmic-picnic-signups --local --file=schema.sql

CREATE TABLE IF NOT EXISTS signups (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  meditate_answer TEXT,
  toning_answer   TEXT,
  taste_started   INTEGER NOT NULL DEFAULT 0,
  before_score    INTEGER,
  after_score     INTEGER,
  noticed_word    TEXT,
  referrer        TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
