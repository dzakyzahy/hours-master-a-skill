import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Users } from 'lucide-react';

interface MeetingRoomProps {
  roomId: string;
  roomName: string;
  onLeave: () => void;
}

export function MeetingRoom({ roomId, roomName, onLeave }: MeetingRoomProps) {
  const { username } = useStore();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [userId: string]: MediaStream }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [myUserId, setMyUserId] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<{ [userId: string]: RTCPeerConnection }>({});
  const channelRef = useRef<any>(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;
      const uid = authData.user.id;
      setMyUserId(uid);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Setup Signaling Channel
        const channel = supabase.channel(`webrtc_${roomId}`);
        channelRef.current = channel;

        channel.on('broadcast', { event: 'webrtc_signal' }, (payload) => {
          handleSignalingData(payload.payload, stream, uid);
        });

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Announce presence to room
            channel.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'join', from: uid }
            });
          }
        });

      } catch (err) {
        console.error("Failed to access media devices:", err);
        alert("Could not access camera/microphone.");
      }
    }
    
    init();

    return () => {
      cleanup();
    };
  }, [roomId]);

  const cleanup = () => {
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };

  const handleSignalingData = async (data: any, stream: MediaStream, myId: string) => {
    if (data.from === myId) return; // Ignore my own messages

    // 1. Someone joined, I need to create an offer to them
    if (data.type === 'join') {
      const peer = createPeer(data.from, stream, true, myId);
      peersRef.current[data.from] = peer;
    }

    // 2. Someone sent an offer, I need to answer
    if (data.type === 'offer' && data.to === myId) {
      const peer = createPeer(data.from, stream, false, myId);
      peersRef.current[data.from] = peer;
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'answer', answer, from: myId, to: data.from }
      });
    }

    // 3. Someone answered my offer
    if (data.type === 'answer' && data.to === myId) {
      const peer = peersRef.current[data.from];
      if (peer) await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    // 4. Someone sent an ICE candidate
    if (data.type === 'candidate' && data.to === myId) {
      const peer = peersRef.current[data.from];
      if (peer) await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    }

    // 5. Someone left
    if (data.type === 'leave') {
      const peer = peersRef.current[data.from];
      if (peer) {
        peer.close();
        delete peersRef.current[data.from];
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[data.from];
          return newStreams;
        });
      }
    }
  };

  const createPeer = (partnerId: string, stream: MediaStream, isInitiator: boolean, myId: string) => {
    const peer = new RTCPeerConnection(servers);
    
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [partnerId]: event.streams[0]
      }));
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'candidate', candidate: event.candidate, from: myId, to: partnerId }
        });
      }
    };

    if (isInitiator) {
      peer.createOffer().then(offer => {
        peer.setLocalDescription(offer);
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc_signal',
          payload: { type: 'offer', offer, from: myId, to: partnerId }
        });
      });
    }

    return peer;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in all peers
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Replace local video
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        screenTrack.onended = () => {
          stopScreenShare();
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen sharing failed", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setIsScreenSharing(false);
    }
  };

  const handleLeave = () => {
    if (channelRef.current && myUserId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'leave', from: myUserId }
      });
    }
    cleanup();
    onLeave();
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Users size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-white m-0 leading-none">{roomName}</h3>
            <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Meeting
            </span>
          </div>
        </div>
        <div className="text-slate-400 text-sm">
          {Object.keys(remoteStreams).length + 1} Participant(s)
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid gap-4" style={{ 
        gridTemplateColumns: Object.keys(remoteStreams).length === 0 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))' 
      }}>
        {/* Local Video */}
        <div className="relative rounded-xl overflow-hidden bg-black shadow-lg border border-slate-700 group">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
            style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }}
          />
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-sm text-white font-medium flex items-center gap-2 border border-white/10">
            You {isScreenSharing && '(Sharing Screen)'}
            {(isMuted || isVideoOff) && (
              <div className="flex gap-1 ml-1 text-red-400">
                {isMuted && <MicOff size={14} />}
                {isVideoOff && <VideoOff size={14} />}
              </div>
            )}
          </div>
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <div key={id} className="relative rounded-xl overflow-hidden bg-black shadow-lg border border-slate-700 group">
            <video 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
              ref={video => {
                if (video && video.srcObject !== stream) video.srcObject = stream;
              }}
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-sm text-white font-medium border border-white/10">
              User
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-800 flex justify-center items-center gap-4 border-t border-slate-700">
        <button 
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
        <button 
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          <MonitorUp size={22} />
        </button>
        <div className="w-px h-8 bg-slate-700 mx-2"></div>
        <button 
          onClick={handleLeave}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium flex items-center gap-2 transition-colors"
        >
          <PhoneOff size={20} />
          Leave Call
        </button>
      </div>
    </div>
  );
}
