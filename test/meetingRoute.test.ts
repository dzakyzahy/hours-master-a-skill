import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMeetingRoomId } from '../src/utils/meetingRoute.ts';

describe('meeting route', () => {
  it('uses the room id from the hash-router pathname', () => {
    assert.strictEqual(resolveMeetingRoomId('/meeting/focus-community', null), 'focus-community');
    assert.strictEqual(resolveMeetingRoomId('/meeting/dm_user_a_user_b', null), 'dm_user_a_user_b');
  });

  it('falls back to the active session outside the meeting route', () => {
    assert.strictEqual(resolveMeetingRoomId('/', 'dm_existing'), 'dm_existing');
  });
});
