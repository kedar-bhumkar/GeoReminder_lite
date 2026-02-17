import { DatabaseInterface, ReminderRow } from './types';

// Web implementation using localStorage
class WebDatabase implements DatabaseInterface {
  private storageKey = 'georeminder_data';

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    const data = localStorage.getItem(this.storageKey);
    if (!data) {
      localStorage.setItem(this.storageKey, JSON.stringify({ reminders: [], nextId: 1 }));
    }
  }

  private getData(): { reminders: ReminderRow[]; nextId: number } {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : { reminders: [], nextId: 1 };
  }

  private saveData(data: { reminders: ReminderRow[]; nextId: number }) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  async getAllReminders(): Promise<ReminderRow[]> {
    const data = this.getData();
    return data.reminders.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getReminder(id: number): Promise<ReminderRow | null> {
    const data = this.getData();
    return data.reminders.find(r => r.id === id) || null;
  }

  async createReminder(text: string, entity?: string | null): Promise<number> {
    const data = this.getData();
    const now = new Date().toISOString();
    const newReminder: ReminderRow = {
      id: data.nextId,
      text,
      entity: entity ?? null,
      latitude: null,
      longitude: null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    };
    data.reminders.push(newReminder);
    data.nextId++;
    this.saveData(data);
    return newReminder.id;
  }

  async updateReminder(id: number, text: string, entity?: string | null): Promise<void> {
    const data = this.getData();
    const index = data.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      data.reminders[index].text = text;
      data.reminders[index].entity = entity ?? null;
      data.reminders[index].updated_at = new Date().toISOString();
      this.saveData(data);
    }
  }

  async deleteReminder(id: number): Promise<void> {
    const data = this.getData();
    data.reminders = data.reminders.filter(r => r.id !== id);
    this.saveData(data);
  }

  async toggleReminder(id: number): Promise<void> {
    const data = this.getData();
    const index = data.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      data.reminders[index].is_active = data.reminders[index].is_active === 1 ? 0 : 1;
      data.reminders[index].updated_at = new Date().toISOString();
      this.saveData(data);
    }
  }
}

let dbInstance: DatabaseInterface | null = null;

export async function getDatabase(): Promise<DatabaseInterface> {
  if (!dbInstance) {
    dbInstance = new WebDatabase();
  }
  return dbInstance;
}

export type { DatabaseInterface, ReminderRow } from './types';
