import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faWifi, 
  faShieldHalved, 
  faCopy, 
  faPhoneSlash, 
  faVideo, 
  faVideoSlash, 
  faMicrophone, 
  faMicrophoneSlash,
  faUsers,
  faCircleDot
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCallSignaling } from '../hooks/useCallSignaling';
import type { Participant } from '../types/meeting';

export function MeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams<{ roomId?: string }>();
  const { username, userId } = useStore();
  const { cancelOutgoingCall } = useCallSignaling();

  // Parse query params (HashRouter support)
  const searchParams = new URLSearchParams(location.search);
  const effectiveRoomId = roomId || 'focus-community';
  const callType: 'direct' | 'focus' = 
    (searchParams.get('type') as 'direct' | 'focus') || 
    (effectiveRoomId.startsWith('dm_') ? 'direct' : 'focus');
  const targetFriend = searchParams.get('with') || '';
  const isCaller = searchParams.get('isCaller') === 'true';

  // State
  const [hasJoined, setHasJoined] = useState<boolean>(callType === 'direct');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // WebRTC Hook - only connects when user has actually joined
  const { remoteParticipants } = useWebRTC(
    effectiveRoomId,
    userId || 'guest',
    username || 'Guest',
    isScreenSharing && screenStream ? screenStream : localStream,
    { isAudioMuted: isMuted, isVideoOff, isScreenSharing },
    { enabled: hasJoined }
  );

  // Request camera & mic on mount
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

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/mic access unavailable or denied (using avatar fallback):', err);
        setIsVideoOff(true);
      }
    }

    setupCamera();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // Update preview video srcObject if localStream changes
  useEffect(() => {
    if (previewVideoRef.current && localStream && !isVideoOff) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff, hasJoined]);

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
        toast.error("Screen sharing tidak didukung di perangkat ini.");
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

  // Leave Room / Cancel Call
  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    if (callType === 'direct') {
      if (isCaller && remoteParticipants.length === 0) {
        cancelOutgoingCall(effectiveRoomId);
      }
      navigate('/chat');
    } else {
      navigate('/');
    }
  };

  // Copy shareable link helper
  const handleCopyLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/$/, '');
    const query = callType === 'direct' && targetFriend ? `?type=direct&with=${encodeURIComponent(targetFriend)}` : '';
    const fullUrl = `${origin}${pathname}/#/meeting/${effectiveRoomId}${query}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl);
      toast.success('Tautan undangan disalin!');
    } else {
      toast.success(`Tautan: ${fullUrl}`);
    }
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

  // ==========================================
  // VIEW 1: PRE-JOIN SCREEN (LOBBY FOCUS ROOM)
  // ==========================================
  if (!hasJoined && callType === 'focus') {
    const userInitials = (username || 'U').substring(0, 2).toUpperCase();

    return (
      <div 
        className="no-drag"
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Top Header Navigation */}
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
            background: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-hairline)'
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/')}
            style={{ fontSize: '12.5px', padding: '6px 14px', gap: '6px', borderRadius: '8px' }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '12px' }} />
            <span>Kembali ke Beranda</span>
          </button>
          <ThemeSwitcher compact={true} />
        </header>

        {/* Center Lobby Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--surface-card)',
            borderRadius: '20px',
            border: '1px solid var(--border-hairline-strong)',
            padding: '28px 24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '56px'
          }}
        >
          {/* Room Header Info */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-primary)',
                background: 'var(--surface-input)',
                padding: '3px 10px',
                borderRadius: '9999px',
                marginBottom: '8px'
              }}
            >
              <FontAwesomeIcon icon={faUsers} style={{ fontSize: '10px' }} />
              Mastery Focus Room
            </span>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {roomId ? `Ruang: ${roomId}` : 'Ruang Kolaborasi Belajar'}
            </h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Periksa pratinjau kamera & mikrofon Anda sebelum bergabung dengan rekan tim.
            </p>
          </div>

          {/* Camera Preview Box */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '14px',
              backgroundColor: 'var(--surface-input)',
              border: '1px solid var(--border-hairline-strong)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}
          >
            {localStream && !isVideoOff ? (
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-card)',
                    border: '1.5px solid var(--border-hairline-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    fontFamily: 'Geist Mono, monospace',
                    color: 'var(--text-primary)'
                  }}
                >
                  {userInitials}
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-placeholder)', fontFamily: 'Geist, sans-serif' }}>
                  Kamera Dinonaktifkan
                </span>
              </div>
            )}

            {/* Quick In-Preview Media Toggles */}
            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: '9999px'
              }}
            >
              <button
                type="button"
                onClick={handleToggleMic}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={isMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
              >
                <FontAwesomeIcon icon={isMuted ? faMicrophoneSlash : faMicrophone} style={{ fontSize: '13px' }} />
              </button>

              <button
                type="button"
                onClick={handleToggleVideo}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title={isVideoOff ? "Nyalakan Kamera" : "Matikan Kamera"}
              >
                <FontAwesomeIcon icon={isVideoOff ? faVideoSlash : faVideo} style={{ fontSize: '13px' }} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setHasJoined(true)}
              style={{
                height: '46px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FontAwesomeIcon icon={faVideo} style={{ fontSize: '14px' }} />
              <span>Gabung Sekarang</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={handleCopyLink}
              style={{
                height: '40px',
                fontSize: '12.5px',
                borderRadius: '10px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--text-secondary)'
              }}
            >
              <FontAwesomeIcon icon={faCopy} style={{ fontSize: '12px' }} />
              <span>Salin Link Undangan Ruang</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW 2: OUTGOING CALL SCREEN (1-on-1 DIRECT CALL WAITING)
  // =========================================================
  if (callType === 'direct' && remoteParticipants.length === 0 && isCaller) {
    const friendInitials = (targetFriend || 'U').substring(0, 2).toUpperCase();

    return (
      <div 
        className="no-drag"
        style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Top bar info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--accent-primary)', fontSize: '12px' }} />
          <span>Panggilan Video Privat 1-on-1 (Terenkripsi E2E)</span>
        </div>

        {/* Center Calling Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-input)',
                border: '3px solid var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 700,
                fontFamily: 'Geist Mono, monospace',
                color: 'var(--text-primary)',
                boxShadow: '0 0 32px rgba(14, 165, 233, 0.35)'
              }}
            >
              {friendInitials}
            </div>
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '50%',
                border: '2px solid var(--accent-primary)',
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                opacity: 0.75
              }}
            />
          </div>

          <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
            @{targetFriend || 'Rekan'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 500 }}>
            <FontAwesomeIcon icon={faCircleDot} style={{ fontSize: '10px' }} />
            <span>Memanggil... Menunggu jawaban</span>
          </div>

          <button
            type="button"
            className="btn"
            onClick={handleCopyLink}
            style={{
              marginTop: '20px',
              fontSize: '11.5px',
              padding: '6px 14px',
              borderRadius: '8px',
              gap: '6px'
            }}
          >
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: '11px' }} />
            <span>Salin link panggilan jika rekan offline</span>
          </button>
        </div>

        {/* Cancel Call Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleLeave}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.45)'
            }}
            title="Batalkan Panggilan"
          >
            <FontAwesomeIcon icon={faPhoneSlash} style={{ fontSize: '20px' }} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Batalkan
          </span>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: ACTIVE MEETING ROOM / CALL GRID
  // ==========================================
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
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
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--surface-card)',
          backdropFilter: 'blur(16px)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button 
            type="button"
            className="btn" 
            onClick={handleLeave} 
            title={callType === 'direct' ? "Tinggalkan Panggilan" : "Keluar Ruangan"} 
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              background: 'var(--surface-input)', 
              border: '1px solid var(--border-hairline-strong)', 
              color: 'var(--text-primary)', 
              fontSize: '12px',
              fontWeight: 500,
              gap: '6px' 
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} /> Keluar
          </button>

          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {callType === 'direct' ? `Panggilan Privat • @${targetFriend || 'Rekan'}` : 'Mastery Focus Room'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontWeight: 500 }}>
                <FontAwesomeIcon icon={faWifi} style={{ fontSize: '10px' }} /> P2P Live
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '10px' }} /> E2E Encrypted
              </span>
              {callType === 'direct' && remoteParticipants.length > 0 && (
                <>
                  <span>•</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Terhubung</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicator, Share Link & Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            className="btn" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '11.5px', 
              fontWeight: 500, 
              gap: '6px', 
              borderRadius: '8px', 
              background: 'var(--surface-input)', 
              border: '1px solid var(--border-hairline-strong)', 
              color: 'var(--text-primary)' 
            }}
            onClick={handleCopyLink}
            title="Bagikan Tautan Ruang"
          >
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: '11px' }} />
            <span style={{ display: 'inline-block' }}>Bagikan Link</span>
          </button>
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* Main Video Arena */}
      <main
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {sharingParticipant ? (
          /* Screen Sharing Asymmetric Layout */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: window.innerWidth > 768 ? 'minmax(0, 1fr) 260px' : '1fr',
              gap: '16px',
            }}
          >
            <div style={{ height: '100%', minHeight: 0 }}>
              <VideoTile participant={sharingParticipant} isDominant />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: window.innerWidth > 768 ? 'column' : 'row',
                gap: '12px',
                overflowY: 'auto',
                height: '100%',
              }}
            >
              {displayParticipants
                .filter(p => p.id !== sharingParticipant.id)
                .map(p => (
                  <div key={p.id} style={{ height: '160px', flexShrink: 0 }}>
                    <VideoTile participant={p} />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          /* Adaptive Participants Grid */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gap: '16px',
              gridTemplateColumns:
                participantCount === 1
                  ? '1fr'
                  : participantCount === 2
                  ? (window.innerWidth > 640 ? 'repeat(2, 1fr)' : '1fr')
                  : 'repeat(2, 1fr)',
              gridTemplateRows:
                participantCount === 1
                  ? '1fr'
                  : participantCount === 2
                  ? (window.innerWidth > 640 ? '1fr' : 'repeat(2, 1fr)')
                  : 'repeat(2, 1fr)',
              maxWidth: participantCount === 1 ? '1060px' : '1400px',
              maxHeight: 'calc(100vh - 160px)',
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
          padding: '12px 16px 20px 16px',
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
    </div>
  );
}
