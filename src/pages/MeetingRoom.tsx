import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faWifi, faShieldHalved, faCopy } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import { useWebRTC } from '../hooks/useWebRTC';
import type { Participant } from '../types/meeting';

export function MeetingRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const { username, userId } = useStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);

  // WebRTC Hook
  const { remoteParticipants } = useWebRTC(
    roomId || 'skillo-global-room',
    userId || 'guest',
    username || 'Guest',
    isScreenSharing && screenStream ? screenStream : localStream,
    { isAudioMuted: isMuted, isVideoOff, isScreenSharing }
  );

  // Request camera and microphone on mount with proper memory leak cleanup
  useEffect(() => {
    let active = true;

    async function setupCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active || !stream) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        setLocalStream(stream);
      } catch (err) {
        console.warn('Camera/mic access unavailable or denied (using avatar fallback):', err);
        setIsVideoOff(true);
      }
    }

    setupCamera();

    // Critical Cleanup Guard: Prevent memory leaks when leaving the room
    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // Toggle Mic
  const handleToggleMic = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => {
          t.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // Toggle Camera
  const handleToggleVideo = useCallback(() => {
    setIsVideoOff(prev => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          t.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // Toggle Screen Share
  const handleToggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Screen sharing is not supported on this device/browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setIsScreenSharing(true);
        setScreenStream(stream);

        const videoTrack = stream.getVideoTracks()?.[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
          };
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      setIsScreenSharing(false);
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
    }
  }, [isScreenSharing, screenStream]);

  // Leave Room
  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    navigate('/');
  };

  const localParticipant: Participant = {
    id: userId || 'local-user',
    name: username || 'You',
    isAudioMuted: isMuted,
    isVideoOff: isVideoOff,
    isScreenSharing: isScreenSharing,
    isSpeaking: false,
    isLocal: true,
    stream: (isScreenSharing && screenStream) ? screenStream : localStream || undefined,
  };

  const displayParticipants = [localParticipant, ...remoteParticipants];
  const sharingParticipant = displayParticipants.find(p => p.isScreenSharing);
  const participantCount = displayParticipants.length;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#090b10',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
      className="no-drag"
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(10, 13, 20, 0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            type="button"
            className="btn" 
            onClick={handleLeave} 
            title="Kembali ke Beranda" 
            style={{ 
              padding: '6px 14px', 
              borderRadius: '8px', 
              background: 'rgba(255, 255, 255, 0.08)', 
              border: '1px solid rgba(255, 255, 255, 0.15)', 
              color: '#ffffff', 
              fontSize: '12.5px',
              fontWeight: 500,
              gap: '6px' 
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '13px' }} /> Exit
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Mastery Focus Room
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontWeight: 500 }}>
                <FontAwesomeIcon icon={faWifi} style={{ fontSize: '10px' }} /> P2P Live
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '10px' }} /> E2E Encrypted
              </span>
              <span>•</span>
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link meeting disalin!');
                }}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.08)', 
                  border: '1px solid rgba(255, 255, 255, 0.15)', 
                  color: '#e2e8f0', 
                  cursor: 'pointer', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  transition: 'background 0.2s',
                  fontSize: '0.6875rem',
                  fontFamily: 'Geist Mono, monospace'
                }}
                title="Salin Link Room"
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                <FontAwesomeIcon icon={faCopy} style={{ fontSize: '10px' }} />
                {roomId || 'skillo-global-room'}
              </button>

              {participantCount === 1 && (
                <>
                  <span>•</span>
                  <span 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px', 
                      color: '#f59e0b', 
                      fontSize: '11px', 
                      fontWeight: 500,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                    Menunggu rekan bergabung
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button"
            className="btn" 
            style={{ 
              padding: '6px 14px', 
              fontSize: '12px', 
              fontWeight: 500,
              gap: '6px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff'
            }}
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              const btn = document.getElementById('copy-link-btn');
              if (btn) {
                const originalText = btn.innerText;
                btn.innerText = 'Tersalin!';
                setTimeout(() => { btn.innerText = originalText; }, 2000);
              }
            }}
            id="copy-link-btn"
          >
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: '12px' }} /> Salin Link ({roomId || 'Main'})
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#f8fafc'
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)' }} />
            <span className="tabular-nums">24 ms</span>
          </div>
        </div>
      </header>

      {/* Main Video Arena */}
      <main
        style={{
          flex: 1,
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {sharingParticipant ? (
          /* Screen Sharing Asymmetric Layout: Dominant Screen + Strip */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 280px',
              gap: '20px',
            }}
          >
            {/* Dominant Screen Share Tile */}
            <div style={{ height: '100%', minHeight: 0 }}>
              <VideoTile participant={sharingParticipant} isDominant />
            </div>

            {/* Side Column of Other Participants */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                overflowY: 'auto',
                height: '100%',
              }}
            >
              {displayParticipants
                .filter(p => p.id !== sharingParticipant.id)
                .map(p => (
                  <div key={p.id} style={{ height: '180px', flexShrink: 0 }}>
                    <VideoTile participant={p} />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          /* Adaptive 1 - 4 Participants Grid */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gap: '20px',
              gridTemplateColumns:
                participantCount === 1
                  ? '1fr'
                  : participantCount === 2
                  ? 'repeat(2, 1fr)'
                  : 'repeat(2, 1fr)',
              gridTemplateRows:
                participantCount <= 2 ? '1fr' : 'repeat(2, 1fr)',
              maxWidth: participantCount === 1 ? '1060px' : '1400px',
              maxHeight: 'calc(100vh - 170px)',
            }}
          >
            {displayParticipants.map(p => (
              <VideoTile key={p.id} participant={p} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Controls Dock */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 30,
        }}
      >
        <MeetingControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          participantCount={participantCount}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={handleLeave}
          showDevTools={showDevTools}
          onToggleDevTools={() => setShowDevTools(s => !s)}
        />
      </footer>

      {/* Dev Tools Drawer */}
      {showDevTools && (
        <div
          style={{
            position: 'absolute',
            bottom: '90px',
            backgroundColor: 'var(--bg-panel)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            zIndex: 60,
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
            WEBRTC DEBUG:
          </span>
          <span style={{ fontSize: '0.75rem' }}>Peers connected: {remoteParticipants.length}</span>
        </div>
      )}
    </div>
  );
}
