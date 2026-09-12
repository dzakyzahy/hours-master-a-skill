import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Copy, Minimize2, ShieldCheck, Wifi } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import { useWebRTC } from '../hooks/useWebRTC';
import { enterCallPiP, addPiPListener, setCallPipEnabled } from '../utils/native';
import { clearIncomingCallNotification } from '../utils/callNotifications';
import { setGlobalActiveRoomId, addCallRoomEventListener, removeCallRoomEventListener, sendSignalGlobal } from '../hooks/useCallSignaling';
import { playCallEnd } from '../utils/audio';
import { useCallSessionStore } from '../utils/callSession';
import { resolveMeetingRoomId } from '../utils/meetingRoute';
import { createScreenShareBundle, type ScreenShareBundle } from '../utils/screenShare';
import type { Participant } from '../types/meeting';

export function MeetingRoom() {
  const location = useLocation();
  const { session } = useCallSessionStore();
  const isMeetingRoute = location.pathname.startsWith('/meeting/');
  const roomId = resolveMeetingRoomId(location.pathname, session?.roomId);

  if ((!isMeetingRoute && !session) || !roomId) return null;

  return <MeetingRoomInner isMeetingRoute={isMeetingRoute} roomId={roomId} />;
}

interface MeetingRoomInnerProps {
  isMeetingRoute: boolean;
  roomId: string;
}

function MeetingRoomInner({ isMeetingRoute, roomId }: MeetingRoomInnerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, userId, avatar } = useStore();
  const { startSession, endSession, setActiveStream } = useCallSessionStore();
  const [isInPiP, setIsInPiP] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [showDevTools, setShowDevTools] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenShareRef = useRef<ScreenShareBundle | null>(null);

  useEffect(() => {
    if (!isMeetingRoute) return;
    const current = useCallSessionStore.getState().session;
    if (current?.roomId === roomId) return;
    const searchParams = new URLSearchParams(location.search);
    startSession({
      roomId,
      withUser: searchParams.get('with') || 'Rekan',
      callType: searchParams.get('type') === 'direct' ? 'direct' : 'focus',
      startedAt: Date.now(),
    });
    clearIncomingCallNotification();
  }, [isMeetingRoute, roomId, location.search, startSession]);

  useEffect(() => {
    if (isMeetingRoute && roomId) {
      setCallPipEnabled(true);
      setGlobalActiveRoomId(roomId);
    } else {
      setCallPipEnabled(false);
      setIsInPiP(false);
      document.body.classList.remove('pip-mode');
      setGlobalActiveRoomId(null);
    }

    return () => {
      setCallPipEnabled(false);
      setGlobalActiveRoomId(null);
    };
  }, [isMeetingRoute, roomId]);

  useEffect(() => {
    const removeListener = addPiPListener(inPip => {
      if (!isMeetingRoute) {
        setIsInPiP(false);
        document.body.classList.remove('pip-mode');
        return;
      }
      setIsInPiP(inPip);
      document.body.classList.toggle('pip-mode', inPip);
    });
    return () => {
      removeListener();
      document.body.classList.remove('pip-mode');
    };
  }, [isMeetingRoute]);

  const activeStream = isScreenSharing && screenStream ? screenStream : localStream;

  useEffect(() => {
    setActiveStream(activeStream);
  }, [activeStream, setActiveStream]);

  const { remoteParticipants } = useWebRTC(
    roomId,
    userId || 'guest',
    username || 'Guest',
    activeStream,
    { isAudioMuted: isMuted, isVideoOff, isScreenSharing }
  );

  useEffect(() => {
    let active = true;

    async function setupMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsVideoOff(true);
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true,
          });
        } catch (cameraError) {
          console.warn('[meeting] Camera unavailable, trying audio only:', cameraError);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoOff(true);
        }

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        console.warn('[meeting] Camera and microphone unavailable:', err);
        setIsVideoOff(true);
        toast.error('Kamera atau mikrofon tidak dapat digunakan');
      }
    }

    setupMedia();
    return () => {
      active = false;
      screenShareRef.current?.cleanup();
      screenShareRef.current = null;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    };
  }, []);

  const handleToggleMic = useCallback(() => {
    setIsMuted(previous => {
      const next = !previous;
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const handleToggleVideo = useCallback(() => {
    setIsVideoOff(previous => {
      const next = !previous;
      localStreamRef.current?.getVideoTracks().forEach(track => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    const bundle = screenShareRef.current;
    screenShareRef.current = null;
    bundle?.cleanup();
    setScreenStream(null);
    setIsScreenSharing(false);
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia || !localStreamRef.current) {
      toast.error('Screen share tidak didukung di perangkat ini');
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        systemAudio: 'include',
        surfaceSwitching: 'include',
      } as DisplayMediaStreamOptions);
      const bundle = await createScreenShareBundle(localStreamRef.current, displayStream);
      screenShareRef.current = bundle;
      setScreenStream(bundle.stream);
      setIsScreenSharing(true);

      if (!bundle.hasDisplayAudio) {
        toast('Aktifkan "Bagikan audio" agar suara tab ikut terdengar');
      } else if (bundle.audioMode === 'display-only') {
        toast('Audio share aktif; mikrofon dijeda selama berbagi layar');
      }
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.onended = stopScreenShare;
    } catch (err) {
      console.warn('[meeting] Screen share cancelled or failed:', err);
    }
  }, [isScreenSharing, stopScreenShare]);

  const handleLeave = useCallback(() => {
    stopScreenShare();
    endSession();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    navigate('/');
  }, [endSession, navigate, stopScreenShare]);

  // Handle Call Signals (Rejected, Busy, Ended)
  useEffect(() => {
    const handleRoomEvent = (payload: any) => {
      if (payload.roomId !== roomId) return;
      
      if (payload.type === 'CALL_REJECTED') {
        toast('Panggilan ditolak');
        playCallEnd();
        handleLeave();
      } else if (payload.type === 'CALL_BUSY') {
        toast('Rekan sedang sibuk / dalam panggilan lain');
        playCallEnd();
        handleLeave();
      } else if (payload.type === 'CALL_ENDED') {
        toast('Panggilan diakhiri');
        playCallEnd();
        handleLeave();
      }
    };
    
    addCallRoomEventListener(handleRoomEvent);
    return () => {
      removeCallRoomEventListener(handleRoomEvent);
    };
  }, [roomId, handleLeave]);

  // Handle 35s timeout if no one joins
  useEffect(() => {
    if (remoteParticipants.length > 0) return;
    
    const timeout = setTimeout(() => {
      if (remoteParticipants.length === 0) {
        toast('Tidak ada jawaban');
        playCallEnd();
        
        // Send CANCELLED to stop ringing on the other side
        sendSignalGlobal({
          type: 'CALL_CANCELLED',
          callerId: userId || '',
          callerUsername: username || '',
          callerName: username || '',
          receiverId: '', // We don't know the exact target here, but broadcast works
          receiverUsername: '',
          roomId,
          timestamp: Date.now()
        });
        
        handleLeave();
      }
    }, 35000);
    
    return () => clearTimeout(timeout);
  }, [remoteParticipants.length, roomId, userId, username, handleLeave]);

  // Send CALL_CANCELLED or CALL_ENDED if user leaves manually
  const onUserLeave = useCallback(() => {
    if (remoteParticipants.length === 0) {
      sendSignalGlobal({
        type: 'CALL_CANCELLED',
        callerId: userId || '',
        callerUsername: username || '',
        callerName: username || '',
        receiverId: '',
        receiverUsername: '',
        roomId,
        timestamp: Date.now()
      });
    } else {
      sendSignalGlobal({
        type: 'CALL_ENDED',
        callerId: userId || '',
        callerUsername: username || '',
        callerName: username || '',
        receiverId: '',
        receiverUsername: '',
        roomId,
        timestamp: Date.now()
      });
    }
    handleLeave();
  }, [remoteParticipants.length, roomId, userId, username, handleLeave]);

  const handleCopyLink = useCallback(async () => {
    const baseUrl = 'https://hours-master-a-skill.vercel.app';
    const hash = `#/meeting/${roomId}${location.search || ''}`;
    const shareLink = window.location.href.startsWith('http') && !window.location.href.includes('localhost')
      ? window.location.href
      : `${baseUrl}/${hash}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link meeting disalin');
    } catch {
      toast.error('Link meeting tidak dapat disalin');
    }
  }, [roomId, location.search]);

  const localParticipant: Participant = useMemo(() => ({
    id: userId || 'local-user',
    name: username || 'Anda',
    avatar,
    isAudioMuted: isMuted,
    isVideoOff,
    isScreenSharing,
    isSpeaking: false,
    isLocal: true,
    stream: activeStream || undefined,
  }), [userId, username, avatar, isMuted, isVideoOff, isScreenSharing, activeStream]);

  const displayParticipants = useMemo(
    () => [localParticipant, ...remoteParticipants],
    [localParticipant, remoteParticipants]
  );
  const sharingParticipant = displayParticipants.find(participant => participant.isScreenSharing);
  const participantCount = displayParticipants.length;
  const primaryParticipant = sharingParticipant
    || remoteParticipants.find(participant => participant.stream)
    || remoteParticipants[0]
    || localParticipant;

  if (isInPiP && isMeetingRoute && roomId) {
    return (
      <div className="pip-fullscreen-arena">
        <VideoTile participant={primaryParticipant} isPiP />
        {!primaryParticipant.isLocal && (
          <div className="pip-local-preview">
            <VideoTile participant={localParticipant} isPiP />
          </div>
        )}
      </div>
    );
  }

  const gridClass = participantCount === 1
    ? 'meeting-grid-1'
    : participantCount === 2
      ? 'meeting-grid-2'
      : 'meeting-grid-multi';

  return (
    <section
      className="meeting-room-shell no-drag"
      aria-label="Ruang panggilan video"
      style={{ display: isMeetingRoute ? 'flex' : 'none' }}
    >
      <header className="meeting-call-header">
        <div className="meeting-header-actions">
          <button
            type="button"
            className="btn meeting-header-exit"
            onClick={onUserLeave}
            aria-label="Akhiri panggilan"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Keluar</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary meeting-pip-button"
            onClick={() => Capacitor.isNativePlatform() ? enterCallPiP() : navigate('/')}
            aria-label="Minimalkan panggilan"
          >
            <Minimize2 size={18} aria-hidden="true" />
            <span>PiP</span>
          </button>
        </div>

        <div className="meeting-title-block">
          <h1>Mastery Focus Room</h1>
          <div className="meeting-connection-meta">
            <span className="meeting-live-status"><Wifi size={13} aria-hidden="true" /> P2P Live</span>
            <span className="meeting-encryption"><ShieldCheck size={13} aria-hidden="true" /> Terenkripsi</span>
          </div>
        </div>

        <button
          type="button"
          className="btn meeting-copy-room"
          onClick={handleCopyLink}
          title="Salin link meeting"
          aria-label="Salin link meeting"
        >
          <Copy size={16} aria-hidden="true" />
          <span>{roomId}</span>
        </button>
      </header>

      <main className="meeting-video-stage">
        {sharingParticipant ? (
          <div className="meeting-share-layout">
            <div className="meeting-share-primary">
              <VideoTile participant={sharingParticipant} isDominant />
            </div>
            <div className="meeting-share-participants" aria-label="Peserta panggilan">
              {displayParticipants
                .filter(participant => participant.id !== sharingParticipant.id)
                .map(participant => (
                  <div className="meeting-share-participant" key={participant.id}>
                    <VideoTile participant={participant} />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className={`meeting-adaptive-grid ${gridClass}`}>
            {displayParticipants.map(participant => (
              <VideoTile key={participant.id} participant={participant} />
            ))}
          </div>
        )}

        {participantCount === 1 && !sharingParticipant && (
          <div className="meeting-waiting-status" role="status">
            <span aria-hidden="true" />
            Menunggu peserta lain
          </div>
        )}
      </main>

      <footer className="meeting-call-footer">
        <MeetingControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          participantCount={participantCount}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onLeave={onUserLeave}
          showDevTools={showDevTools}
          onToggleDevTools={() => setShowDevTools(value => !value)}
        />
      </footer>

      {showDevTools && (
        <div className="meeting-debug-panel">
          <strong>WebRTC</strong>
          <span>Peer terhubung: {remoteParticipants.length}</span>
        </div>
      )}
    </section>
  );
}
