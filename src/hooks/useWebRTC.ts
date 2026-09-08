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

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
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
      const remoteStream = event.streams[0];
      setRemoteParticipants(prev => {
        const existing = prev.find(p => p.id === peerId);
        if (existing) {
          return prev.map(p => p.id === peerId ? { ...p, stream: remoteStream } : p);
        }
        return [...prev, {
          id: peerId,
          name: peerName,
          isLocal: false,
          isAudioMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isSpeaking: false,
          stream: remoteStream
        }];
      });
    };

    // Connection state changes
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected' || peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'closed') {
        setRemoteParticipants(prev => prev.filter(p => p.id !== peerId));
        peersRef.current.delete(peerId);
      }
    };

    if (isInitiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        sendSignal('offer', peerId, offer);
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
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal('answer', peerId, answer);
      } 
      
      else if (signal.type === 'answer') {
        console.log('Got answer from:', peerId);
        const peer = peersRef.current.get(peerId);
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.data));
        }
      } 
      
      else if (signal.type === 'ice-candidate') {
        const peer = peersRef.current.get(peerId);
        if (peer && signal.data) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(signal.data));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
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
