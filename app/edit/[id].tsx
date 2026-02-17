import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTheme, ActivityIndicator, Text, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useReminders } from '../../contexts/ReminderContext';
import { ReminderForm } from '../../components/ReminderForm';
import { getReminder } from '../../database/reminders';
import { stringToEntities } from '../../services/entityExtractor';
import { Reminder } from '../../types';

export default function EditReminderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { updateReminder } = useReminders();

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReminder();
  }, [id]);

  const loadReminder = async () => {
    if (!id) {
      setError('Invalid reminder ID');
      setLoading(false);
      return;
    }

    try {
      const data = await getReminder(parseInt(id, 10));
      if (data) {
        setReminder(data);
      } else {
        setError('Reminder not found');
      }
    } catch (err) {
      console.error('Failed to load reminder:', err);
      setError('Failed to load reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (text: string, entities: string[]) => {
    if (!reminder) return;

    setIsSubmitting(true);
    try {
      // Always pass entities to preserve user edits
      await updateReminder(reminder.id, text, entities);
      router.back();
    } catch (err) {
      console.error('Failed to update reminder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !reminder) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
          {error || 'Reminder not found'}
        </Text>
        <Button mode="contained" onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const initialEntities = stringToEntities(reminder.entity);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ReminderForm
          initialValue={reminder.text}
          initialEntities={initialEntities}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Update Reminder"
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginTop: 16,
  },
});
