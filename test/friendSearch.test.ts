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

  it('searches registered users in Supabase without column 42703 errors', async () => {
    const { searchRegisteredUsers } = await import('../src/services/FriendDB.ts');
    const results = await searchRegisteredUsers(
      'zahy',
      'e2ce644a-dca1-4ae9-9c17-3ea852ba5428', // diky's id
      'diky',
      [],
      []
    );
    assert.ok(Array.isArray(results), 'Expected an array of results');
    assert.ok(results.length > 0, 'Expected at least one user found for query zahy');
    const foundZahy = results.find(u => u.username.toLowerCase() === 'zahy');
    assert.ok(foundZahy, 'Expected to find zahy');
    assert.equal(foundZahy?.isFriend, false);
    assert.equal(foundZahy?.isPending, false);
  });

  it('excludes self from search results', async () => {
    const { searchRegisteredUsers } = await import('../src/services/FriendDB.ts');
    const results = await searchRegisteredUsers(
      'zahy',
      '6b5525ce-a74a-42ee-a50a-0353bccd4d10', // zahy's own id
      'zahy',
      [],
      []
    );
    const foundSelf = results.find(u => u.username.toLowerCase() === 'zahy');
    assert.equal(foundSelf, undefined, 'Current user should not appear in their own search results');
  });

  it('loads community profiles without throwing error', async () => {
    const { loadCommunityProfiles } = await import('../src/services/FriendDB.ts');
    const results = await loadCommunityProfiles(
      'dummy-user-id',
      'dummy-username',
      [],
      []
    );
    assert.ok(Array.isArray(results), 'Expected array of community profiles');
    assert.ok(results.length > 0, 'Expected community profiles to contain registered users');
  });
});
