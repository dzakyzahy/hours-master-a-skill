export function resolveMeetingRoomId(pathname: string, sessionRoomId?: string | null): string | null {
  const match = pathname.match(/^\/meeting\/([^/?#]+)/);
  if (!match) return sessionRoomId || null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
