import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useStore } from '../store';
import type { CallSignal } from '../types/meeting';
import { playIncomingRingtone, playCallEnd } from '../utils/audio';

// Shared in-memory event emitter for callers across components
type CallListener = (call: CallSignal | null) => void;
const listeners = new Set<CallListener>();
let currentIncomingCall: CallSignal | null = null;

function setGlobalIncomingCall(call: CallSignal | null) {
  currentIncomingCall = call;
  listeners.forEach(fn => fn(call));
}

export function useCallSignaling() {
  const { userId, username } = useStore();
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(currentIncomingCall);
  const ringIntervalRef = useRef<any>(null);

  // Subscribe to global in-memory state
  useEffect(() => {
    const handler: CallListener = (c) => setIncomingCall(c);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  // Ringtone loop when incomingCall is active
  useEffect(() => {
    if (incomingCall) {
      playIncomingRingtone();
      ringIntervalRef.current = setInterval(() => {
        playIncomingRingtone();
      }, 2500);

      // Auto cancel incoming call if not answered after 35s
      const timeout = setTimeout(() => {
        setGlobalIncomingCall(null);
      }, 35000);

      return () => {
        clearInterval(ringIntervalRef.current);
        clearTimeout(timeout);
      };
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }
  }, [incomingCall]);

  // Supabase Realtime & BroadcastChannel listener
  useEffect(() => {
    if (!userId && !username) return;

    const myId = userId || '';
    const myName = (username || '').toLowerCase();

    let channel: any = null;
    let bc: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('skillo_call_channel');
        bc.onmessage = (event) => {
          handleIncomingSignal(event.data);
        };
      } catch {}
    }

    if (isSupabaseConfigured) {
      try {
        channel = supabase.channel('skillo_call_signals', {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'CALL_SIGNAL' }, ({ payload }: { payload: CallSignal }) => {
            handleIncomingSignal(payload);
          })
          .subscribe();
      } catch (err) {
        console.warn('Call signaling channel error:', err);
      }
    }

    function handleIncomingSignal(payload: CallSignal) {
      if (!payload || !payload.type) return;

      const targetId = payload.receiverId;
      const targetUser = (payload.receiverUsername || '').toLowerCase();
      const isForMe = (myId && targetId === myId) || (myName && targetUser === myName);

      if (!isForMe) return;

      if (payload.type === 'CALL_INVITE') {
        // Prevent ringing if already in the same room or already has call
        if (!currentIncomingCall || currentIncomingCall.roomId !== payload.roomId) {
          setGlobalIncomingCall(payload);
        }
      } else if (payload.type === 'CALL_CANCELLED' || payload.type === 'CALL_REJECTED') {
        if (currentIncomingCall?.roomId === payload.roomId) {
          playCallEnd();
          setGlobalIncomingCall(null);
        }
      }
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [userId, username]);

  // Initiate call to a friend
  const initiateCall = useCallback((targetFriend: { id: string; username: string; name?: string }) => {
    const myId = userId || 'user_' + Date.now();
    const myName = username || 'Diky';
    
    // Deterministic room ID for 1-on-1 calls: dm_<sorted_users>
    const sortedIds = [myId, targetFriend.id].sort();
    const roomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;

    const signalPayload: CallSignal = {
      type: 'CALL_INVITE',
      callerId: myId,
      callerUsername: myName,
      callerName: myName,
      receiverId: targetFriend.id,
      receiverUsername: targetFriend.username,
      roomId,
      timestamp: Date.now()
    };

    // Broadcast across Supabase & BroadcastChannel
    try {
      if (isSupabaseConfigured) {
        const channel = supabase.channel('skillo_call_signals');
        channel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload: signalPayload
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('skillo_call_channel');
        bc.postMessage(signalPayload);
        bc.close();
      }
    } catch (err) {
      console.warn('Failed to broadcast call signal:', err);
    }

    return roomId;
  }, [userId, username]);

  // Accept incoming call
  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return null;
    const call = incomingCall;

    const acceptPayload: CallSignal = {
      ...call,
      type: 'CALL_ACCEPTED',
      timestamp: Date.now()
    };

    try {
      if (isSupabaseConfigured) {
        const channel = supabase.channel('skillo_call_signals');
        channel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload: acceptPayload
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('skillo_call_channel');
        bc.postMessage(acceptPayload);
        bc.close();
      }
    } catch {}

    setGlobalIncomingCall(null);
    return call;
  }, [incomingCall]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    const call = incomingCall;

    const rejectPayload: CallSignal = {
      ...call,
      type: 'CALL_REJECTED',
      timestamp: Date.now()
    };

    try {
      if (isSupabaseConfigured) {
        const channel = supabase.channel('skillo_call_signals');
        channel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload: rejectPayload
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('skillo_call_channel');
        bc.postMessage(rejectPayload);
        bc.close();
      }
    } catch {}

    playCallEnd();
    setGlobalIncomingCall(null);
  }, [incomingCall]);

  // Cancel outgoing call
  const cancelOutgoingCall = useCallback((roomId: string, targetFriendId?: string) => {
    const cancelPayload: CallSignal = {
      type: 'CALL_CANCELLED',
      callerId: userId || '',
      callerUsername: username || '',
      callerName: username || '',
      receiverId: targetFriendId || '',
      receiverUsername: '',
      roomId,
      timestamp: Date.now()
    };

    try {
      if (isSupabaseConfigured) {
        const channel = supabase.channel('skillo_call_signals');
        channel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload: cancelPayload
        });
      }
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('skillo_call_channel');
        bc.postMessage(cancelPayload);
        bc.close();
      }
    } catch {}

    playCallEnd();
  }, [userId, username]);

  return {
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall
  };
}
