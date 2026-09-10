import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOrderedFriendIds, normalizeSearchQuery } from '../src/services/FriendDB.ts';

describe('FriendDB & Friend Management', () => {
  it('strictly orders user IDs so that user_id_1 < user_id_2', () => {
    const idA = 'aaa-111';
    const idB = 'zzz-999';

    const order1 = sanitizeOrderedFriendIds(idA, idB);
    assert.equal(order1.user_id_1, idA);
    assert.equal(order1.user_id_2, idB);

    // Reverse input must produce the exact same order
    const order2 = sanitizeOrderedFriendIds(idB, idA);
    assert.equal(order2.user_id_1, idA);
    assert.equal(order2.user_id_2, idB);
    assert.ok(order2.user_id_1 < order2.user_id_2);
  });

  it('rejects creating a friendship with oneself', () => {
    assert.throws(() => {
      sanitizeOrderedFriendIds('user-123', 'user-123');
    }, /Cannot create friend relationship with self/);
  });

  it('normalizes search query correctly', () => {
    assert.equal(normalizeSearchQuery('  @Dzaky  '), 'dzaky');
    assert.equal(normalizeSearchQuery('@@@diky'), 'diky');
    assert.equal(normalizeSearchQuery('   '), '');
  });
});
