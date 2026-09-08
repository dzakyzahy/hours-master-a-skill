import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useCallSessionStore, type ActiveCallSession } from '../src/utils/callSession.ts';

describe('useCallSessionStore', () => {
  it('starts with no active session', () => {
    assert.strictEqual(useCallSessionStore.getState().session, null);
  });

  it('starts and ends a call session', () => {
    const session: ActiveCallSession = {
      roomId: 'dm_diky_zahy',
      withUser: 'zahy',
      callType: 'direct',
      startedAt: Date.now()
    };

    useCallSessionStore.getState().startSession(session);
    assert.deepStrictEqual(useCallSessionStore.getState().session, session);

    useCallSessionStore.getState().endSession();
    assert.strictEqual(useCallSessionStore.getState().session, null);
  });
});
