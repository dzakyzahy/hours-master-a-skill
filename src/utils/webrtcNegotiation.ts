// Pure negotiation policy. No DOM, no side effects — unit-testable.

/** Mesh topology: each peer encodes (n-1) streams. Beyond 4 a mid-range phone drops frames. */
export const MAX_PARTICIPANTS = 4;

/**
 * Perfect negotiation requires exactly one side to be "polite" (yields on offer collision).
 * Derived from the two IDs so both sides agree without an extra round-trip.
 */
export function isPolite(localId: string, remoteId: string): boolean {
  return localId < remoteId;
}

/** Upload cost is (n-1) x bitrate, so the cap must fall as the room grows. */
export function videoBitrateKbps(participantCount: number): number {
  if (participantCount <= 2) return 800;
  if (participantCount === 3) return 500;
  return 350;
}

/** currentPeerCount excludes self. */
export function roomIsFull(currentPeerCount: number): boolean {
  return currentPeerCount + 1 >= MAX_PARTICIPANTS;
}
