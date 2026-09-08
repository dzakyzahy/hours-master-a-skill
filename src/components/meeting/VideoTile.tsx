import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophoneSlash, faDesktop, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';
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
        minHeight: isDominant ? '240px' : 0,
        backgroundColor: 'var(--surface-card)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: participant.isSpeaking
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--border-hairline-strong)',
        boxShadow: participant.isSpeaking
          ? '0 0 0 3px rgba(14, 165, 233, 0.25), var(--shadow-md)'
          : 'var(--shadow-md)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
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
              width: isDominant ? '80px' : '64px',
              height: isDominant ? '80px' : '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-hairline-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isDominant ? '1.5rem' : '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
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
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <FontAwesomeIcon icon={faVolumeHigh} style={{ fontSize: '11px' }} /> Speaking
            </div>
          )}
        </div>
      )}

      {/* Screen Sharing Indicator Badge */}
      {participant.isScreenSharing && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            backgroundColor: 'rgba(10, 14, 23, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '5px 12px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--accent-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}
        >
          <FontAwesomeIcon icon={faDesktop} style={{ fontSize: '12px' }} /> Screen Share
        </div>
      )}

      {/* Participant Name Tag & Audio Status */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(10, 14, 23, 0.85)',
            backdropFilter: 'blur(12px)',
            padding: '5px 14px',
            borderRadius: '9999px',
            border: participant.isSpeaking ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#ffffff',
            maxWidth: '85%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ color: '#ffffff' }}>{participant.name} {participant.isLocal ? '(You)' : ''}</span>
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
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              padding: '6px 10px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
            title="Microphone muted"
          >
            <FontAwesomeIcon icon={faMicrophoneSlash} style={{ fontSize: '12px' }} />
          </div>
        )}
      </div>
    </div>
  );
}
