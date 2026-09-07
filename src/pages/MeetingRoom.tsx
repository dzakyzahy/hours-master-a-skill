import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Wifi, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../supabaseClient';
import { VideoTile } from '../components/meeting/VideoTile';
import { MeetingControls } from '../components/meeting/MeetingControls';
import type { Participant } from '../types/meeting';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export function MeetingRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { username } = useStore();

  const [, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [myUserId, setMyUserId] = useState<string>('');

  const [participants, setParticipants] = useState<Participant[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    setParticipants([{
      id: 'local-user',
      name: username || 'You',
      isAudioMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      isSpeaking: false,
      isLocal: true,
    }]);
  }, [username]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const createPeer = useCallback((partnerId: string, stream: MediaStream, isInitiator: boolean, myId: string) => {
    const peer = new RTCPeerConnection(ICE_SERVERS);
    
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      setParticipants(prev => {
        const exists = prev.find(p => p.id === partnerId);
        if (exists) {
           return prev.map(p => p.id === partnerId ? { ...p, stream: event.streams[0] } : p);
        }
        return [...prev, {
          id: partnerId,
          name: 'Peer',
          isAudioMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isSpeaking: false,
          isLocal: false,
          stream: event.streams[0]
        }];
      });
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'candidate', candidate: JSON.stringify(event.candidate), from: myId, to: partnerId }
        });
      }
    };

    if (isInitiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: { type: 'offer', offer: JSON.stringify(offer), from: myId, to: partnerId }
          });
        }
      });
    }

    return peer;
  }, []);

  const handleSignalingData = useCallback(async (data: any, stream: MediaStream, myId: string) => {
    if (!data || data.from === myId) return;

    if (data.type === 'join') {
      const peer = createPeer(data.from, stream, true, myId);
      peersRef.current[data.from] = peer;
    }

    if (data.type === 'offer' && data.to === myId) {
      const peer = createPeer(data.from, stream, false, myId);
      peersRef.current[data.from] = peer;
      await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'answer', answer: JSON.stringify(answer), from: myId, to: data.from }
        });
      }
    }

    if (data.type === 'answer' && data.to === myId) {
      const peer = peersRef.current[data.from];
      if (peer) await peer.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
    }

    if (data.type === 'candidate' && data.to === myId) {
      const peer = peersRef.current[data.from];
      if (peer) await peer.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)));
    }

    if (data.type === 'leave') {
      const peer = peersRef.current[data.from];
      if (peer) {
        peer.close();
        delete peersRef.current[data.from];
        setParticipants(prev => prev.filter(p => p.id !== data.from));
      }
    }
  }, [createPeer]);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || (username ? `user_${username}` : `guest_${Date.now().toString(36)}`);
      if (!active) return;
      setMyUserId(uid);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, stream } : p));

        if (!roomId) return; // Mock mode if no roomId

        const channel = supabase.channel(`webrtc_${roomId}`);
        channelRef.current = channel;

        channel.on('broadcast', { event: 'webrtc_signal' }, (payload) => {
          handleSignalingData(payload.payload, stream, uid);
        });

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'join', from: uid }
            });
          }
        });

      } catch (err) {
        console.warn("Could not access camera/microphone:", err);
      }
    }

    init();

    return () => {
      active = false;
      cleanup();
    };
  }, [roomId, username, handleSignalingData, cleanup]);

  const handleToggleMic = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
      }
      setParticipants(list => list.map(p => p.isLocal ? { ...p, isAudioMuted: next } : p));
      return next;
    });
  }, []);

  const handleToggleVideo = useCallback(() => {
    setIsVideoOff(prev => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !next; });
      }
      setParticipants(list => list.map(p => p.isLocal ? { ...p, isVideoOff: next } : p));
      return next;
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
      setIsScreenSharing(false);
      setParticipants(list => list.map(p => p.isLocal ? { ...p, isScreenSharing: false, stream: localStreamRef.current || undefined } : p));
    }
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Screen sharing is not supported.");
        return;
      }
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setIsScreenSharing(true);
        setParticipants(list => list.map(p => p.isLocal ? { ...p, isScreenSharing: true, stream: screenStream } : p));

        screenTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.warn('Screen share cancelled', err);
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing, stopScreenShare]);

  const handleLeave = () => {
    if (channelRef.current && myUserId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'leave', from: myUserId }
      });
    }
    cleanup();
    navigate('/chat');
  };

  const sharingParticipant = participants.find(p => p.isScreenSharing);
  const participantCount = participants.length;

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)', overflow: 'hidden' }} className="no-drag">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', backdropFilter: 'var(--glass-blur)', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn" onClick={handleLeave} title="Back to Chat">
            <ArrowLeft size={18} /> Exit
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Collaboration Room</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                <Wifi size={12} /> Live P2P
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} className="text-cyan" /> Encrypted
              </span>
            </div>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {sharingParticipant ? (
          <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '16px' }}>
            <div style={{ height: '100%', minHeight: 0 }}>
              <VideoTile participant={sharingParticipant} isDominant />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', height: '100%' }}>
              {participants.filter(p => p.id !== sharingParticipant.id).map(p => (
                <div key={p.id} style={{ height: '160px', flexShrink: 0 }}>
                  <VideoTile participant={p} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', gap: '16px', gridTemplateColumns: participantCount === 1 ? '1fr' : 'repeat(2, 1fr)', gridTemplateRows: participantCount <= 2 ? '1fr' : 'repeat(2, 1fr)', maxWidth: participantCount === 1 ? '900px' : '1400px', maxHeight: '800px' }}>
            {participants.map(p => (
              <VideoTile key={p.id} participant={p} />
            ))}
          </div>
        )}

        {participantCount === 1 && !sharingParticipant && (
          <div style={{ position: 'absolute', top: '40px', backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'var(--glass-blur)', padding: '8px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
            Waiting for peers to join...
          </div>
        )}
      </main>

      <footer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', zIndex: 30 }}>
        <MeetingControls isMuted={isMuted} isVideoOff={isVideoOff} isScreenSharing={isScreenSharing} participantCount={participantCount} onToggleMic={handleToggleMic} onToggleVideo={handleToggleVideo} onToggleScreenShare={handleToggleScreenShare} onLeave={handleLeave} showDevTools={showDevTools} onToggleDevTools={() => setShowDevTools(s => !s)} />
      </footer>
    </div>
  );
}
