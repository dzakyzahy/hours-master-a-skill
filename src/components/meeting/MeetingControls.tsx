import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMicrophone, 
  faMicrophoneSlash, 
  faVideo, 
  faVideoSlash, 
  faDesktop, 
  faPhoneSlash, 
  faUsers, 
  faGear 
} from '@fortawesome/free-solid-svg-icons';

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
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '10px 20px',
        backgroundColor: 'var(--bg-panel)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-pill)',
        boxShadow: 'inset 0 1px 0 var(--border-highlight), 0 16px 36px -8px rgba(0, 0, 0, 0.45)',
        zIndex: 50,
      }}
    >
      {/* Participant Counter Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          marginRight: '8px',
        }}
      >
        <FontAwesomeIcon icon={faUsers} className="text-cyan" style={{ fontSize: '13px' }} />
        <span className="tabular-nums">{participantCount}/4</span>
      </div>

      {/* Mic Toggle */}
      <button
        className="btn"
        onClick={onToggleMic}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        style={{
          width: '44px',
          height: '44px',
          padding: 0,
          borderRadius: 'var(--radius-pill)',
          backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
          borderColor: isMuted ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)',
          color: isMuted ? '#f87171' : 'var(--text-main)',
        }}
      >
        <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} style={{ fontSize: '16px' }} />
      </button>

      {/* Camera Toggle */}
      <button
        className="btn"
        onClick={onToggleVideo}
        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        style={{
          width: '44px',
          height: '44px',
          padding: 0,
          borderRadius: 'var(--radius-pill)',
          backgroundColor: isVideoOff ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
          borderColor: isVideoOff ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)',
          color: isVideoOff ? '#f87171' : 'var(--text-main)',
        }}
      >
        <FontAwesomeIcon icon={isVideoOff ? faVideoSlash : faVideo} style={{ fontSize: '15px' }} />
      </button>

      {/* Screen Share Toggle */}
      <button
        className="btn"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        style={{
          width: '44px',
          height: '44px',
          padding: 0,
          borderRadius: 'var(--radius-pill)',
          backgroundColor: isScreenSharing ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)',
          borderColor: isScreenSharing ? 'var(--accent-cyan)' : 'var(--border-color)',
          color: isScreenSharing ? 'var(--accent-cyan)' : 'var(--text-main)',
        }}
      >
        <FontAwesomeIcon icon={faDesktop} style={{ fontSize: '15px' }} />
      </button>

      {/* Developer Mock Inspector Toggle */}
      {onToggleDevTools && (
        <button
          className="btn"
          onClick={onToggleDevTools}
          title="Toggle Mock Simulation Tools"
          style={{
            width: '44px',
            height: '44px',
            padding: 0,
            borderRadius: 'var(--radius-pill)',
            backgroundColor: showDevTools ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            borderColor: showDevTools ? 'var(--accent-purple)' : 'var(--border-color)',
            color: showDevTools ? 'var(--accent-purple)' : 'var(--text-muted)',
          }}
        >
          <FontAwesomeIcon icon={faGear} style={{ fontSize: '16px' }} />
        </button>
      )}

      {/* End Call / Leave Button */}
      <button
        className="btn"
        onClick={onLeave}
        title="Leave room"
        style={{
          padding: '0 18px',
          height: '44px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: '#dc2626',
          borderColor: '#ef4444',
          color: '#ffffff',
          fontWeight: 700,
          gap: '8px',
          marginLeft: '6px',
        }}
      >
        <FontAwesomeIcon icon={faPhoneSlash} style={{ fontSize: '15px' }} /> Leave
      </button>
    </div>
  );
}
