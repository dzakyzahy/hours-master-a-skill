import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVideo, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import { useCallSignaling } from '../../hooks/useCallSignaling';

export function IncomingCallModal() {
  const navigate = useNavigate();
  const { incomingCall, acceptIncomingCall, rejectIncomingCall } = useCallSignaling();

  if (!incomingCall) return null;

  const callerInitials = (incomingCall.callerUsername || 'U').substring(0, 2).toUpperCase();

  const handleAccept = () => {
    const call = acceptIncomingCall();
    if (call) {
      navigate(`/meeting/${call.roomId}?type=direct&with=${encodeURIComponent(call.callerUsername)}&isCaller=false`);
    }
  };

  const handleReject = () => {
    rejectIncomingCall();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '340px',
          backgroundColor: 'var(--surface-card)',
          borderRadius: '24px',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-hairline-strong)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow halo behind avatar */}
        <div 
          style={{
            position: 'absolute',
            top: '20px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)',
            pointerEvents: 'none'
          }} 
        />

        {/* Pulsing Avatar */}
        <div style={{ position: 'relative', marginBottom: '18px' }}>
          <div 
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-input)',
              border: '2.5px solid var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'Geist Mono, monospace',
              color: 'var(--text-primary)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
            }}
          >
            {callerInitials}
          </div>
          <span 
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
              border: '2px solid var(--surface-card)'
            }} 
          />
        </div>

        {/* Call Info */}
        <span 
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 700,
            color: 'var(--color-success)',
            marginBottom: '6px'
          }}
        >
          Panggilan Video Masuk
        </span>
        <h3 
          id="incoming-call-title"
          style={{
            margin: '0 0 4px 0',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}
        >
          @{incomingCall.callerUsername}
        </h3>
        <p 
          style={{
            margin: '0 0 28px 0',
            fontSize: '12.5px',
            color: 'var(--text-secondary)'
          }}
        >
          Mengajak Anda bergabung ke sesi video privat 1-on-1
        </p>

        {/* Actions: Tolak & Terima */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%' }}>
          {/* Reject */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleReject}
              title="Tolak Panggilan"
              aria-label="Tolak Panggilan"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={faPhoneSlash} style={{ fontSize: '18px' }} />
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Tolak
            </span>
          </div>

          {/* Accept */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleAccept}
              title="Terima Panggilan"
              aria-label="Terima Panggilan"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(16, 185, 129, 0.45)',
                transition: 'transform 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={faVideo} style={{ fontSize: '18px' }} />
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
              Terima
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
