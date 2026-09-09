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

  it('stops activeStream tracks when endSession is called', () => {
    let stoppedTracksCount = 0;
    const fakeTrack = {
      stop: () => {
        stoppedTracksCount++;
      }
    };
    const fakeStream: any = {
      getTracks: () => [fakeTrack, fakeTrack]
    };

    useCallSessionStore.getState().setActiveStream(fakeStream);
    assert.strictEqual(useCallSessionStore.getState().activeStream, fakeStream);

    useCallSessionStore.getState().endSession();
    assert.strictEqual(useCallSessionStore.getState().session, null);
    assert.strictEqual(useCallSessionStore.getState().activeStream, null);
    assert.strictEqual(stoppedTracksCount, 2);
  });
});

