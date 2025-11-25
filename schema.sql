CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  verified INTEGER DEFAULT 0,
  verification_token TEXT,
  reset_token TEXT,
  reset_expiry INTEGER,
  failed_logins INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
