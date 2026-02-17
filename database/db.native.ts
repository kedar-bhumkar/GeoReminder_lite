import * as SQLite from 'expo-sqlite';
import { DatabaseInterface, ReminderRow } from './types';

// Native implementation using expo-sqlite
class NativeDatabase implements DatabaseInterface {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.db) return;

    this.db = await SQLite.openDatabaseAsync('georeminder.db');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        entity TEXT,
        latitude REAL,
        longitude REAL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async ensureDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  async getAllReminders(): Promise<ReminderRow[]> {
    const db = await this.ensureDb();
    return db.getAllAsync<ReminderRow>('SELECT * FROM reminders ORDER BY created_at DESC');
  }

  async getReminder(id: number): Promise<ReminderRow | null> {
    const db = await this.ensureDb();
    return db.getFirstAsync<ReminderRow>('SELECT * FROM reminders WHERE id = ?', [id]);
  }

  async createReminder(text: string, entity?: string | null): Promise<number> {
    const db = await this.ensureDb();
    const result = await db.runAsync(
      'INSERT INTO reminders (text, entity) VALUES (?, ?)',
      [text, entity ?? null]
    );
    return result.lastInsertRowId;
  }

  async updateReminder(id: number, text: string, entity?: string | null): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync(
      'UPDATE reminders SET text = ?, entity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [text, entity ?? null, id]
    );
  }

  async deleteReminder(id: number): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
  }

  async toggleReminder(id: number): Promise<void> {
    const db = await this.ensureDb();
    await db.runAsync(
      'UPDATE reminders SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }
}

let dbInstance: DatabaseInterface | null = null;

export async function getDatabase(): Promise<DatabaseInterface> {
  if (!dbInstance) {
    const nativeDb = new NativeDatabase();
    await nativeDb.initialize();
    dbInstance = nativeDb;
  }
  return dbInstance;
}

export type { DatabaseInterface, ReminderRow } from './types';
