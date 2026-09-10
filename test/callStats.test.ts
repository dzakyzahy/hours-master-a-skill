import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuality, deltaLossFraction } from '../src/utils/callStats.ts';

describe('callStats', () => {
  it('measures loss over the interval, not since the call started', () => {
    const previous = { packetsLost: 50, packetsReceived: 950, rttMs: 0 };
    const current = { packetsLost: 50, packetsReceived: 1950, rttMs: 0 };
    // 5% lifetime loss, but nothing lost in this interval.
    assert.strictEqual(deltaLossFraction(previous, current), 0);
  });

  it('reports loss in the current interval', () => {
    const previous = { packetsLost: 0, packetsReceived: 0, rttMs: 0 };
    const current = { packetsLost: 10, packetsReceived: 90, rttMs: 0 };
    assert.strictEqual(deltaLossFraction(previous, current), 0.1);
  });

  it('handles a first sample and a stalled stream without dividing by zero', () => {
    assert.strictEqual(deltaLossFraction(undefined, { packetsLost: 0, packetsReceived: 0, rttMs: 0 }), 0);
    const same = { packetsLost: 5, packetsReceived: 5, rttMs: 0 };
    assert.strictEqual(deltaLossFraction(same, same), 0);
  });

  it('grades on whichever of loss or latency is worse', () => {
    assert.strictEqual(classifyQuality(0, 40), 'good');
    assert.strictEqual(classifyQuality(0.03, 40), 'fair');
    assert.strictEqual(classifyQuality(0, 250), 'fair');
    assert.strictEqual(classifyQuality(0.08, 40), 'poor');
    assert.strictEqual(classifyQuality(0, 500), 'poor');
  });
});
