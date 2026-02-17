import { getDatabase } from './db';
import { ReminderRow } from './types';
import { Reminder } from '../types';

function rowToReminder(row: ReminderRow): Reminder {
  return {
    ...row,
    is_active: row.is_active === 1,
  };
}

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllReminders();
  return rows.map(rowToReminder);
}

export async function getReminder(id: number): Promise<Reminder | null> {
  const db = await getDatabase();
  const row = await db.getReminder(id);
  return row ? rowToReminder(row) : null;
}

export async function createReminder(text: string, entity?: string | null): Promise<number> {
  const db = await getDatabase();
  return db.createReminder(text, entity);
}

export async function updateReminder(id: number, text: string, entity?: string | null): Promise<void> {
  const db = await getDatabase();
  await db.updateReminder(id, text, entity);
}

export async function deleteReminder(id: number): Promise<void> {
  const db = await getDatabase();
  await db.deleteReminder(id);
}

export async function toggleReminder(id: number): Promise<void> {
  const db = await getDatabase();
  await db.toggleReminder(id);
}
