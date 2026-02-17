import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { FAB, Portal, Dialog, Button, Text, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter, useNavigation } from 'expo-router';
import { useReminders } from '../contexts/ReminderContext';
import { ReminderItem } from '../components/ReminderItem';
import { EmptyState } from '../components/EmptyState';
import { Reminder } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();

  // Add settings button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="cog"
          iconColor={theme.colors.onSurface}
          size={24}
          onPress={() => router.push('/settings')}
        />
      ),
    });
  }, [navigation, theme, router]);
  const { reminders, loading, deleteReminder, toggleReminder, refreshReminders } = useReminders();

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshReminders();
    setRefreshing(false);
  }, [refreshReminders]);

  const handleEdit = (id: number) => {
    router.push(`/edit/${id}`);
  };

  const handleDeletePress = (id: number) => {
    setReminderToDelete(id);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (reminderToDelete !== null) {
      await deleteReminder(reminderToDelete);
    }
    setDeleteDialogVisible(false);
    setReminderToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogVisible(false);
    setReminderToDelete(null);
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <ReminderItem
      reminder={item}
      onToggle={toggleReminder}
      onEdit={handleEdit}
      onDelete={handleDeletePress}
    />
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {reminders.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/add')}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={handleCancelDelete}>
          <Dialog.Title>Delete Reminder</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this reminder?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelDelete}>Cancel</Button>
            <Button onPress={handleConfirmDelete} textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
