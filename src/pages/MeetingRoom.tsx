import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, UserPlus, UserMinus, Volume2, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import type { Participant } from '../types/meeting';

export function MeetingRoom() {
  const navigate = useNavigate();
  const { username } = useStore();

  const [, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  // Initial Local Participant
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: 'local-user',
      name: username || 'You',
      isAudioMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      isSpeaking: false,
      isLocal: true,
    },
  ]);

  const localStreamRef = useRef<MediaStream | null>(null);

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

        setParticipants(prev =>
          prev.map(p => (p.isLocal ? { ...p, stream, isVideoOff: false } : p))
        );
      } catch (err) {
        console.warn('Camera/mic access unavailable or denied (using avatar fallback):', err);
        setIsVideoOff(true);
        setParticipants(prev =>
          prev.map(p => (p.isLocal ? { ...p, isVideoOff: true } : p))
        );
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
      setParticipants(list =>
        list.map(p => (p.isLocal ? { ...p, isAudioMuted: next } : p))
      );
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
      setParticipants(list =>
        list.map(p => (p.isLocal ? { ...p, isVideoOff: next } : p))
      );
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        setIsScreenSharing(true);
        setParticipants(list =>
          list.map(p =>
            p.isLocal ? { ...p, isScreenSharing: true, stream: screenStream } : p
          )
        );

        const videoTrack = screenStream.getVideoTracks()?.[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            setParticipants(list =>
              list.map(p =>
                p.isLocal ? { ...p, isScreenSharing: false, stream: localStreamRef.current || undefined } : p
              )
            );
          };
        }
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      setIsScreenSharing(false);
      setParticipants(list =>
        list.map(p =>
          p.isLocal ? { ...p, isScreenSharing: false, stream: localStreamRef.current || undefined } : p
        )
      );
    }
  }, [isScreenSharing]);

  // Leave Room
  const handleLeave = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    navigate('/');
  };

  // Dev Tool Simulation Helpers (for testing without live signaling)
  const addMockPeer = () => {
    if (participants.length >= 4) return;
    const currentUsr = (username || '').toLowerCase();
    const candidatePeers = [
      { name: 'Zahy (Tech Lead)', usr: 'zahy' },
      { name: 'Diky (UI/UX)', usr: 'diky' },
      { name: 'Sarah (Designer)', usr: 'sarah' }
    ].filter(p => !p.usr.includes(currentUsr) && !currentUsr.includes(p.usr));

    const nextPeer = candidatePeers[participants.length - 1] || candidatePeers[0] || { name: `Peer ${participants.length}` };
    const newPeer: Participant = {
      id: `peer-${Date.now()}`,
      name: nextPeer.name,
      isAudioMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      isSpeaking: false,
      isLocal: false,
    };
    setParticipants(prev => [...prev, newPeer]);
  };

  const removeMockPeer = () => {
    if (participants.length <= 1) return;
    setParticipants(prev => prev.slice(0, prev.length - 1));
  };

  const toggleMockSpeaking = () => {
    if (participants.length <= 1) return;
    setParticipants(prev =>
      prev.map((p, idx) => (idx === 1 ? { ...p, isSpeaking: !p.isSpeaking } : p))
    );
  };

  const displayParticipants = participants.map(p => (p.isLocal ? { ...p, name: username || p.name } : p));
  // Find screen sharing participant if any
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
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-main)',
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
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-panel)',
          backdropFilter: 'var(--glass-blur)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn" onClick={handleLeave} title="Kembali ke Beranda" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={18} /> Exit
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Mastery Focus Room</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                <Wifi size={11} /> P2P Live
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} className="text-cyan" /> E2E Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
            <span className="tabular-nums">24 ms</span>
          </div>
        </div>
      </header>

      {/* Main Video Arena */}
      <main
        style={{
          flex: 1,
          padding: '20px',
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
              gap: '16px',
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
          /* Adaptive 1 - 4 Participants Grid */
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
                  ? 'repeat(2, 1fr)'
                  : 'repeat(2, 1fr)',
              gridTemplateRows:
                participantCount <= 2 ? '1fr' : 'repeat(2, 1fr)',
              maxWidth: participantCount === 1 ? '900px' : '1400px',
              maxHeight: '800px',
            }}
          >
            {displayParticipants.map(p => (
              <VideoTile key={p.id} participant={p} />
            ))}
          </div>
        )}

        {/* Solo Waiting Badge */}
        {participantCount === 1 && !sharingParticipant && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              backgroundColor: 'rgba(9, 13, 22, 0.85)',
              backdropFilter: 'var(--glass-blur)',
              padding: '8px 18px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-color)',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 10,
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
            Waiting for peers to join (Room link is ready)
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

      {/* Dev Tools Drawer (Quick testing harness for Diky) */}
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
            MOCK HARNESS:
          </span>
          <button className="btn" onClick={addMockPeer} disabled={participantCount >= 4} style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
            <UserPlus size={14} /> Add Peer
          </button>
          <button className="btn" onClick={removeMockPeer} disabled={participantCount <= 1} style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
            <UserMinus size={14} /> Remove Peer
          </button>
          <button className="btn" onClick={toggleMockSpeaking} disabled={participantCount <= 1} style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
            <Volume2 size={14} /> Toggle Speaking
          </button>
        </div>
      )}
    </div>
  );
}
