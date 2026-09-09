import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Participant } from '../types/meeting';

/**
 * useWebRTC — Production-grade P2P WebRTC Hook
 *
 * Inspirasi arsitektur dari:
 * - holtwick/briefing (lightweight P2P, clean signaling)
 * - miroslavpejic85/mirotalk (robust renegotiation, STUN/TURN handling)
 *
 * Perbaikan utama vs versi sebelumnya:
 * 1. Menggunakan `onnegotiationneeded` untuk renegosiasi otomatis (fix screen share bug)
 * 2. ICE servers dengan free TURN fallback via metered.ca
 * 3. Cleanup yang lebih bersih dan aman dari memory leak
 * 4. Signaling yang lebih robust dengan queue ICE candidate sebelum remoteDesc di-set
 * 5. Heartbeat detection peer mati (via connection state, bukan hanya ICE)
 */

type SignalType =
  | 'peer-joined'
  | 'peer-left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'status-update';

interface SignalPayload {
  type: SignalType;
  senderId: string;
  senderName: string;
  targetId?: string;
  data?: any;
}

/**
 * ICE Servers Configuration (mirip MiroTalk):
 * - Primer: Google & Cloudflare STUN (gratis, latensi rendah)
 * - Fallback: TURN via metered.ca (untuk jaringan NAT ketat, misal 4G/kampus)
 *
 * Untuk production: ganti dengan kredensial TURN Anda sendiri
 * dari https://www.metered.ca/tools/openrelay/ atau Twilio
 */
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
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
    {
      urls: 'turns:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

interface PeerState {
  connection: RTCPeerConnection;
  isNegotiating: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  hasRemoteDescription: boolean;
}

export function useWebRTC(
  roomId: string,
  localUserId: string,
  localUserName: string,
  localStream: MediaStream | null,
  localStatus: { isAudioMuted: boolean; isVideoOff: boolean; isScreenSharing: boolean }
) {
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);

  // Menyimpan RTCPeerConnection + metadata per peer
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Ref untuk stream lokal terkini (agar closure tidak stale)
  const localStreamRef = useRef<MediaStream | null>(localStream);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ================================================================
  // Helper: Kirim sinyal via Supabase Realtime Broadcast
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
  // Helper: Hapus peer dari state dan ref
  // ================================================================
  const removePeer = useCallback((peerId: string) => {
    const peerState = peersRef.current.get(peerId);
    if (peerState) {
      peerState.connection.close();
      peersRef.current.delete(peerId);
    }
    setRemoteParticipants(prev => prev.filter(p => p.id !== peerId));
  }, []);

  // ================================================================
  // Helper: Flush ICE candidate queue setelah remoteDesc di-set
  // ================================================================
  const flushIceCandidateQueue = useCallback(async (peerId: string) => {
    const peerState = peersRef.current.get(peerId);
    if (!peerState || !peerState.hasRemoteDescription) return;

    for (const candidate of peerState.iceCandidateQueue) {
      try {
        await peerState.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn(`[WebRTC] Error adding queued ICE candidate from ${peerId}:`, e);
      }
    }
    peerState.iceCandidateQueue = [];
  }, []);

  // ================================================================
  // Core: Buat RTCPeerConnection baru untuk satu peer
  // ================================================================
  const createPeer = useCallback(
    (peerId: string, peerName: string, _isInitiator: boolean): PeerState => {
      // Jika sudah ada, tutup dulu yang lama
      if (peersRef.current.has(peerId)) {
        peersRef.current.get(peerId)!.connection.close();
        peersRef.current.delete(peerId);
      }

      const connection = new RTCPeerConnection(ICE_SERVERS);

      const peerState: PeerState = {
        connection,
        isNegotiating: false,
        iceCandidateQueue: [],
        hasRemoteDescription: false,
      };
      peersRef.current.set(peerId, peerState);

      // --- Tambahkan track lokal ke koneksi ---
      const currentStream = localStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          connection.addTrack(track, currentStream);
        });
      }

      // --- ICE Candidate: kirim saat kandidat tersedia ---
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('ice-candidate', peerId, event.candidate.toJSON());
        }
      };

      // --- Renegosiasi otomatis (MiroTalk pattern) ---
      // Event ini terpicu otomatis saat track ditambah/dihapus (misal: screen share)
      connection.onnegotiationneeded = async () => {
        const state = peersRef.current.get(peerId);
        if (!state || state.isNegotiating) return;

        try {
          state.isNegotiating = true;
          const offer = await connection.createOffer();
          // Cegah race condition: cek apakah state masih stable
          if (connection.signalingState !== 'stable') return;
          await connection.setLocalDescription(offer);
          sendSignal('offer', peerId, connection.localDescription?.toJSON());
        } catch (e) {
          console.error(`[WebRTC] onnegotiationneeded error for ${peerId}:`, e);
        } finally {
          const s = peersRef.current.get(peerId);
          if (s) s.isNegotiating = false;
        }
      };

      // --- Remote Track tiba: update state partisipan ---
      connection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;

        setRemoteParticipants(prev => {
          const existing = prev.find(p => p.id === peerId);
          if (existing) {
            return prev.map(p =>
              p.id === peerId ? { ...p, stream: remoteStream } : p
            );
          }
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
              stream: remoteStream,
            },
          ];
        });
      };

      // --- Connection State: hapus peer jika terputus ---
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        console.log(`[WebRTC] Peer ${peerId} connection state: ${state}`);
        if (state === 'failed' || state === 'closed') {
          removePeer(peerId);
        }
      };

      // --- ICE Connection State fallback ---
      connection.oniceconnectionstatechange = () => {
        const state = connection.iceConnectionState;
        if (state === 'failed') {
          console.warn(`[WebRTC] ICE failed for ${peerId}, attempting restart...`);
          connection.restartIce();
        }
        if (state === 'disconnected') {
          // Beri waktu 5 detik sebelum hapus, bisa reconnect
          setTimeout(() => {
            if (connection.iceConnectionState === 'disconnected' ||
                connection.iceConnectionState === 'failed') {
              removePeer(peerId);
            }
          }, 5000);
        }
      };

      // Tambahkan placeholder partisipan (nama visible walau stream belum tiba)
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
          },
        ];
      });

      return peerState;
    },
    [sendSignal, removePeer]
  );

  // ================================================================
  // Sync status mic/video/screen ke semua peer
  // ================================================================
  useEffect(() => {
    if (!channelRef.current) return;
    sendSignal('status-update', undefined, localStatus);
  }, [localStatus.isAudioMuted, localStatus.isVideoOff, localStatus.isScreenSharing, sendSignal]);

  // ================================================================
  // Main Effect: Setup Supabase channel & signaling handler
  // ================================================================
  useEffect(() => {
    if (!roomId || !localUserId) return;

    // Reset state untuk room baru
    peersRef.current.forEach(ps => ps.connection.close());
    peersRef.current.clear();
    setRemoteParticipants([]);

    const channel = supabase.channel(`webrtc_room_${roomId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: localUserId },
      },
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
      const signal = payload as SignalPayload;

      // Abaikan sinyal yang bukan untuk kita
      if (signal.targetId && signal.targetId !== localUserId) return;
      // Abaikan sinyal dari diri sendiri
      if (signal.senderId === localUserId) return;

      const peerId = signal.senderId;
      const peerName = signal.senderName;

      switch (signal.type) {
        case 'peer-joined': {
          console.log(`[WebRTC] Peer joined: ${peerName} (${peerId})`);
          // Saya yang sudah ada di room: buat offer ke peer baru
          createPeer(peerId, peerName, true);
          // Kirim status saya ke peer yang baru join
          sendSignal('status-update', peerId, localStatus);
          break;
        }

        case 'peer-left': {
          console.log(`[WebRTC] Peer left: ${peerId}`);
          removePeer(peerId);
          break;
        }

        case 'offer': {
          console.log(`[WebRTC] Received offer from: ${peerName}`);
          let peerState = peersRef.current.get(peerId);

          // Jika sudah ada koneksi dan sedang bernegosiasi, cek "glare condition"
          // (kedua sisi mengirim offer bersamaan)
          if (peerState && peerState.connection.signalingState !== 'stable') {
            // Rollback local description dan lanjutkan dengan offer masuk
            await peerState.connection.setLocalDescription({ type: 'rollback' });
          }

          if (!peerState) {
            peerState = createPeer(peerId, peerName, false);
          }

          await peerState.connection.setRemoteDescription(
            new RTCSessionDescription(signal.data)
          );
          peerState.hasRemoteDescription = true;
          await flushIceCandidateQueue(peerId);

          const answer = await peerState.connection.createAnswer();
          await peerState.connection.setLocalDescription(answer);
          sendSignal('answer', peerId, peerState.connection.localDescription?.toJSON());
          break;
        }

        case 'answer': {
          console.log(`[WebRTC] Received answer from: ${peerName}`);
          const peerState = peersRef.current.get(peerId);
          if (peerState) {
            if (peerState.connection.signalingState === 'have-local-offer') {
              await peerState.connection.setRemoteDescription(
                new RTCSessionDescription(signal.data)
              );
              peerState.hasRemoteDescription = true;
              await flushIceCandidateQueue(peerId);
            }
            peerState.isNegotiating = false;
          }
          break;
        }

        case 'ice-candidate': {
          const peerState = peersRef.current.get(peerId);
          if (!peerState || !signal.data) return;

          if (!peerState.hasRemoteDescription) {
            // Queue sampai remote description di-set
            peerState.iceCandidateQueue.push(signal.data);
          } else {
            try {
              await peerState.connection.addIceCandidate(
                new RTCIceCandidate(signal.data)
              );
            } catch (e) {
              console.warn(`[WebRTC] Error adding ICE candidate from ${peerId}:`, e);
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
        // Umumkan ke semua orang di room bahwa kita telah bergabung
        sendSignal('peer-joined');
      }
    });

    // Cleanup saat komponen unmount atau roomId berubah
    return () => {
      sendSignal('peer-left');
      channel.unsubscribe();
      peersRef.current.forEach(ps => ps.connection.close());
      peersRef.current.clear();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localUserId]);

  // ================================================================
  // Track Replacement: Saat stream lokal berubah (camera/screen share)
  // Menggunakan replaceTrack (bukan addTrack) untuk menghindari renegosiasi
  // yang tidak perlu — tapi kalau track baru, perlu addTrack.
  // ================================================================
  useEffect(() => {
    if (!localStream) return;

    peersRef.current.forEach(({ connection }) => {
      const senders = connection.getSenders();
      localStream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          // Track dengan kind yang sama sudah ada → replace (tidak perlu renegosiasi)
          sender.replaceTrack(track).catch(e =>
            console.warn('[WebRTC] replaceTrack failed:', e)
          );
        } else {
          // Track baru (misal: screen share punya video track berbeda) → add
          // Ini akan memicu onnegotiationneeded secara otomatis
          connection.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  return { remoteParticipants };
}
