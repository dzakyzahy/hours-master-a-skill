import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Participant } from '../types/meeting';
import { enhanceOpusSdp } from '../utils/callQuality';
import { MAX_PARTICIPANTS, isPolite, videoBitrateKbps, roomIsFull } from '../utils/webrtcNegotiation';
import { classifyQuality, deltaLossFraction, readPeerStats, type PeerStatsSample } from '../utils/callStats';

type SignalType = 'peer-joined' | 'offer' | 'answer' | 'ice-candidate' | 'status-update' | 'room-full';

interface SignalPayload {
  type: SignalType;
  senderId: string;
  senderName: string;
  targetId?: string;
  data?: any;
}

interface PeerState {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  dropTimer: ReturnType<typeof setTimeout> | null;
}

const TURN_URL = import.meta.env.VITE_TURN_URL;

if (!TURN_URL) {
  console.warn(
    '[useWebRTC] No TURN server configured (VITE_TURN_URL). Calls will fail for users behind ' +
    'symmetric NAT — which includes most mobile carriers. See docs/video_call_architecture_and_plan.md (Fase 1).'
  );
}

// Testing aid: forces every candidate through TURN, which is the exact path a
// symmetric-NAT (mobile carrier) peer is limited to. Lets one machine prove the TURN
// server works without needing two phones on two different cellular networks.
const FORCE_RELAY = import.meta.env.VITE_FORCE_TURN_RELAY === 'true';

if (FORCE_RELAY) {
  console.warn('[useWebRTC] VITE_FORCE_TURN_RELAY is on — direct P2P is disabled. Testing only, never ship this.');
}

const ICE_SERVERS: RTCConfiguration = {
  ...(FORCE_RELAY ? { iceTransportPolicy: 'relay' as RTCIceTransportPolicy } : {}),
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...(TURN_URL ? [{
      urls: TURN_URL.split(',').map((u: string) => u.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    }] : [])
  ],
  iceCandidatePoolSize: 4
};

// 'disconnected' is routine on mobile (wifi <-> cellular handover) and usually self-heals.
const DISCONNECT_GRACE_MS = 8000;
const FAILED_GRACE_MS = 15000;
const STATS_INTERVAL_MS = 3000;
// Two bad samples before acting, so one hiccup does not blank everyone's video.
const DEGRADE_AFTER_SAMPLES = 2;

export function useWebRTC(
  roomId: string,
  localUserId: string,
  localUserName: string,
  localStream: MediaStream | null,
  localStatus: { isAudioMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean },
  options?: { enabled?: boolean }
) {
  const isEnabled = options?.enabled ?? true;
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [roomFull, setRoomFull] = useState(false);
  const [videoDegraded, setVideoDegraded] = useState(false);
  const lastStatsRef = useRef<Map<string, PeerStatsSample>>(new Map());
  const poorStreakRef = useRef(0);

  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const statusRef = useRef(localStatus);

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { statusRef.current = localStatus; }, [localStatus]);

  const sendSignal = useCallback((type: SignalType, targetId?: string, data?: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'webrtc_signal',
      payload: { type, senderId: localUserId, senderName: localUserName, targetId, data } as SignalPayload
    });
  }, [localUserId, localUserName]);

  const dropPeer = useCallback((peerId: string) => {
    const state = peersRef.current.get(peerId);
    if (state) {
      if (state.dropTimer) clearTimeout(state.dropTimer);
      try { state.pc.close(); } catch { /* already closed */ }
      peersRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    setRemoteParticipants(prev => prev.filter(p => p.id !== peerId));
  }, []);

  const scheduleDrop = useCallback((peerId: string, ms: number) => {
    const state = peersRef.current.get(peerId);
    if (!state || state.dropTimer) return;
    state.dropTimer = setTimeout(() => dropPeer(peerId), ms);
  }, [dropPeer]);

  const createPeer = useCallback((peerId: string, peerName: string): PeerState => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    const state: PeerState = {
      pc,
      polite: isPolite(localUserId, peerId),
      makingOffer: false,
      ignoreOffer: false,
      dropTimer: null
    };
    peersRef.current.set(peerId, state);

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        try { pc.addTrack(track, stream); } catch (err) { console.warn('[useWebRTC] addTrack failed:', err); }
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) sendSignal('ice-candidate', peerId, event.candidate);
    };

    // The browser decides when renegotiation is needed (new track, ICE restart, codec change).
    pc.onnegotiationneeded = async () => {
      if (pc.signalingState !== 'stable') return;
      try {
        state.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription({ type: offer.type, sdp: enhanceOpusSdp(offer.sdp || '') });
        sendSignal('offer', peerId, pc.localDescription);
      } catch (err) {
        console.warn('[useWebRTC] negotiation failed:', err);
      } finally {
        state.makingOffer = false;
      }
    };

    pc.ontrack = (event) => {
      const incomingStream = event.streams && event.streams[0];
      setRemoteParticipants(prev => {
        const existingParticipant = prev.find(p => p.id === peerId);
        let streamToUse: MediaStream;

        if (incomingStream) {
          streamToUse = new MediaStream(incomingStream.getTracks());
        } else if (existingParticipant?.stream) {
          const tracks = existingParticipant.stream.getTracks();
          if (!tracks.some(t => t.id === event.track.id)) existingParticipant.stream.addTrack(event.track);
          streamToUse = new MediaStream(existingParticipant.stream.getTracks());
        } else {
          streamToUse = new MediaStream([event.track]);
        }

        if (existingParticipant) {
          return prev.map(p => p.id === peerId ? { ...p, stream: streamToUse } : p);
        }
        return [...prev, {
          id: peerId, name: peerName, isLocal: false,
          isAudioMuted: false, isVideoOff: false, isScreenSharing: false, isSpeaking: false,
          stream: streamToUse
        }];
      });
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          if (state.dropTimer) { clearTimeout(state.dropTimer); state.dropTimer = null; }
          break;
        case 'disconnected':
          scheduleDrop(peerId, DISCONNECT_GRACE_MS);
          break;
        case 'failed':
          // Both sides may restart; perfect negotiation resolves the resulting glare.
          try { pc.restartIce(); } catch { /* older webview */ }
          scheduleDrop(peerId, FAILED_GRACE_MS);
          break;
        case 'closed':
          dropPeer(peerId);
          break;
      }
    };

    setRemoteParticipants(prev => prev.some(p => p.id === peerId) ? prev : [...prev, {
      id: peerId, name: peerName, isLocal: false,
      isAudioMuted: false, isVideoOff: false, isScreenSharing: false, isSpeaking: false
    }]);

    return state;
  }, [localUserId, sendSignal, scheduleDrop, dropPeer]);

  // Signaling channel: one per room.
  useEffect(() => {
    if (!isEnabled || !roomId || !localUserId) return;

    setRemoteParticipants([]);
    setRoomFull(false);

    const channel = supabase.channel(`room_${roomId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.targetId && signal.targetId !== localUserId) return;
      if (signal.senderId === localUserId) return;

      const peerId = signal.senderId;

      if (signal.type === 'room-full') {
        setRoomFull(true);
        return;
      }

      if (signal.type === 'peer-joined') {
        if (roomIsFull(peersRef.current.size)) {
          sendSignal('room-full', peerId);
          return;
        }
        createPeer(peerId, signal.senderName); // onnegotiationneeded sends the offer
        sendSignal('status-update', peerId, statusRef.current);
        return;
      }

      const state = peersRef.current.get(peerId)
        ?? (signal.type === 'offer' && !roomIsFull(peersRef.current.size)
          ? createPeer(peerId, signal.senderName)
          : undefined);
      if (!state) return;
      const { pc } = state;

      try {
        if (signal.type === 'offer' || signal.type === 'answer') {
          const description = signal.data as RTCSessionDescriptionInit;

          // Perfect negotiation: on collision the impolite side ignores, the polite side rolls back.
          const collision = description.type === 'offer' && (state.makingOffer || pc.signalingState !== 'stable');
          state.ignoreOffer = !state.polite && collision;
          if (state.ignoreOffer) return;

          await pc.setRemoteDescription(description);

          const queued = pendingCandidatesRef.current.get(peerId) || [];
          for (const candidate of queued) {
            try { await pc.addIceCandidate(candidate); } catch (err) { console.warn('[useWebRTC] queued ICE failed:', err); }
          }
          pendingCandidatesRef.current.delete(peerId);

          if (description.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription({ type: answer.type, sdp: enhanceOpusSdp(answer.sdp || '') });
            sendSignal('answer', peerId, pc.localDescription);
          }
        }

        else if (signal.type === 'ice-candidate' && signal.data) {
          if (pc.remoteDescription?.type) {
            await pc.addIceCandidate(signal.data);
          } else {
            const list = pendingCandidatesRef.current.get(peerId) || [];
            list.push(signal.data);
            pendingCandidatesRef.current.set(peerId, list);
          }
        }

        else if (signal.type === 'status-update') {
          setRemoteParticipants(prev => prev.map(p => p.id === peerId ? {
            ...p,
            isAudioMuted: signal.data?.isAudioMuted ?? p.isAudioMuted,
            isVideoOff: signal.data?.isVideoOff ?? p.isVideoOff,
            isScreenSharing: signal.data?.isScreenSharing ?? p.isScreenSharing
          } : p));
        }
      } catch (err) {
        if (!state.ignoreOffer) console.warn('[useWebRTC] signal error:', signal.type, err);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') sendSignal('peer-joined');
    });

    const peers = peersRef.current;
    const pending = pendingCandidatesRef.current;
    return () => {
      channel.unsubscribe();
      peers.forEach(state => {
        if (state.dropTimer) clearTimeout(state.dropTimer);
        try { state.pc.close(); } catch { /* already closed */ }
      });
      peers.clear();
      pending.clear();
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localUserId, isEnabled]);

  // Broadcast my mute / camera / screen-share state.
  useEffect(() => {
    if (!channelRef.current) return;
    sendSignal('status-update', undefined, localStatus);
  }, [localStatus.isAudioMuted, localStatus.isVideoOff, localStatus.isScreenSharing, sendSignal]);

  // Swap tracks when the camera toggles or screen share starts; renegotiation fires on its own.
  useEffect(() => {
    if (!localStream) return;
    peersRef.current.forEach(({ pc }) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          if (sender.track !== track) sender.replaceTrack(track).catch(err => console.warn('[useWebRTC] replaceTrack failed:', err));
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  // Cap the encoder as the mesh grows — every peer uploads (n-1) copies.
  useEffect(() => {
    const maxBitrate = videoBitrateKbps(remoteParticipants.length + 1) * 1000;
    peersRef.current.forEach(({ pc }) => {
      pc.getSenders().forEach(sender => {
        if (sender.track?.kind !== 'video') return;
        const params = sender.getParameters();
        if (!params.encodings?.length) params.encodings = [{}];
        params.encodings[0].maxBitrate = maxBitrate;
        sender.setParameters(params).catch(err => console.warn('[useWebRTC] setParameters failed:', err));
      });
    });
  }, [remoteParticipants.length]);

  // Poll connection quality, and drop outgoing video when the link cannot carry it.
  useEffect(() => {
    if (!isEnabled) return;

    const timer = setInterval(async () => {
      const levels = new Map<string, ReturnType<typeof classifyQuality>>();

      for (const [peerId, { pc }] of peersRef.current) {
        try {
          const sample = await readPeerStats(pc);
          const loss = deltaLossFraction(lastStatsRef.current.get(peerId), sample);
          lastStatsRef.current.set(peerId, sample);
          levels.set(peerId, classifyQuality(loss, sample.rttMs));
        } catch {
          // A peer closing mid-poll is normal; skip it this round.
        }
      }

      if (levels.size === 0) return;

      setRemoteParticipants(prev => prev.map(p => (
        levels.has(p.id) ? { ...p, quality: levels.get(p.id) } : p
      )));

      // Audio is what a call actually needs, so video is the first thing to go.
      const anyPoor = [...levels.values()].includes('poor');
      poorStreakRef.current = anyPoor ? poorStreakRef.current + 1 : 0;

      const shouldDegrade = poorStreakRef.current >= DEGRADE_AFTER_SAMPLES;
      setVideoDegraded(current => {
        if (current === shouldDegrade) return current;
        peersRef.current.forEach(({ pc }) => {
          pc.getSenders().forEach(sender => {
            if (sender.track?.kind !== 'video') return;
            const params = sender.getParameters();
            if (!params.encodings?.length) params.encodings = [{}];
            // active:false pauses the transport without touching the user's camera toggle.
            params.encodings[0].active = !shouldDegrade;
            sender.setParameters(params).catch(() => {});
          });
        });
        return shouldDegrade;
      });
    }, STATS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isEnabled]);

  return { remoteParticipants, roomFull, videoDegraded, maxParticipants: MAX_PARTICIPANTS };
}
