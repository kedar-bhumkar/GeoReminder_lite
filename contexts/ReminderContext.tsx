import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Reminder, ReminderContextType } from '../types';
import * as reminderDb from '../database/reminders';
import { extractEntitiesFromReminder, entitiesToString } from '../services/entityExtractor';

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

interface ReminderProviderProps {
  children: ReactNode;
}

export function ReminderProvider({ children }: ReminderProviderProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [extractingEntity, setExtractingEntity] = useState(false);

  const refreshReminders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reminderDb.getAllReminders();
      setReminders(data);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addReminder = useCallback(async (text: string, entities?: string[]) => {
    setExtractingEntity(true);
    try {
      let entityString: string | null = null;

      if (entities && entities.length > 0) {
        // Use provided entities
        entityString = entitiesToString(entities);
      } else {
        // Extract entities using OpenAI
        const { entities: extractedEntities } = await extractEntitiesFromReminder(text);
        entityString = entitiesToString(extractedEntities);
      }

      // Create reminder with entities
      await reminderDb.createReminder(text, entityString || null);
      await refreshReminders();
    } catch (error) {
      console.error('Failed to add reminder:', error);
      // Still create the reminder without entity on error
      await reminderDb.createReminder(text, null);
      await refreshReminders();
    } finally {
      setExtractingEntity(false);
    }
  }, [refreshReminders]);

  const updateReminder = useCallback(async (id: number, text: string, entities?: string[]) => {
    setExtractingEntity(true);
    try {
      let entityString: string | null = null;

      if (entities !== undefined) {
        // Use provided entities (can be empty array to clear)
        entityString = entitiesToString(entities);
      } else {
        // Re-extract entities when text is updated
        const { entities: extractedEntities } = await extractEntitiesFromReminder(text);
        entityString = entitiesToString(extractedEntities);
      }

      await reminderDb.updateReminder(id, text, entityString || null);
      await refreshReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
      await reminderDb.updateReminder(id, text);
      await refreshReminders();
    } finally {
      setExtractingEntity(false);
    }
  }, [refreshReminders]);

  const updateReminderEntities = useCallback(async (id: number, entities: string[]) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (reminder) {
        const entityString = entitiesToString(entities);
        await reminderDb.updateReminder(id, reminder.text, entityString || null);
        await refreshReminders();
      }
    } catch (error) {
      console.error('Failed to update reminder entities:', error);
    }
  }, [reminders, refreshReminders]);

  const deleteReminder = useCallback(async (id: number) => {
    await reminderDb.deleteReminder(id);
    await refreshReminders();
  }, [refreshReminders]);

  const toggleReminder = useCallback(async (id: number) => {
    await reminderDb.toggleReminder(id);
    await refreshReminders();
  }, [refreshReminders]);

  useEffect(() => {
    refreshReminders();
  }, [refreshReminders]);

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        loading,
        extractingEntity,
        addReminder,
        updateReminder,
        updateReminderEntities,
        deleteReminder,
        toggleReminder,
        refreshReminders,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders(): ReminderContextType {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
}
