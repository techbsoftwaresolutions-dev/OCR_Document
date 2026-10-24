import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.resolve(backendRoot, process.env.DATABASE_PATH || './storage/smartdoc.sqlite');
fs.mkdirSync(path.dirname(file), { recursive:true });
export const db = new DatabaseSync(file);
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, filename TEXT NOT NULL, mime TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'auto', status TEXT NOT NULL DEFAULT 'uploaded', text TEXT NOT NULL DEFAULT '', fields TEXT NOT NULL DEFAULT '{}', warnings TEXT NOT NULL DEFAULT '[]', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id,created_at);
CREATE TABLE IF NOT EXISTS profiles(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL DEFAULT 'New applicant', fields TEXT NOT NULL DEFAULT '{}', sources TEXT NOT NULL DEFAULT '{}', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,user_id INTEGER, action TEXT NOT NULL, entity_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
export const audit=(userId,action,entityId)=>db.prepare('INSERT INTO audit_events(user_id,action,entity_id) VALUES(?,?,?)').run(userId,action,entityId);

if (!db.prepare('PRAGMA table_info(documents)').all().some(column => column.name === 'upload_batch')) db.exec('ALTER TABLE documents ADD COLUMN upload_batch TEXT');
