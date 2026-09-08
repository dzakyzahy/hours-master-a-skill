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
});
