import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import { useCallSessionStore } from '../utils/callSession';
import { formatCallDuration } from '../utils/callQuality';
import { playCallEnd } from '../utils/audio';

export function ActiveCallBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, endSession } = useCallSessionStore();
  const [now, setNow] = useState(() => Date.now());

  // Hide inside any meeting room page or when no session is active
  const isInMeeting = location.pathname.startsWith('/meeting');

  // Track timer tick every second while call session is active
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session || isInMeeting) {
    return null;
  }

  const elapsed = Math.max(0, Math.floor((now - session.startedAt) / 1000));

  const cleanName = (session.withUser || 'Rekan').replace(/^@+/, '');

  const handleReturnToMeeting = () => {
    navigate(`/meeting/${session.roomId}?type=${session.callType}&with=${encodeURIComponent(cleanName)}&isCaller=false`);
  };

  const handleEndCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    playCallEnd();
    endSession();
  };

  return (
    <aside 
      onClick={handleReturnToMeeting}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        color: '#ffffff',
        padding: '10px 16px',
        boxShadow: '0 4px 16px rgba(5, 150, 105, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        userSelect: 'none',
        animation: 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      role="banner"
      aria-label="Panggilan Aktif"
    >
      {/* Left: Indicator & Partner info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {/* Pulsing Avatar/Icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1.5px solid rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              color: '#ffffff'
            }}
          >
            <FontAwesomeIcon icon={faVideo} />
          </div>
          {/* Pulsing dot */}
          <span 
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              border: '2px solid #ffffff',
              boxShadow: '0 0 8px #22c55e'
            }} 
          />
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cleanName}
            </span>
            <span 
              style={{
                fontSize: '11px',
                fontFamily: 'Geist Mono, monospace',
                fontWeight: 600,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '1px 6px',
                borderRadius: '4px'
              }}
            >
              {formatCallDuration(elapsed)}
            </span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px' }}>
            Ketuk untuk kembali ke panggilan
          </span>
        </div>
      </div>

      {/* Right: Quick Action (End Call Button, touch target >= 44x44px) */}
      <button
        type="button"
        onClick={handleEndCall}
        title="Akhiri Panggilan"
        aria-label="Akhiri Panggilan"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          transition: 'transform 0.1s ease',
          marginLeft: '8px'
        }}
      >
        <FontAwesomeIcon icon={faPhoneSlash} />
      </button>
    </aside>
  );
}
