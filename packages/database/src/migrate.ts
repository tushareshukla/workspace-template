import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/workspace.db';

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

// Create tables directly (for initial setup)
console.log('Running migrations...');

// Agents table
db.run(sql`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'idle' NOT NULL CHECK(status IN ('idle', 'working', 'waiting', 'offline')),
    total_tasks INTEGER DEFAULT 0 NOT NULL,
    completed_tasks INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    max_concurrent_tasks INTEGER DEFAULT 3 NOT NULL,
    openclaw_agent_id TEXT NOT NULL,
    last_active_at INTEGER,
    created_at INTEGER NOT NULL
  )
`);

// Tasks table
db.run(sql`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'inbox' NOT NULL CHECK(status IN ('inbox', 'assigned', 'in_progress', 'review', 'blocked', 'done', 'cancelled')),
    priority TEXT DEFAULT 'normal' NOT NULL CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
    column_order INTEGER DEFAULT 0 NOT NULL,
    assigned_agent_id TEXT REFERENCES agents(id),
    assigned_at INTEGER,
    openclaw_run_id TEXT,
    openclaw_session_key TEXT,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    source_channel TEXT DEFAULT 'ui' NOT NULL CHECK(source_channel IN ('ui', 'telegram', 'discord', 'slack', 'api')),
    outcome TEXT CHECK(outcome IN ('success', 'failed', 'cancelled')),
    output TEXT,
    tokens_used INTEGER DEFAULT 0 NOT NULL
  )
`);

// Task blocks table
db.run(sql`
  CREATE TABLE IF NOT EXISTS task_blocks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    question TEXT,
    resolved_at INTEGER,
    response TEXT,
    approved INTEGER,
    created_at INTEGER NOT NULL
  )
`);

// Task comments table
db.run(sql`
  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_from_agent INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Activities table
db.run(sql`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK(action IN (
      'task_created', 'task_assigned', 'task_started', 'task_completed',
      'task_failed', 'task_blocked', 'task_unblocked', 'task_cancelled',
      'comment_added', 'agent_spawned', 'status_changed'
    )),
    details TEXT,
    created_at INTEGER NOT NULL
  )
`);

// Output buffers table
db.run(sql`
  CREATE TABLE IF NOT EXISTS output_buffers (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL,
    content TEXT DEFAULT '' NOT NULL,
    last_seq INTEGER DEFAULT 0 NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Indexes
db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks(openclaw_run_id)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_activities_task ON activities(task_id)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id)`);
db.run(sql`CREATE INDEX IF NOT EXISTS idx_blocks_task ON task_blocks(task_id)`);

console.log('Migrations completed successfully!');

sqlite.close();
