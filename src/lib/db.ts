import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Singleton to avoid multiple connections during dev hot-reload
const globalForDb = globalThis as unknown as { _db: Database.Database | undefined };

function createDb(): Database.Database {
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(path.join(DATA_DIR, "pussy-watch.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7c3aed'
    );

    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (household_id, user_id),
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cats (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      household_id TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🐱',
      notes TEXT,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sit_photos (
      id TEXT PRIMARY KEY,
      watch_request_id TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (watch_request_id) REFERENCES watch_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS watch_requests (
      id TEXT PRIMARY KEY,
      household_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      notes TEXT,
      watcher_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (watcher_id) REFERENCES users(id)
    );
  `);

  // One-time migration: add columns to users if missing
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some(c => c.name === "email")) {
    try { db.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch { /* already exists */ }
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL");
  }
  if (!userColumns.some(c => c.name === "is_superuser")) {
    try { db.exec("ALTER TABLE users ADD COLUMN is_superuser INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
    db.exec("UPDATE users SET is_superuser = 1 WHERE email = 'elund121@gmail.com'");
  }
  if (!userColumns.some(c => c.name === "avatar")) {
    try { db.exec("ALTER TABLE users ADD COLUMN avatar TEXT"); } catch { /* already exists */ }
  }

  // One-time migration: add created_by column to households if missing
  const householdColumns = db.prepare("PRAGMA table_info(households)").all() as { name: string }[];
  if (!householdColumns.some(c => c.name === "created_by")) {
    try { db.exec("ALTER TABLE households ADD COLUMN created_by TEXT"); } catch { /* already exists */ }
  }

  // One-time migration: add morning/evening watcher slots to watch_requests
  const watchColumns = db.prepare("PRAGMA table_info(watch_requests)").all() as { name: string }[];
  if (!watchColumns.some(c => c.name === "morning_watcher_id")) {
    db.exec("ALTER TABLE watch_requests ADD COLUMN morning_watcher_id TEXT");
  }
  if (!watchColumns.some(c => c.name === "evening_watcher_id")) {
    db.exec("ALTER TABLE watch_requests ADD COLUMN evening_watcher_id TEXT");
  }

  // One-time migration: add watch_slots table
  const tables = db.prepare("PRAGMA table_list").all() as { name: string }[];
  if (!tables.some(t => t.name === "watch_slots")) {
    db.exec(`CREATE TABLE watch_slots (
      id TEXT PRIMARY KEY,
      watch_request_id TEXT NOT NULL,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      watcher_id TEXT NOT NULL,
      FOREIGN KEY (watch_request_id) REFERENCES watch_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (watcher_id) REFERENCES users(id),
      UNIQUE (watch_request_id, date, slot)
    )`);
  }

  // One-time migration: add created_by and bio to cats
  const catColumns = db.prepare("PRAGMA table_info(cats)").all() as { name: string }[];
  if (!catColumns.some(c => c.name === "created_by")) {
    try { db.exec("ALTER TABLE cats ADD COLUMN created_by TEXT"); } catch { /* already exists */ }
  }
  if (!catColumns.some(c => c.name === "bio")) {
    try { db.exec("ALTER TABLE cats ADD COLUMN bio TEXT"); } catch { /* already exists */ }
  }
  if (!catColumns.some(c => c.name === "cover_photo_id")) {
    try { db.exec("ALTER TABLE cats ADD COLUMN cover_photo_id TEXT"); } catch { /* already exists */ }
  }

  // One-time migration: add cat_photos table
  if (!tables.some(t => t.name === "cat_photos")) {
    db.exec(`CREATE TABLE IF NOT EXISTS cat_photos (
      id TEXT PRIMARY KEY,
      cat_id TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    )`);
  }

  // Allowlist table
  db.exec(`CREATE TABLE IF NOT EXISTS allowed_emails (email TEXT PRIMARY KEY)`);
  db.prepare("INSERT OR IGNORE INTO allowed_emails (email) VALUES (?)").run("elund121@gmail.com");

  return db;
}

const db = globalForDb._db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb._db = db;

export default db;
