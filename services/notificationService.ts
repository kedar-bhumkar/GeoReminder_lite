import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MatchResult } from './locationMatcher';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('location-reminders', {
      name: 'Location Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BB86FC',
      sound: 'default',
    });
  }

  return true;
}

// Send a local notification for a location match
export async function sendLocationMatchNotification(match: MatchResult): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Near ${match.matchedPlace}`,
        body: match.reminderText,
        data: {
          reminderId: match.reminderId,
          matchedPlace: match.matchedPlace,
          matchedEntity: match.matchedEntity,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate notification
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return null;
  }
}

// Cancel a specific notification
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get notification permission status
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// Add listener for notification responses (when user taps notification)
export function addNotificationResponseListener(
  callback: (reminderId: number) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.reminderId) {
      callback(data.reminderId as number);
    }
  });
}

// Add listener for notifications received while app is foregrounded
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}
