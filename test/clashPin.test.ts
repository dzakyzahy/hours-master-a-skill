import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getClashSummary, type ClashParticipant } from '../src/utils/clashSummary.ts';

describe('getClashSummary for ClashPinnedCard', () => {
  const participants: ClashParticipant[] = [
    { username: 'zahy', name: 'Zahy', totalHours: 150 },
    { username: 'diky', name: 'Diky', totalHours: 120 },
    { username: 'gg442', name: 'GG', totalHours: 80 }
  ];

  it('calculates rank and leader stats correctly for current user', () => {
    const summary = getClashSummary(participants, 'diky');

    assert.strictEqual(summary.myRank, 2);
    assert.strictEqual(summary.totalParticipants, 3);
    assert.strictEqual(summary.leader.username, 'zahy');
    assert.strictEqual(summary.isMeLeader, false);
    assert.strictEqual(summary.gapToLeader, 30); // 150 - 120
  });

  it('identifies when current user is the leader', () => {
    const summary = getClashSummary(participants, 'zahy');

    assert.strictEqual(summary.myRank, 1);
    assert.strictEqual(summary.isMeLeader, true);
    assert.strictEqual(summary.gapToLeader, 0);
  });

  it('handles empty or single participant gracefully', () => {
    const summary = getClashSummary([], 'diky');

    assert.strictEqual(summary.myRank, 1);
    assert.strictEqual(summary.totalParticipants, 0);
    assert.strictEqual(summary.gapToLeader, 0);
  });
});
