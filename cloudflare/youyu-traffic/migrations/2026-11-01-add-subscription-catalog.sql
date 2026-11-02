CREATE TABLE IF NOT EXISTS subscription_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  upload_bytes INTEGER,
  download_bytes INTEGER,
  total_bytes INTEGER,
  expires_at TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
