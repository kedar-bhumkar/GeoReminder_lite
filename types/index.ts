export interface Reminder {
  id: number;
  text: string;
  entity: string | null; // Semicolon-separated entities (e.g., "Target;CVS;Costco")
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderInput {
  text: string;
  entity?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ReminderContextType {
  reminders: Reminder[];
  loading: boolean;
  extractingEntity: boolean;
  addReminder: (text: string, entities?: string[]) => Promise<void>;
  updateReminder: (id: number, text: string, entities?: string[]) => Promise<void>;
  updateReminderEntities: (id: number, entities: string[]) => Promise<void>;
  deleteReminder: (id: number) => Promise<void>;
  toggleReminder: (id: number) => Promise<void>;
  refreshReminders: () => Promise<void>;
}
