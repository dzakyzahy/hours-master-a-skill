import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPolite, videoBitrateKbps, roomIsFull, MAX_PARTICIPANTS } from '../src/utils/webrtcNegotiation.ts';

describe('webrtcNegotiation', () => {
  it('assigns exactly one polite side for any pair', () => {
    const a = 'user_aaa';
    const b = 'user_bbb';
    assert.strictEqual(isPolite(a, b) !== isPolite(b, a), true, 'both sides must not agree on the same role');
  });

  it('lowers bitrate as the mesh grows', () => {
    assert.strictEqual(videoBitrateKbps(2), 800);
    assert.strictEqual(videoBitrateKbps(3), 500);
    assert.strictEqual(videoBitrateKbps(4), 350);
    assert.ok(videoBitrateKbps(4) < videoBitrateKbps(2));
  });

  it('caps the room at MAX_PARTICIPANTS', () => {
    assert.strictEqual(roomIsFull(0), false);
    assert.strictEqual(roomIsFull(MAX_PARTICIPANTS - 2), false);
    assert.strictEqual(roomIsFull(MAX_PARTICIPANTS - 1), true);
  });
});
