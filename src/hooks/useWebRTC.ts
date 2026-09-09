import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Participant } from '../types/meeting';

type SignalType = 'peer-joined' | 'offer' | 'answer' | 'ice-candidate' | 'status-update';

interface SignalPayload {
  type: SignalType;
  senderId: string;
  senderName: string;
  targetId?: string;
  data?: any;
}

import { enhanceOpusSdp, enhanceVideoSdp } from '../utils/callQuality';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    ...(import.meta.env.VITE_TURN_URL ? [{
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
    }] : [])
  ]
};

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
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(localStream);

  // Keep localStreamRef synchronized
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Broadcast helper
  const sendSignal = useCallback((type: SignalType, targetId?: string, data?: any) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc_signal',
      payload: {
        type,
        senderId: localUserId,
        senderName: localUserName,
        targetId,
        data
      } as SignalPayload
    });
  }, [localUserId, localUserName]);

  // Dynamically sync tracks to existing peers when localStream arrives or changes
  useEffect(() => {
    if (!localStream) return;

    peersRef.current.forEach((peer, peerId) => {
      try {
        const senders = peer.getSenders();
        let tracksAdded = false;

        localStream.getTracks().forEach(track => {
          const sender = senders.find(s => s.track?.kind === track.kind);
          if (sender) {
            if (sender.track !== track) {
              sender.replaceTrack(track).catch(err => {
                console.warn(`[useWebRTC] Failed to replace ${track.kind} track:`, err);
              });
            }
          } else {
            peer.addTrack(track, localStream);
            tracksAdded = true;
          }
        });

        if (tracksAdded && peer.signalingState === 'stable') {
          peer.createOffer().then(async offer => {
            const enhancedSdp = enhanceVideoSdp(enhanceOpusSdp(offer.sdp || ''), 1500);
            const desc = new RTCSessionDescription({ type: offer.type, sdp: enhancedSdp });
            await peer.setLocalDescription(desc);
            sendSignal('offer', peerId, desc);
          }).catch(err => console.warn('[useWebRTC] Renegotiation offer error:', err));
        }
      } catch (err) {
        console.warn('[useWebRTC] Error syncing tracks to peer:', err);
      }
    });
  }, [localStream, sendSignal]);

  // Sync local status changes to everyone
  const { isAudioMuted, isVideoOff, isScreenSharing } = localStatus;
  useEffect(() => {
    if (!channelRef.current) return;
    sendSignal('status-update', undefined, { isAudioMuted, isVideoOff, isScreenSharing });
  }, [isAudioMuted, isVideoOff, isScreenSharing, sendSignal]);

  const createPeer = useCallback((peerId: string, peerName: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) {
      console.warn('Peer already exists:', peerId);
      return peersRef.current.get(peerId)!;
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(peerId, peer);

    // Add local stream tracks (checking both prop and ref)
    const activeLocalStream = localStream || localStreamRef.current;
    if (activeLocalStream) {
      activeLocalStream.getTracks().forEach(track => {
        try {
          peer.addTrack(track, activeLocalStream);
        } catch (e) {
          console.warn('[useWebRTC] Error adding initial track:', e);
        }
      });
    }

    // Handle ICE Candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('ice-candidate', peerId, event.candidate);
      }
    };


    // Handle Remote Stream Track Arrival
    peer.ontrack = (event) => {
      const incomingStream = event.streams && event.streams[0];
      setRemoteParticipants(prev => {
        const existing = prev.find(p => p.id === peerId);
        let streamToUse: MediaStream;

        if (incomingStream) {
          streamToUse = new MediaStream(incomingStream.getTracks());
        } else if (existing?.stream) {
          const tracks = existing.stream.getTracks();
          if (!tracks.some(t => t.id === event.track.id)) {
            existing.stream.addTrack(event.track);
          }
          streamToUse = new MediaStream(existing.stream.getTracks());
        } else {
          streamToUse = new MediaStream([event.track]);
        }

        if (existing) {
          return prev.map(p => p.id === peerId ? { ...p, stream: streamToUse } : p);
        }
        return [...prev, {
          id: peerId,
          name: peerName,
          isLocal: false,
          isAudioMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isSpeaking: false,
          stream: streamToUse
        }];
      });
    };

    // Connection state changes
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') {
        console.warn('ICE connection failed, attempting ICE restart for peer:', peerId);
        if (isInitiator) {
          peer.createOffer({ iceRestart: true }).then(async offer => {
            const enhancedSdp = enhanceVideoSdp(enhanceOpusSdp(offer.sdp || ''), 1500);
            const desc = new RTCSessionDescription({ type: offer.type, sdp: enhancedSdp });
            await peer.setLocalDescription(desc);
            sendSignal('offer', peerId, desc);
          }).catch(() => {});
        }
      } else if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'closed') {
        setRemoteParticipants(prev => prev.filter(p => p.id !== peerId));
        peersRef.current.delete(peerId);
      }
    };

    // Prioritize Opus codec for high-fidelity mobile audio
    if (typeof window !== 'undefined' && 'RTCRtpSender' in window && 'getCapabilities' in (window as any).RTCRtpSender) {
      const audioCodecs = (window as any).RTCRtpSender.getCapabilities('audio')?.codecs;
      if (Array.isArray(audioCodecs)) {
        const opusCodecs = audioCodecs.filter((c: any) => c.mimeType.toLowerCase() === 'audio/opus');
        const otherCodecs = audioCodecs.filter((c: any) => c.mimeType.toLowerCase() !== 'audio/opus');
        const prioritized = [...opusCodecs, ...otherCodecs];
        try {
          peer.getTransceivers().forEach(t => {
            if (t.sender.track?.kind === 'audio' && typeof (t as any).setCodecPreferences === 'function') {
              (t as any).setCodecPreferences(prioritized);
            }
          });
        } catch {}
      }
    }

    if (isInitiator) {
      peer.createOffer().then(async offer => {
        const enhancedSdp = enhanceVideoSdp(enhanceOpusSdp(offer.sdp || ''), 1500);
        const desc = new RTCSessionDescription({ type: offer.type, sdp: enhancedSdp });
        await peer.setLocalDescription(desc);
        sendSignal('offer', peerId, desc);
      }).catch(e => console.error('Error creating offer', e));
    }

    // Make sure participant exists in state even before stream arrives
    setRemoteParticipants(prev => {
      if (prev.find(p => p.id === peerId)) return prev;
      return [...prev, {
        id: peerId,
        name: peerName,
        isLocal: false,
        isAudioMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isSpeaking: false,
      }];
    });

    return peer;
  }, [localStream, sendSignal]);


  useEffect(() => {
    if (!isEnabled || !roomId || !localUserId) return;

    // Reset state if room changes
    setRemoteParticipants([]);
    peersRef.current.forEach(peer => peer.close());
    peersRef.current.clear();
    pendingCandidatesRef.current.clear();

    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
      const signal = payload as SignalPayload;
      
      // Ignore if it's meant for someone else specifically
      if (signal.targetId && signal.targetId !== localUserId) return;
      // Ignore my own messages (already handled by broadcast: { self: false }, just to be sure)
      if (signal.senderId === localUserId) return;

      const peerId = signal.senderId;

      if (signal.type === 'peer-joined') {
        // Someone joined! I'll create a peer as the initiator and send an offer
        console.log('Peer joined:', peerId);
        createPeer(peerId, signal.senderName, true);
        
        // Also send my current status to the new peer
        sendSignal('status-update', peerId, localStatus);
      } 
      
      else if (signal.type === 'offer') {
        console.log('Got offer from:', peerId);
        const peer = peersRef.current.get(peerId) || createPeer(peerId, signal.senderName, false);
        await peer.setRemoteDescription(new RTCSessionDescription(signal.data));
        
        // Flush any ICE candidates that arrived before remote description
        const queued = pendingCandidatesRef.current.get(peerId) || [];
        for (const cand of queued) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.error('Error adding queued ICE candidate', e);
          }
        }
        pendingCandidatesRef.current.delete(peerId);

        const answer = await peer.createAnswer();
        const enhancedSdp = enhanceVideoSdp(enhanceOpusSdp(answer.sdp || ''), 1500);
        const desc = new RTCSessionDescription({ type: answer.type, sdp: enhancedSdp });
        await peer.setLocalDescription(desc);
        sendSignal('answer', peerId, desc);
      } 
      
      else if (signal.type === 'answer') {
        console.log('Got answer from:', peerId);
        const peer = peersRef.current.get(peerId);
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.data));
          
          // Flush any ICE candidates that arrived before remote description
          const queued = pendingCandidatesRef.current.get(peerId) || [];
          for (const cand of queued) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.error('Error adding queued ICE candidate', e);
            }
          }
          pendingCandidatesRef.current.delete(peerId);
        }
      } 
      
      else if (signal.type === 'ice-candidate') {
        const peer = peersRef.current.get(peerId);
        if (peer && signal.data) {
          if (peer.remoteDescription && peer.remoteDescription.type) {
            try {
              await peer.addIceCandidate(new RTCIceCandidate(signal.data));
            } catch (e) {
              console.error('Error adding ICE candidate', e);
            }
          } else {
            // Queue candidate until setRemoteDescription is resolved
            const list = pendingCandidatesRef.current.get(peerId) || [];
            list.push(signal.data);
            pendingCandidatesRef.current.set(peerId, list);
          }
        }
      }
      
      else if (signal.type === 'status-update') {
        setRemoteParticipants(prev => prev.map(p => {
          if (p.id === peerId) {
            return {
              ...p,
              isAudioMuted: signal.data?.isAudioMuted ?? p.isAudioMuted,
              isVideoOff: signal.data?.isVideoOff ?? p.isVideoOff,
              isScreenSharing: signal.data?.isScreenSharing ?? p.isScreenSharing
            };
          }
          return p;
        }));
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Broadcast that I joined
        sendSignal('peer-joined');
      }
    });

    const peers = peersRef.current;
    return () => {
      channel.unsubscribe();
      peers.forEach(peer => peer.close());
      peers.clear();
      pendingCandidatesRef.current.clear();
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localUserId]);

  // When local stream updates (e.g. camera turned on/off), we need to update senders
  useEffect(() => {
    peersRef.current.forEach(peer => {
      if (localStream) {
        // Simplistic approach: add missing tracks, but normally we'd use replaceTrack
        localStream.getTracks().forEach(track => {
          const sender = peer.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            peer.addTrack(track, localStream);
          }
        });
      }
    });
  }, [localStream]);

  return { remoteParticipants };
}
