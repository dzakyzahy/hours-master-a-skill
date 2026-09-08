import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type Channel, type ScheduleOptions } from '@capacitor/local-notifications';

export const CALL_NOTIFICATION_ID = 1001;
export const CALL_CHANNEL_ID = 'skillo_calls';

export function cleanUsername(username?: string): string {
  return (username || 'Rekan').trim().replace(/^@+/, '');
}

export function buildCallNotificationChannel(): Channel {
  return {
    id: CALL_CHANNEL_ID,
    name: 'Panggilan Video Masuk',
    description: 'Notifikasi saat ada panggilan video masuk',
    importance: 5, // MAX importance (5) is required for heads-up banner on Android
    visibility: 1, // Public on lock screen
    vibration: true,
    lights: true
  };
}

export function buildIncomingCallNotification(rawCallerUsername: string, roomId: string) {
  const caller = cleanUsername(rawCallerUsername);
  return {
    id: CALL_NOTIFICATION_ID,
    title: '📞 Panggilan Video Masuk',
    body: `${caller} mengajak Anda bergabung ke panggilan video`,
    channelId: CALL_CHANNEL_ID,
    ongoing: true, // Keep notification visible while ringing
    autoCancel: false,
    extra: {
      roomId,
      callerUsername: caller
    }
  };
}

export async function setupCallNotificationChannel(plugin = LocalNotifications): Promise<void> {
  try {
    if (Capacitor.isNativePlatform() || typeof (plugin as any).createChannel === 'function') {
      await plugin.createChannel(buildCallNotificationChannel());
    }
  } catch (err) {
    console.warn('[callNotifications] Failed to create channel:', err);
  }
}

export async function requestCallNotificationPermissions(plugin = LocalNotifications): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    const check = await plugin.checkPermissions();
    if (check.display === 'granted') return true;
    const requested = await plugin.requestPermissions();
    return requested.display === 'granted';
  } catch (err) {
    console.warn('[callNotifications] Failed to request permissions:', err);
    return false;
  }
}

export async function showIncomingCallNotification(
  callerUsername: string,
  roomId: string,
  plugin = LocalNotifications
): Promise<void> {
  try {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative && typeof (plugin as any).schedule !== 'function') return;

    // Ensure channel exists first
    await setupCallNotificationChannel(plugin);

    const notif = buildIncomingCallNotification(callerUsername, roomId);
    const options: ScheduleOptions = {
      notifications: [notif]
    };
    await plugin.schedule(options);
  } catch (err) {
    console.warn('[callNotifications] Failed to show notification:', err);
  }
}

export async function clearIncomingCallNotification(plugin = LocalNotifications): Promise<void> {
  try {
    const isNative = Capacitor.isNativePlatform();
    if (!isNative && typeof (plugin as any).cancel !== 'function') return;

    await plugin.cancel({
      notifications: [{ id: CALL_NOTIFICATION_ID }]
    });
  } catch (err) {
    console.warn('[callNotifications] Failed to clear notification:', err);
  }
}
