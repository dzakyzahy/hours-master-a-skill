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

let globalActiveRoomId: string | null = null;
export function setGlobalActiveRoomId(roomId: string | null) {
  globalActiveRoomId = roomId;
}

type CallRoomListener = (payload: CallSignal) => void;
const callRoomListeners = new Set<CallRoomListener>();

export function addCallRoomEventListener(listener: CallRoomListener) {
  callRoomListeners.add(listener);
}
export function removeCallRoomEventListener(listener: CallRoomListener) {
  callRoomListeners.delete(listener);
}

export function sendSignalGlobal(payload: CallSignal) {
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
}

function handleIncomingSignal(payload: CallSignal) {
  callRoomListeners.forEach(fn => fn(payload));
  if (!shouldProcessCallSignal(payload, activeUser.id, activeUser.username)) {
    return;
  }

  if (payload.type === 'CALL_INVITE') {
    // Prevent ringing if already in the same room or already receiving call
    if ((currentIncomingCall && currentIncomingCall.roomId !== payload.roomId) || 
        (globalActiveRoomId && globalActiveRoomId !== payload.roomId)) {
      sendSignalGlobal({
        type: 'CALL_BUSY',
        callerId: activeUser.id,
        callerUsername: activeUser.username,
        callerName: activeUser.username,
        receiverId: payload.callerId,
        receiverUsername: payload.callerUsername,
        roomId: payload.roomId,
        timestamp: Date.now()
      });
      return;
    }
    
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

  const setupChannel = () => {
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
  };

  if (isSupabaseConfigured && (!activeChannel || userChanged)) {
    setupChannel();
  }
}

// Lifecycle listener for reconnection
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && activeUser.id && !activeChannel) {
      ensureGlobalSignaling(activeUser.id, activeUser.username);
    } else if (document.visibilityState === 'visible' && activeChannel) {
      // Re-subscribe if disconnected
      ensureGlobalSignaling(activeUser.id, activeUser.username);
    }
  });
}
import { App } from '@capacitor/app';
if (typeof window !== 'undefined') {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && activeUser.id) {
      ensureGlobalSignaling(activeUser.id, activeUser.username);
    }
  }).catch(() => {});
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

    sendSignalGlobal(signalPayload);
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

    sendSignalGlobal(acceptPayload);
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

    sendSignalGlobal(rejectPayload);
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

    sendSignalGlobal(cancelPayload);
    playCallEnd();
    clearIncomingCallNotification();
  }, [userId, username]);

  return {
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall
  };
}
