import { supabase } from '../supabaseClient.ts';
import type { UserProfileSearchResult, OrderedFriendIds } from '../types/friends.ts';

/**
 * Ensures user_id_1 < user_id_2 alphabetically to satisfy the Supabase
 * check constraint: CHECK (user_id_1 < user_id_2) on public.friends table.
 */
export function sanitizeOrderedFriendIds(userA: string, userB: string): OrderedFriendIds {
  if (userA === userB) {
    throw new Error('Cannot create friend relationship with self');
  }
  return userA < userB
    ? { user_id_1: userA, user_id_2: userB }
    : { user_id_1: userB, user_id_2: userA };
}

/**
 * Sanitizes and normalizes the search query (strips leading @, trims, lowercases).
 */
export function normalizeSearchQuery(query: string): string {
  return query.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Searches registered users in Supabase profiles, with automatic exclusion of
 * the current user and already-connected friends, marking pending requests accurately.
 */
export async function searchRegisteredUsers(
  rawQuery: string,
  currentUserId: string,
  currentUsername: string,
  existingFriendIds: string[] = [],
  pendingReceiverIds: string[] = []
): Promise<UserProfileSearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return [];

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, total_hours, avatar_url, title, bio')
      .ilike('username', `%${query}%`)
      .limit(15);

    if (error) {
      console.warn('[FriendDB] Error searching profiles:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const friendIdSet = new Set(existingFriendIds);
    const pendingSet = new Set(pendingReceiverIds);
    const myName = currentUsername.toLowerCase().replace(/^@+/, '');

    return data
      .filter(profile => {
        if (!profile.id) return false;
        if (profile.id === currentUserId) return false;
        const profName = (profile.username || '').toLowerCase().replace(/^@+/, '');
        if (profName === myName) return false;
        return true;
      })
      .map(profile => ({
        id: profile.id,
        username: profile.username || 'Pengguna Skillo',
        email: profile.email,
        total_hours: profile.total_hours || 0,
        avatar_url: profile.avatar_url,
        title: profile.title,
        bio: profile.bio,
        isFriend: friendIdSet.has(profile.id),
        isPending: pendingSet.has(profile.id)
      }));
  } catch (err) {
    console.error('[FriendDB] Exception in searchRegisteredUsers:', err);
    return [];
  }
}

/**
 * Loads registered community users ordered alphabetically by username,
 * excluding the current user and connected friends.
 */
export async function loadCommunityProfiles(
  currentUserId: string,
  currentUsername: string,
  existingFriendIds: string[] = [],
  pendingReceiverIds: string[] = []
): Promise<UserProfileSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, total_hours, avatar_url, title, bio')
      .order('username', { ascending: true })
      .limit(30);

    if (error) {
      console.warn('[FriendDB] Error loading community profiles:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const friendIdSet = new Set(existingFriendIds);
    const pendingSet = new Set(pendingReceiverIds);
    const myName = currentUsername.toLowerCase().replace(/^@+/, '');

    return data
      .filter(profile => {
        if (!profile.id) return false;
        if (profile.id === currentUserId) return false;
        const profName = (profile.username || '').toLowerCase().replace(/^@+/, '');
        if (profName === myName) return false;
        if (friendIdSet.has(profile.id)) return false;
        return true;
      })
      .map(profile => ({
        id: profile.id,
        username: profile.username || 'Pengguna Skillo',
        email: profile.email,
        total_hours: profile.total_hours || 0,
        avatar_url: profile.avatar_url,
        title: profile.title,
        bio: profile.bio,
        isFriend: false,
        isPending: pendingSet.has(profile.id)
      }));
  } catch (err) {
    console.error('[FriendDB] Exception in loadCommunityProfiles:', err);
    return [];
  }
}
