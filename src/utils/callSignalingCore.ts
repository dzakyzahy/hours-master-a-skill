import type { CallSignal } from '../types/meeting';

export function shouldProcessCallSignal(
  signal: CallSignal | null | undefined,
  myId?: string | null,
  myUsername?: string | null
): boolean {
  if (!signal || !signal.type) return false;

  const currentId = (myId || '').trim();
  const currentName = (myUsername || '').trim().toLowerCase().replace(/^@+/, '');

  const targetId = (signal.receiverId || '').trim();
  const targetUser = (signal.receiverUsername || '').trim().toLowerCase().replace(/^@+/, '');

  const matchId = Boolean(currentId && targetId && currentId === targetId);
  const matchUsername = Boolean(currentName && targetUser && currentName === targetUser);

  return matchId || matchUsername;
}
