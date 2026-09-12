import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useCallSessionStore } from '../utils/callSession';
import { derivePresenceUpdates, normalizePresenceKey } from '../utils/presenceCore';

export function usePresence() {
  const { isAuthenticated, username, updateFriendStatus, checkFriendsOnlineStatus } = useStore();

  useEffect(() => {
    if (!isAuthenticated || !username) {
      checkFriendsOnlineStatus();
      return;
    }

    const currentUsername = normalizePresenceKey(username);
    const currentFriendNames = () => useStore.getState().friends.map(friend => friend.username);
    const markAllOffline = () => {
      derivePresenceUpdates(currentFriendNames(), [], Date.now()).forEach(update => {
        updateFriendStatus(update.username, false);
      });
    };

    if (isSupabaseConfigured) {
      const channel = supabase.channel('global_presence', {
        config: { presence: { key: currentUsername } },
      });

      const applySnapshot = () => {
        const onlineKeys = Object.keys(channel.presenceState())
          .filter(key => normalizePresenceKey(key) !== currentUsername);
        derivePresenceUpdates(currentFriendNames(), onlineKeys, Date.now()).forEach(update => {
          updateFriendStatus(update.username, update.isOnline, update.lastSeen);
        });
      };

      const trackPresence = () => channel.track({
        online_at: new Date().toISOString(),
        username: currentUsername,
      }).catch((err: unknown) => console.warn('[presence] Failed to track:', err));

      channel
        .on('presence', { event: 'sync' }, applySnapshot)
        .on('presence', { event: 'join' }, applySnapshot)
        .on('presence', { event: 'leave' }, applySnapshot)
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') trackPresence();
          if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            markAllOffline();
          }
        });

      const handleOffline = () => markAllOffline();
      const handleOnline = () => trackPresence();
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      let appStateListener: Promise<{ remove: () => Promise<void> }> | null = null;
      if (Capacitor.isNativePlatform()) {
        appStateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
          const hasActiveCall = Boolean(useCallSessionStore.getState().session);
          if (isActive || hasActiveCall) {
            trackPresence();
          } else {
            channel.untrack().catch(() => {});
            markAllOffline();
          }
        });
      }

      const handleUnload = () => channel.untrack().catch(() => {});
      window.addEventListener('beforeunload', handleUnload);

      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('beforeunload', handleUnload);
        appStateListener?.then(listener => listener.remove()).catch(() => {});
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      };
    }

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('skillo_presence_sync');
      }
    } catch {}

    const sendHeartbeat = () => {
      const timestamp = Date.now();
      try {
        localStorage.setItem(`presence_${currentUsername}`, timestamp.toString());
        broadcastChannel?.postMessage({ type: 'HEARTBEAT', username: currentUsername, timestamp });
      } catch {}
      checkFriendsOnlineStatus();
    };

    if (broadcastChannel) {
      broadcastChannel.onmessage = event => {
        const data = event.data;
        if (!data?.username || normalizePresenceKey(data.username) === currentUsername) return;
        if (data.type === 'HEARTBEAT' || data.type === 'ACK') {
          localStorage.setItem(`presence_${normalizePresenceKey(data.username)}`, String(data.timestamp || Date.now()));
          updateFriendStatus(data.username, true, data.timestamp);
          if (data.type === 'HEARTBEAT') {
            broadcastChannel?.postMessage({ type: 'ACK', username: currentUsername, timestamp: Date.now() });
          }
        } else if (data.type === 'LOGOUT') {
          updateFriendStatus(data.username, false, data.timestamp);
        }
      };
    }

    sendHeartbeat();
    const heartbeat = window.setInterval(sendHeartbeat, 3500);
    const handleUnload = () => {
      localStorage.removeItem(`presence_${currentUsername}`);
      broadcastChannel?.postMessage({ type: 'LOGOUT', username: currentUsername, timestamp: Date.now() });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
      broadcastChannel?.close();
    };
  }, [isAuthenticated, username, updateFriendStatus, checkFriendsOnlineStatus]);
}
