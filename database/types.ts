// Shared database types
export interface DatabaseInterface {
  getAllReminders(): Promise<ReminderRow[]>;
  getReminder(id: number): Promise<ReminderRow | null>;
  createReminder(text: string, entity?: string | null): Promise<number>;
  updateReminder(id: number, text: string, entity?: string | null): Promise<void>;
  deleteReminder(id: number): Promise<void>;
  toggleReminder(id: number): Promise<void>;
}

export interface ReminderRow {
  id: number;
  text: string;
  entity: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
