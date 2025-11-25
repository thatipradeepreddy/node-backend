import path from "path"
import os from "os"
import Database from "better-sqlite3"

const DEFAULT_DB = path.resolve(process.env.DB_PATH || path.join(os.homedir(), "Desktop", "mydb.db"))

export const DB_PATH = DEFAULT_DB

export const db = new Database(DB_PATH)

export function initDb() {
	const createUsers = `
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
  );`
	db.exec(createUsers)
}

export function closeDb() {
	try {
		db.close()
	} catch (e) {}
}
