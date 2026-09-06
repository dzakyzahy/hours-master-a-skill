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
}

export interface MeetingRoomConfig {
  roomId: string;
  roomTitle: string;
  maxParticipants?: number;
}
