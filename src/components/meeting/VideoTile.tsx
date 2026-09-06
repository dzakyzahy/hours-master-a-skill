import { useEffect, useRef } from 'react';
import { MicOff, Monitor, Volume2 } from 'lucide-react';
import type { Participant } from '../../types/meeting';

interface VideoTileProps {
  participant: Participant;
  isDominant?: boolean;
}

export function VideoTile({ participant, isDominant = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const initials = participant.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={participant.isSpeaking ? 'speaking-pulse' : ''}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: isDominant ? '360px' : '180px',
        backgroundColor: '#0a0e17',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: participant.isSpeaking
          ? '1.5px solid var(--accent-cyan)'
          : '1px solid var(--border-color)',
        boxShadow: participant.isSpeaking
          ? '0 0 16px var(--accent-cyan-glow)'
          : 'inset 0 1px 0 var(--border-highlight), 0 8px 24px -4px rgba(0, 0, 0, 0.4)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Actual Video Stream if Available & Video Enabled */}
      {participant.stream && !participant.isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          style={{
            width: '100%',
            height: '100%',
            objectFit: participant.isScreenSharing ? 'contain' : 'cover',
            transform: participant.isLocal && !participant.isScreenSharing ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* Minimalist Avatar Fallback */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: isDominant ? '80px' : '56px',
              height: isDominant ? '80px' : '56px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-highlight)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isDominant ? '1.5rem' : '1.125rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '0.05em',
            }}
          >
            {initials}
          </div>
          {participant.isSpeaking && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <Volume2 size={12} /> Speaking
            </div>
          )}
        </div>
      )}

      {/* Screen Sharing Indicator Badge */}
      {participant.isScreenSharing && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'var(--glass-blur)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
          }}
        >
          <Monitor size={14} /> Screen Share
        </div>
      )}

      {/* Participant Name Tag & Audio Status */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'var(--glass-blur)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            border: participant.isSpeaking ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            maxWidth: '85%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{participant.name} {participant.isLocal ? '(You)' : ''}</span>
          {participant.isSpeaking && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
              <span className="sound-bar" style={{ animationDelay: '0ms' }} />
              <span className="sound-bar" style={{ animationDelay: '180ms' }} />
              <span className="sound-bar" style={{ animationDelay: '360ms' }} />
            </span>
          )}
        </div>

        {/* Audio Muted Indicator */}
        {participant.isAudioMuted && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Microphone muted"
          >
            <MicOff size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
