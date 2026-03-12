import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(patientId: string): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const platform = Platform.OS as 'ios' | 'android';
  try {
    await api.patch(`/patients/${patientId}/push-token`, { token, platform });
  } catch {
    // ignore
  }
}

export function addNotificationResponseListener(
  onResponse: (data: { type?: string; appointmentId?: string }) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { type?: string; appointmentId?: string };
    if (data.type === 'appointment_reminder') onResponse({ type: 'appointments' });
    else if (data.type === 'exercise_reminder') onResponse({ type: 'exercises' });
    else if (data.type === 'transport_assigned') onResponse({ type: 'transport', appointmentId: data.appointmentId });
    else onResponse(data);
  });
}
