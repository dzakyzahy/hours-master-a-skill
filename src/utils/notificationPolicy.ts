export type ChatMessageKind = 'text' | 'call';

export function shouldShowChatSystemNotification(
  isAppVisible: boolean,
  messageKind: ChatMessageKind = 'text'
): boolean {
  return !isAppVisible && messageKind === 'text';
}

export function isAppVisible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}
