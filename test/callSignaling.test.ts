import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldProcessCallSignal } from '../src/utils/callSignalingCore.ts';

describe('callSignalingCore', () => {
  it('processes signal when receiverId matches current user ID', () => {
    const signal = {
      type: 'CALL_INVITE' as const,
      callerId: 'user_1',
      callerUsername: 'diky',
      receiverId: 'user_2',
      receiverUsername: 'zahy',
      roomId: 'dm_1_2',
      timestamp: Date.now()
    };

    assert.strictEqual(shouldProcessCallSignal(signal, 'user_2', 'zahy'), true);
  });

  it('processes signal when receiverUsername matches case-insensitively', () => {
    const signal = {
      type: 'CALL_INVITE' as const,
      callerId: 'user_1',
      callerUsername: 'diky',
      receiverId: 'some_other_id',
      receiverUsername: 'Zahy',
      roomId: 'dm_1_2',
      timestamp: Date.now()
    };

    assert.strictEqual(shouldProcessCallSignal(signal, 'user_999', 'zahy'), true);
    assert.strictEqual(shouldProcessCallSignal(signal, 'user_999', 'ZAHY'), true);
  });

  it('rejects signal meant for other users', () => {
    const signal = {
      type: 'CALL_INVITE' as const,
      callerId: 'user_1',
      callerUsername: 'diky',
      receiverId: 'user_3',
      receiverUsername: 'gg442',
      roomId: 'dm_1_3',
      timestamp: Date.now()
    };

    assert.strictEqual(shouldProcessCallSignal(signal, 'user_2', 'zahy'), false);
  });

  it('ignores invalid or empty signals', () => {
    assert.strictEqual(shouldProcessCallSignal(null as any, 'user_2', 'zahy'), false);
    assert.strictEqual(shouldProcessCallSignal({} as any, 'user_2', 'zahy'), false);
  });
});
