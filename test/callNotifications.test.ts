import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CALL_NOTIFICATION_ID,
  CALL_CHANNEL_ID,
  buildCallNotificationChannel,
  buildIncomingCallNotification,
  setupCallNotificationChannel,
  showIncomingCallNotification,
  clearIncomingCallNotification
} from '../src/utils/callNotifications.ts';

describe('callNotifications', () => {
  it('builds a high-importance channel for heads-up notifications', () => {
    const channel = buildCallNotificationChannel();
    assert.strictEqual(channel.id, CALL_CHANNEL_ID);
    assert.strictEqual(channel.importance, 5); // IMPORTANCE_HIGH (5) is required for heads-up
    assert.strictEqual(channel.visibility, 1); // Public lock screen
    assert.strictEqual(channel.vibration, true);
  });

  it('builds notification payload without @ prefix in body', () => {
    const notif = buildIncomingCallNotification('diky', 'room_123');
    assert.strictEqual(notif.id, CALL_NOTIFICATION_ID);
    assert.strictEqual(notif.channelId, CALL_CHANNEL_ID);
    assert.strictEqual(notif.ongoing, true);
    assert.strictEqual(notif.title, '📞 Panggilan Video Masuk');
    assert.ok(notif.body.includes('diky'));
    assert.ok(!notif.body.includes('@diky'), 'Should not contain @ prefix in username');
    assert.deepStrictEqual(notif.extra, { roomId: 'room_123', callerUsername: 'diky' });
  });

  it('strips leading @ if callerUsername has it', () => {
    const notif = buildIncomingCallNotification('@zahy', 'room_456');
    assert.ok(notif.body.includes('zahy'));
    assert.ok(!notif.body.includes('@zahy'));
    assert.strictEqual(notif.extra?.callerUsername, 'zahy');
  });

  it('sets up channel via plugin client', async () => {
    let createdChannel: any = null;
    const mockPlugin: any = {
      createChannel: async (ch: any) => {
        createdChannel = ch;
      }
    };

    await setupCallNotificationChannel(mockPlugin);
    assert.ok(createdChannel);
    assert.strictEqual(createdChannel.id, CALL_CHANNEL_ID);
    assert.strictEqual(createdChannel.importance, 5);
  });

  it('schedules notification and cancels it cleanly', async () => {
    let scheduled: any = null;
    let cancelled: any = null;

    const mockPlugin: any = {
      schedule: async (opts: any) => {
        scheduled = opts;
      },
      cancel: async (opts: any) => {
        cancelled = opts;
      }
    };

    await showIncomingCallNotification('diky', 'room_abc', mockPlugin);
    assert.ok(scheduled);
    assert.strictEqual(scheduled.notifications[0].id, CALL_NOTIFICATION_ID);
    assert.strictEqual(scheduled.notifications[0].channelId, CALL_CHANNEL_ID);

    await clearIncomingCallNotification(mockPlugin);
    assert.ok(cancelled);
    assert.deepStrictEqual(cancelled.notifications, [{ id: CALL_NOTIFICATION_ID }]);
  });

  it('includes smallIcon in incoming call notification for status bar display', () => {
    const notif = buildIncomingCallNotification('diky', 'room_xyz');
    assert.strictEqual(notif.smallIcon, 'ic_launcher');
  });

  it('builds chat notification channel with high importance', async () => {
    const { buildChatNotificationChannel, CHAT_CHANNEL_ID } = await import('../src/utils/callNotifications.ts');
    const channel = buildChatNotificationChannel();
    assert.strictEqual(channel.id, CHAT_CHANNEL_ID);
    assert.strictEqual(channel.importance, 4);
    assert.strictEqual(channel.visibility, 1);
  });

  it('builds chat message notification with smallIcon and message body', async () => {
    const { buildChatMessageNotification, CHAT_CHANNEL_ID, CHAT_NOTIFICATION_ID } = await import('../src/utils/callNotifications.ts');
    const notif = buildChatMessageNotification('zahy', 'Halo bro, ada tugas baru');
    assert.strictEqual(notif.id, CHAT_NOTIFICATION_ID);
    assert.strictEqual(notif.channelId, CHAT_CHANNEL_ID);
    assert.strictEqual(notif.title, '💬 Pesan dari zahy');
    assert.strictEqual(notif.body, 'Halo bro, ada tugas baru');
    assert.strictEqual(notif.smallIcon, 'ic_launcher');
    assert.strictEqual(notif.autoCancel, true);
  });

  it('builds missed call notification that is dismissible and has correct copy', async () => {
    const { buildMissedCallNotification, MISSED_CALL_NOTIFICATION_ID } = await import('../src/utils/callNotifications.ts');
    const notif = buildMissedCallNotification('diky');
    assert.strictEqual(notif.id, MISSED_CALL_NOTIFICATION_ID);
    assert.strictEqual(notif.title, '📵 Panggilan Tak Terjawab');
    assert.ok(notif.body.includes('diky'));
    assert.strictEqual(notif.ongoing, false, 'Missed call notification must NOT be ongoing (must be swipeable)');
    assert.strictEqual(notif.autoCancel, true, 'Missed call notification must autoCancel on tap');
    assert.strictEqual(notif.smallIcon, 'ic_launcher');
  });

  it('showMissedCallNotification cancels incoming call notification before scheduling missed call', async () => {
    const { showMissedCallNotification, CALL_NOTIFICATION_ID, MISSED_CALL_NOTIFICATION_ID } = await import('../src/utils/callNotifications.ts');
    let cancelledIds: number[] = [];
    let scheduledNotif: any = null;

    const mockPlugin: any = {
      cancel: async (opts: any) => {
        cancelledIds = opts.notifications.map((n: any) => n.id);
      },
      schedule: async (opts: any) => {
        scheduledNotif = opts.notifications[0];
      }
    };

    await showMissedCallNotification('diky', mockPlugin);
    assert.ok(cancelledIds.includes(CALL_NOTIFICATION_ID), 'Must cancel ongoing incoming call notification (1001)');
    assert.ok(scheduledNotif, 'Must schedule missed call notification');
    assert.strictEqual(scheduledNotif.id, MISSED_CALL_NOTIFICATION_ID);
    assert.strictEqual(scheduledNotif.ongoing, false);
  });
});


