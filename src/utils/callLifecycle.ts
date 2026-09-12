export type NativeCallMode = 'off' | 'audio' | 'video';

export function getNativeCallMode(
  hasSession: boolean,
  hasStream: boolean,
  hasVideoTrack: boolean
): NativeCallMode {
  if (!hasSession || !hasStream) return 'off';
  return hasVideoTrack ? 'video' : 'audio';
}

export function isPipAllowed(
  isMeetingRoute: boolean,
  hasRoomId: boolean,
  isCallActive: boolean
): boolean {
  return Boolean(isMeetingRoute && hasRoomId && isCallActive);
}
