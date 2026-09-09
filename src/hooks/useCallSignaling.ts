import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useStore } from '../store';
import type { CallSignal } from '../types/meeting';
import { playIncomingRingtone, playCallEnd } from '../utils/audio';
import { shouldProcessCallSignal } from '../utils/callSignalingCore';
import { showIncomingCallNotification, clearIncomingCallNotification, showMissedCallNotification } from '../utils/callNotifications';

// Shared in-memory event emitter for callers across components
type CallListener = (call: CallSignal | null) => void;
const listeners = new Set<CallListener>();
let currentIncomingCall: CallSignal | null = null;

// Module-level singleton channels to survive tab/page navigation
let activeChannel: any = null;
let activeBc: BroadcastChannel | null = null;
let activeUser = { id: '', username: '' };

function setGlobalIncomingCall(call: CallSignal | null) {
  currentIncomingCall = call;
  if (!call) {
    clearIncomingCallNotification();
  }
  listeners.forEach(fn => fn(call));
}

function handleIncomingSignal(payload: CallSignal) {
  if (!shouldProcessCallSignal(payload, activeUser.id, activeUser.username)) {
    return;
  }

  if (payload.type === 'CALL_INVITE') {
    // Prevent ringing if already in the same room or already receiving call
    if (!currentIncomingCall || currentIncomingCall.roomId !== payload.roomId) {
      setGlobalIncomingCall(payload);
      showIncomingCallNotification(payload.callerUsername, payload.roomId);
    }
  } else if (payload.type === 'CALL_CANCELLED' || payload.type === 'CALL_REJECTED') {
    if (currentIncomingCall?.roomId === payload.roomId) {
      const missedCaller = currentIncomingCall.callerUsername;
      playCallEnd();
      setGlobalIncomingCall(null);
      if (payload.type === 'CALL_CANCELLED' && missedCaller) {
        showMissedCallNotification(missedCaller);
      }
    }
  }
}

function ensureGlobalSignaling(userId?: string | null, username?: string | null) {
  const currentId = userId || '';
  const currentName = (username || '').toLowerCase();

  if (!currentId && !currentName) {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
    if (activeBc) {
      activeBc.close();
      activeBc = null;
    }
    activeUser = { id: '', username: '' };
    return;
  }

  const userChanged = activeUser.id !== currentId || activeUser.username !== currentName;
  activeUser = { id: currentId, username: currentName };

  if (typeof BroadcastChannel !== 'undefined' && !activeBc) {
    try {
      activeBc = new BroadcastChannel('skillo_call_channel');
      activeBc.onmessage = (event) => {
        handleIncomingSignal(event.data);
      };
    } catch {}
  }

  if (isSupabaseConfigured && (!activeChannel || userChanged)) {
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    try {
      activeChannel = supabase.channel('skillo_call_signals', {
        config: { broadcast: { self: false } }
      });

      activeChannel
        .on('broadcast', { event: 'CALL_SIGNAL' }, ({ payload }: { payload: CallSignal }) => {
          handleIncomingSignal(payload);
        })
        .subscribe((status: string) => {
          if (status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[callSignaling] Channel disconnected, will re-subscribe if user active');
          }
        });
    } catch (err) {
      console.warn('[callSignaling] Channel subscription error:', err);
    }
  }
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

  // Ensure singleton signaling channel stays alive across all page navigations
  useEffect(() => {
    ensureGlobalSignaling(userId, username);
  }, [userId, username]);

  // Ringtone loop when incomingCall is active
  useEffect(() => {
    if (incomingCall) {
      playIncomingRingtone();
      ringIntervalRef.current = setInterval(() => {
        playIncomingRingtone();
      }, 2500);

      // Auto cancel incoming call if not answered after 35s
      const timeout = setTimeout(() => {
        const missedCaller = incomingCall.callerUsername;
        setGlobalIncomingCall(null);
        if (missedCaller) {
          showMissedCallNotification(missedCaller);
        }
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

  // Broadcast helper
  const sendSignal = useCallback((payload: CallSignal) => {
    try {
      if (activeChannel) {
        activeChannel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload
        });
      } else if (isSupabaseConfigured) {
        const tempChannel = supabase.channel('skillo_call_signals');
        tempChannel.send({
          type: 'broadcast',
          event: 'CALL_SIGNAL',
          payload
        });
      }

      if (activeBc) {
        activeBc.postMessage(payload);
      } else if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('skillo_call_channel');
        bc.postMessage(payload);
        bc.close();
      }
    } catch (err) {
      console.warn('[callSignaling] Failed to broadcast signal:', err);
    }
  }, []);

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

    sendSignal(signalPayload);
    return roomId;
  }, [userId, username, sendSignal]);

  // Accept incoming call
  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall) return null;
    const call = incomingCall;

    const acceptPayload: CallSignal = {
      ...call,
      type: 'CALL_ACCEPTED',
      timestamp: Date.now()
    };

    sendSignal(acceptPayload);
    setGlobalIncomingCall(null);
    return call;
  }, [incomingCall, sendSignal]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    const call = incomingCall;

    const rejectPayload: CallSignal = {
      ...call,
      type: 'CALL_REJECTED',
      timestamp: Date.now()
    };

    sendSignal(rejectPayload);
    playCallEnd();
    setGlobalIncomingCall(null);
  }, [incomingCall, sendSignal]);

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

    sendSignal(cancelPayload);
    playCallEnd();
    clearIncomingCallNotification();
  }, [userId, username, sendSignal]);

  return {
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall
  };
}
