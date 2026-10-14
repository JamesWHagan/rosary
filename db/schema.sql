-- Decade4U database structure (Cloudflare D1 / SQLite).
-- Run once in the D1 console. Safe to run again: it only creates what is missing.

-- One row per shared intention.
CREATE TABLE IF NOT EXISTS intentions (
  id           TEXT PRIMARY KEY,                 -- random id
  name         TEXT NOT NULL DEFAULT 'Someone',  -- "Someone", a first name, or a description
  intention    TEXT NOT NULL,                    -- up to 300 characters
  thanks       TEXT NOT NULL DEFAULT '',         -- optional, up to 200 characters
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | hidden | retired
  care         INTEGER NOT NULL DEFAULT 0,       -- 1 = may be in crisis: always reviewed by a person
  prayed       INTEGER NOT NULL DEFAULT 0,       -- number of finished decades prayed for it
  owner        TEXT NOT NULL,                    -- hashed key of the device that shared it (never the raw key)
  moderation   TEXT NOT NULL DEFAULT '',         -- what the automatic checks decided, and why
  created_at   INTEGER NOT NULL,                 -- milliseconds since 1970
  approved_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_intentions_queue ON intentions (status, prayed, created_at);
CREATE INDEX IF NOT EXISTS idx_intentions_owner ON intentions (owner, created_at);

-- One row per finished decade. A device can pray for the same intention only once.
CREATE TABLE IF NOT EXISTS prayers (
  intention_id TEXT NOT NULL,
  device       TEXT NOT NULL,                    -- hashed device key
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (intention_id, device)
);
CREATE INDEX IF NOT EXISTS idx_prayers_time ON prayers (created_at);

-- Reports from people praying ("this intention is inappropriate").
CREATE TABLE IF NOT EXISTS reports (
  intention_id TEXT NOT NULL,
  device       TEXT NOT NULL,
  reason       TEXT NOT NULL DEFAULT '',
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (intention_id, device)
);
