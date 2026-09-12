import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Participant } from '../types/meeting';
import Peer from 'simple-peer';
import type { Instance as PeerInstance } from 'simple-peer';

type SignalType =
  | 'peer-joined'
  | 'peer-left'
  | 'signal'
  | 'status-update';

interface SignalPayload {
  type: SignalType;
  senderId: string;
  senderName: string;
  targetId?: string;
  data?: any;
}

interface PeerState {
  peer: PeerInstance;
  senderStream: MediaStream;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
}

// STUN/TURN Servers untuk NAT Traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useWebRTC(
  roomId: string,
  localUserId: string,
  localUserName: string,
  localStream: MediaStream | null,
  localStatus: { isAudioMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean }
) {
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Menyimpan referensi stream & status terbaru agar tidak basi di dalam callback
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const localStatusRef = useRef(localStatus);
  
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    localStatusRef.current = localStatus;
  }, [localStatus]);

  // ================================================================
  // Helper: Kirim Sinyal via Supabase
  // ================================================================
  const sendSignal = useCallback(
    (type: SignalType, targetId?: string, data?: any) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: {
          type,
          senderId: localUserId,
          senderName: localUserName,
          targetId,
          data,
        } as SignalPayload,
      });
    },
    [localUserId, localUserName]
  );

  // ================================================================
  // Helper: Hapus Peer
  // ================================================================
  const removePeer = useCallback((peerId: string) => {
    const peerState = peersRef.current.get(peerId);
    if (peerState) {
      peersRef.current.delete(peerId);
      if (!(peerState.peer as any).destroyed) peerState.peer.destroy();
    }
    setRemoteParticipants(prev => prev.filter(p => p.id !== peerId));
  }, []);

  // ================================================================
  // Core: Buat Koneksi Peer Baru Menggunakan simple-peer
  // ================================================================
  const createPeer = useCallback(
    (peerId: string, peerName: string, isInitiator: boolean) => {
      // Bersihkan jika sudah ada instance
      if (peersRef.current.has(peerId)) {
        peersRef.current.get(peerId)?.peer.destroy();
        peersRef.current.delete(peerId);
      }

      const sourceStream = localStreamRef.current;
      const senderStream = new MediaStream(sourceStream?.getTracks() || []);

      const peer = new Peer({
        initiator: isInitiator,
        trickle: true,
        stream: senderStream,
        config: {
          iceServers: ICE_SERVERS
        }
      });

      // Simpan state peer
      peersRef.current.set(peerId, {
        peer,
        senderStream,
        audioTrack: sourceStream?.getAudioTracks()[0],
        videoTrack: sourceStream?.getVideoTracks()[0],
      });

      // Tambahkan placeholder partisipan
      setRemoteParticipants(prev => {
        if (prev.find(p => p.id === peerId)) return prev;
        return [
          ...prev,
          {
            id: peerId,
            name: peerName,
            isLocal: false,
            isAudioMuted: false,
            isVideoOff: false,
            isScreenSharing: false,
            isSpeaking: false,
            stream: undefined,
          },
        ];
      });

      // 1. Tangkap Sinyal dari simple-peer dan kirim ke remote
      peer.on('signal', (signalData: any) => {
        sendSignal('signal', peerId, signalData);
      });

      // 2. Tangkap Stream dari remote
      peer.on('stream', (remoteStream: any) => {
        setRemoteParticipants(prev =>
          prev.map(p =>
            p.id === peerId ? { ...p, stream: remoteStream } : p
          )
        );
      });

      // 3. Handle penambahan track (terkadang stream baru tiba berupa track tambahan)
      peer.on('track', (_track: any, stream: any) => {
        setRemoteParticipants(prev =>
          prev.map(p =>
            p.id === peerId ? { ...p, stream: stream } : p
          )
        );
      });

      // 4. Cleanup saat peer tertutup / error
      peer.on('close', () => {
        console.log(`[WebRTC] Peer connection closed: ${peerId}`);
        removePeer(peerId);
      });

      peer.on('error', (err: any) => {
        console.warn(`[WebRTC] Peer connection error (${peerId}):`, err);
        removePeer(peerId);
      });

      return peer;
    },
    [sendSignal, removePeer]
  );

  // ================================================================
  // Efek Utama: Inisialisasi Supabase Channel
  // ================================================================
  useEffect(() => {
    if (!roomId || !localUserId) return;
    const peers = peersRef.current;

    // Bersihkan room sebelumnya
    peers.forEach(({ peer }) => peer.destroy());
    peers.clear();
    setRemoteParticipants([]);

    const channel = supabase.channel(`webrtc_room_${roomId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: localUserId },
      },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'webrtc_signal' }, ({ payload }) => {
      const signal = payload as SignalPayload;

      // Filter pesan untuk target tertentu (bukan untuk kita) dan abaikan dari diri sendiri
      if (signal.targetId && signal.targetId !== localUserId) return;
      if (signal.senderId === localUserId) return;

      const peerId = signal.senderId;
      const peerName = signal.senderName;

      switch (signal.type) {
        case 'peer-joined': {
          console.log(`[WebRTC] Peer joined: ${peerName} (${peerId})`);
          // Kita sudah di room, maka kita yang membuat offer (initiator: true)
          createPeer(peerId, peerName, true);
          // Kirim status lokal ke pendatang baru
          sendSignal('status-update', peerId, localStatusRef.current);
          break;
        }

        case 'peer-left': {
          console.log(`[WebRTC] Peer left: ${peerId}`);
          removePeer(peerId);
          break;
        }

        case 'signal': {
          let peerState = peersRef.current.get(peerId);
          // Jika tidak ada koneksi, ini berarti kita menerima offer sebagai penerima (initiator: false)
          if (!peerState) {
            const peer = createPeer(peerId, peerName, false);
            peer.signal(signal.data);
          } else {
            // Lanjutkan negosiasi
            try {
              peerState.peer.signal(signal.data);
            } catch (err) {
              console.warn(`[WebRTC] Error processing signal for ${peerId}:`, err);
            }
          }
          break;
        }

        case 'status-update': {
          setRemoteParticipants(prev =>
            prev.map(p =>
              p.id === peerId
                ? {
                    ...p,
                    isAudioMuted: signal.data?.isAudioMuted ?? p.isAudioMuted,
                    isVideoOff: signal.data?.isVideoOff ?? p.isVideoOff,
                    isScreenSharing: signal.data?.isScreenSharing ?? p.isScreenSharing,
                  }
                : p
            )
          );
          break;
        }
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[WebRTC] Joined room: ${roomId}`);
        // Umumkan kehadiran ke semua peer
        sendSignal('peer-joined');
      }
    });

    return () => {
      sendSignal('peer-left');
      channel.unsubscribe();
      peers.forEach(({ peer }) => peer.destroy());
      peers.clear();
      channelRef.current = null;
    };
  }, [roomId, localUserId, createPeer, sendSignal, removePeer]);

  // ================================================================
  // Efek: Broadcast Status Update saat mic/video/screen berubah
  // ================================================================
  useEffect(() => {
    if (!channelRef.current) return;
    sendSignal('status-update', undefined, localStatusRef.current);
  }, [localStatus.isAudioMuted, localStatus.isVideoOff, localStatus.isScreenSharing, sendSignal]);

  // ================================================================
  // Efek: Replace Track saat Stream Lokal Berubah (Camera <-> Screen)
  // ================================================================
  useEffect(() => {
    if (!localStream) return;

    peersRef.current.forEach((peerState, peerId) => {
      const { peer, senderStream } = peerState;
      try {
        (['audio', 'video'] as const).forEach(kind => {
          const currentTrack = kind === 'audio' ? peerState.audioTrack : peerState.videoTrack;
          const nextTrack = localStream.getTracks().find(track => track.kind === kind);
          if (currentTrack?.id === nextTrack?.id) return;

          if (currentTrack && nextTrack) {
            peer.replaceTrack(currentTrack, nextTrack, senderStream);
            senderStream.removeTrack(currentTrack);
            senderStream.addTrack(nextTrack);
          } else if (currentTrack) {
            peer.removeTrack(currentTrack, senderStream);
            senderStream.removeTrack(currentTrack);
          } else if (nextTrack) {
            senderStream.addTrack(nextTrack);
            peer.addTrack(nextTrack, senderStream);
          }

          if (kind === 'audio') peerState.audioTrack = nextTrack;
          else peerState.videoTrack = nextTrack;
        });
      } catch (err) {
        console.warn(`[WebRTC] Failed to replace tracks for ${peerId}:`, err);
      }
    });
  }, [localStream]);

  return { remoteParticipants };
}
