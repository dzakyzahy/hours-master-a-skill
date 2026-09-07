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
        backgroundColor: 'rgba(15, 20, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        zIndex: 50,
      }}
    >
      {/* Participant Counter Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#e2e8f0',
          marginRight: '6px',
        }}
      >
        <FontAwesomeIcon icon={faUsers} style={{ color: 'var(--accent-cyan)', fontSize: '13px' }} />
        <span className="tabular-nums">{participantCount}/4</span>
      </div>

      {/* Mic Toggle */}
      <button
        type="button"
        className="btn"
        onClick={onToggleMic}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        style={{
          width: '46px',
          height: '46px',
          padding: 0,
          borderRadius: '50%',
          backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
          color: isMuted ? '#f87171' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} style={{ fontSize: '15px' }} />
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        className="btn"
        onClick={onToggleVideo}
        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        style={{
          width: '46px',
          height: '46px',
          padding: 0,
          borderRadius: '50%',
          backgroundColor: isVideoOff ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          border: isVideoOff ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
          color: isVideoOff ? '#f87171' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <FontAwesomeIcon icon={isVideoOff ? faVideoSlash : faVideo} style={{ fontSize: '15px' }} />
      </button>

      {/* Screen Share Toggle */}
      <button
        type="button"
        className="btn"
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        style={{
          width: '46px',
          height: '46px',
          padding: 0,
          borderRadius: '50%',
          backgroundColor: isScreenSharing ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
          border: isScreenSharing ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.15)',
          color: isScreenSharing ? 'var(--accent-cyan)' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <FontAwesomeIcon icon={faDesktop} style={{ fontSize: '15px' }} />
      </button>

      {/* Developer Mock Inspector Toggle */}
      {onToggleDevTools && (
        <button
          type="button"
          className="btn"
          onClick={onToggleDevTools}
          title="Toggle Mock Simulation Tools"
          style={{
            width: '46px',
            height: '46px',
            padding: 0,
            borderRadius: '50%',
            backgroundColor: showDevTools ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.08)',
            border: showDevTools ? '1px solid var(--accent-purple)' : '1px solid rgba(255, 255, 255, 0.15)',
            color: showDevTools ? 'var(--accent-purple)' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <FontAwesomeIcon icon={faGear} style={{ fontSize: '16px' }} />
        </button>
      )}

      {/* End Call / Leave Button */}
      <button
        type="button"
        className="btn"
        onClick={onLeave}
        title="Leave room"
        style={{
          padding: '0 20px',
          height: '46px',
          borderRadius: '9999px',
          backgroundColor: '#dc2626',
          border: '1px solid #ef4444',
          color: '#ffffff',
          fontWeight: 600,
          gap: '8px',
          marginLeft: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        <FontAwesomeIcon icon={faPhoneSlash} style={{ fontSize: '14px' }} /> Leave
      </button>
    </div>
  );
}
