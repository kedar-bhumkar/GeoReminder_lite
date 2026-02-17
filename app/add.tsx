import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useReminders } from '../contexts/ReminderContext';
import { ReminderForm } from '../components/ReminderForm';

export default function AddReminderScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { addReminder } = useReminders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (text: string, entities: string[]) => {
    setIsSubmitting(true);
    try {
      // If entities are provided manually, use them; otherwise let the context extract
      if (entities.length > 0) {
        await addReminder(text, entities);
      } else {
        await addReminder(text); // Will auto-extract entities
      }
      router.back();
    } catch (error) {
      console.error('Failed to add reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ReminderForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Add Reminder"
          isLoading={isSubmitting}
          showEntityEditor={true}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
