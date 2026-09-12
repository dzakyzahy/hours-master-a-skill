import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophoneSlash, faDesktop, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';
import type { Participant } from '../../types/meeting';
import { getAvatarDisplay } from '../../utils/profilePresets';

interface VideoTileProps {
  participant: Participant;
  isDominant?: boolean;
  isPiP?: boolean;
}

const QUALITY_BARS = { good: 3, fair: 2, poor: 1 } as const;
const QUALITY_COLOR = { good: '#34d399', fair: '#fbbf24', poor: '#f87171' } as const;
const QUALITY_LABEL = {
  good: 'Koneksi stabil',
  fair: 'Koneksi sedang',
  poor: 'Koneksi buruk'
} as const;

export function VideoTile({ participant, isDominant = false, isPiP = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Bind audio stream to dedicated persistent audio element for remote participants
  useEffect(() => {
    if (audioRef.current && participant.stream && !participant.isLocal) {
      if (audioRef.current.srcObject !== participant.stream) {
        audioRef.current.srcObject = participant.stream;
      }
      audioRef.current.muted = false;
      audioRef.current.play().catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('[VideoTile] Remote audio play caught:', err);
        }
      });
    }
  }, [participant.stream, participant.isLocal]);

  // Bind video stream to video element when video is on
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (participant.stream && !participant.isVideoOff) {
      if (video.srcObject !== participant.stream) {
        video.srcObject = participant.stream;
      }
      // Force properties on DOM node directly to bypass WebView autoplay restrictions
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('playsinline', 'true');
      
      if (video.paused) {
        video.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.warn('[VideoTile] Video play caught:', e);
          }
        });
      }
    } else {
      video.srcObject = null;
    }
  }, [participant.stream, participant.isVideoOff, participant.isLocal]);

  const initials = participant.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const avatarDisplay = getAvatarDisplay(participant.avatar, initials);

  const hasVideoTrack = Boolean(
    participant.stream && 
    participant.stream.getVideoTracks().length > 0
  );
  
  const shouldRenderVideo = hasVideoTrack && !participant.isVideoOff;

  return (
    <div
      className={participant.isSpeaking && !isPiP ? 'speaking-pulse' : ''}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: isPiP ? 0 : isDominant ? '240px' : 0,
        backgroundColor: isPiP ? '#000' : 'var(--surface-card)',
        borderRadius: isPiP ? 0 : '8px',
        overflow: 'hidden',
        border: isPiP
          ? 'none'
          : participant.isSpeaking
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--border-hairline-strong)',
        boxShadow: isPiP
          ? 'none'
          : participant.isSpeaking
          ? '0 0 0 3px rgba(14, 165, 233, 0.25), var(--shadow-md)'
          : 'var(--shadow-md)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dedicated persistent audio sink for remote participant - never destroyed when video toggles */}
      {!participant.isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={false}
          style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.001, pointerEvents: 'none' }}
        />
      )}

      {/* Actual Video Stream if Available & Video Enabled */}
      {shouldRenderVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            (e.target as HTMLVideoElement).play().catch(err => console.warn('Play on loaded metadata failed:', err));
          }}
          onCanPlay={(e) => {
            (e.target as HTMLVideoElement).play().catch(err => console.warn('Play on can play failed:', err));
          }}
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
              letterSpacing: 0,
              overflow: 'hidden',
            }}
          >
            {avatarDisplay.isCustomImage ? (
              <img
                src={avatarDisplay.imageUrl}
                alt={participant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          {participant.isSpeaking && !isPiP && (
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

      {/* Connection Quality Meter — remote peers only; we have no stats about ourselves. */}
      {!isPiP && !participant.isLocal && participant.quality && (
        <div
          title={QUALITY_LABEL[participant.quality]}
          aria-label={QUALITY_LABEL[participant.quality]}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            display: 'flex',
            alignItems: 'flex-end',
            gap: '2px',
            height: '14px',
            padding: '4px 6px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(10, 14, 23, 0.65)',
            backdropFilter: 'blur(12px)',
            boxSizing: 'content-box',
          }}
        >
          {[5, 9, 13].map((barHeight, index) => (
            <span
              key={barHeight}
              style={{
                width: '3px',
                height: `${barHeight}px`,
                borderRadius: '1px',
                backgroundColor: index < QUALITY_BARS[participant.quality!]
                  ? QUALITY_COLOR[participant.quality!]
                  : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      )}

      {/* Screen Sharing Indicator Badge */}
      {!isPiP && participant.isScreenSharing && (
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
      {!isPiP && (
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
      )}
    </div>
  );
}
