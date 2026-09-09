import { create } from 'zustand';

export interface ActiveCallSession {
  roomId: string;
  withUser: string;
  callType: 'direct' | 'focus';
  startedAt: number;
}

interface CallSessionState {
  session: ActiveCallSession | null;
  activeStream: MediaStream | null;
  setActiveStream: (stream: MediaStream | null) => void;
  startSession: (session: ActiveCallSession) => void;
  endSession: () => void;
}

export const useCallSessionStore = create<CallSessionState>((set, get) => ({
  session: null,
  activeStream: null,
  setActiveStream: (stream) => set({ activeStream: stream }),
  startSession: (session) => set({ session }),
  endSession: () => {
    const stream = get().activeStream;
    if (stream) {
      try {
        stream.getTracks().forEach(t => t.stop());
      } catch {}
    }
    set({ session: null, activeStream: null });
  }
}));
