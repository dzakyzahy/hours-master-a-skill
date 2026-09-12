import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePresenceUpdates } from '../src/utils/presenceCore.ts';

describe('presence state', () => {
  it('treats the realtime presence snapshot as the cross-device source of truth', () => {
    assert.deepStrictEqual(
      derivePresenceUpdates(['Zahy', 'Nadia'], ['@zahy'], 1234),
      [
        { username: 'Zahy', isOnline: true, lastSeen: 1234 },
        { username: 'Nadia', isOnline: false, lastSeen: undefined },
      ]
    );
  });
});
