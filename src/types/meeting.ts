import type { CallQualityLevel } from '../utils/callStats';

export type CallType = 'direct' | 'focus';

export interface CallSignal {
  type: 'CALL_INVITE' | 'CALL_ACCEPTED' | 'CALL_REJECTED' | 'CALL_BUSY' | 'CALL_CANCELLED' | 'CALL_ENDED';
  callerId: string;
  callerUsername: string;
  callerName: string;
  receiverId: string;
  receiverUsername: string;
  roomId: string;
  timestamp: number;
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
  quality?: CallQualityLevel;
}

export interface MeetingRoomConfig {
  roomId: string;
  roomTitle: string;
  maxParticipants?: number;
}

