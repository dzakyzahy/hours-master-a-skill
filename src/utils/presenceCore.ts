export interface PresenceUpdate {
  username: string;
  isOnline: boolean;
  lastSeen?: number;
}

export function normalizePresenceKey(username: string): string {
  return username.trim().replace(/^@+/, '').toLowerCase();
}

export function derivePresenceUpdates(
  friendUsernames: string[],
  onlineUsernames: string[],
  now: number
): PresenceUpdate[] {
  const online = new Set(onlineUsernames.map(normalizePresenceKey));
  return friendUsernames.map(username => {
    const isOnline = online.has(normalizePresenceKey(username));
    return { username, isOnline, lastSeen: isOnline ? now : undefined };
  });
}
