import { create } from 'zustand';

export interface ActiveCallSession {
  roomId: string;
  withUser: string;
  callType: 'direct' | 'focus';
  startedAt: number;
}

interface CallSessionState {
  session: ActiveCallSession | null;
  startSession: (session: ActiveCallSession) => void;
  endSession: () => void;
}

export const useCallSessionStore = create<CallSessionState>((set) => ({
  session: null,
  startSession: (session) => set({ session }),
  endSession: () => set({ session: null })
}));
