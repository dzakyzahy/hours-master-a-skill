import { Mic, MicOff, MonitorUp, PhoneOff, Settings, Users, Video, VideoOff } from 'lucide-react';
import { canScreenShare } from '../../utils/native';

interface MeetingControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  participantCount: number;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  showDevTools?: boolean;
  onToggleDevTools?: () => void;
}

export function MeetingControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  participantCount,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onLeave,
  showDevTools = false,
  onToggleDevTools,
}: MeetingControlsProps) {
  return (
    <div className="meeting-controls-dock" role="toolbar" aria-label="Kontrol panggilan">
      <div className="meeting-dock-chip" aria-label={`${participantCount} peserta`}>
        <Users size={18} aria-hidden="true" />
        <span className="tabular-nums">{participantCount}/4</span>
      </div>

      <button
        type="button"
        className={`meeting-control-button ${isMuted ? 'is-danger' : ''}`}
        onClick={onToggleMic}
        aria-label={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
        aria-pressed={isMuted}
      >
        {isMuted ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
      </button>

      <button
        type="button"
        className={`meeting-control-button ${isVideoOff ? 'is-danger' : ''}`}
        onClick={onToggleVideo}
        aria-label={isVideoOff ? 'Nyalakan kamera' : 'Matikan kamera'}
        aria-pressed={isVideoOff}
      >
        {isVideoOff ? <VideoOff size={20} aria-hidden="true" /> : <Video size={20} aria-hidden="true" />}
      </button>

      {canScreenShare && (
        <button
          type="button"
          className={`meeting-control-button meeting-control-desktop-only ${isScreenSharing ? 'is-active' : ''}`}
          onClick={onToggleScreenShare}
          aria-label={isScreenSharing ? 'Hentikan berbagi layar' : 'Bagikan layar'}
          aria-pressed={isScreenSharing}
        >
          <MonitorUp size={20} aria-hidden="true" />
        </button>
      )}

      {onToggleDevTools && (
        <button
          type="button"
          className={`meeting-control-button meeting-control-desktop-only ${showDevTools ? 'is-active' : ''}`}
          onClick={onToggleDevTools}
          aria-label="Buka diagnostik WebRTC"
          aria-pressed={showDevTools}
        >
          <Settings size={20} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        className="meeting-end-button"
        onClick={onLeave}
        aria-label="Akhiri panggilan"
      >
        <PhoneOff size={21} aria-hidden="true" />
        <span className="meeting-btn-text">Akhiri</span>
      </button>
    </div>
  );
}
