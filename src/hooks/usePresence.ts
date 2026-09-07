import { useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../supabaseClient';

export function usePresence() {
  const { isAuthenticated, username, updateFriendStatus, checkFriendsOnlineStatus } = useStore();

  useEffect(() => {
    if (!isAuthenticated || !username) {
      checkFriendsOnlineStatus();
      return;
    }

    const currentUsername = username.toLowerCase();
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('skillo_presence_sync');
      }
    } catch (_) {}

    // 1. Initial Heartbeat & Broadcast
    const sendHeartbeat = () => {
      const now = Date.now();
      try {
        localStorage.setItem(`presence_${currentUsername}`, now.toString());
      } catch (_) {}

      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({
            type: 'HEARTBEAT',
            username: currentUsername,
            timestamp: now,
          });
        } catch (_) {}
      }

      // Check current friends' online timestamps
      checkFriendsOnlineStatus();
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3500);

    // 2. BroadcastChannel Message Listener
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'HEARTBEAT' && data.username && data.username !== currentUsername) {
          updateFriendStatus(data.username, true, data.timestamp);
          // Respond back so the other tab knows we are online immediately
          try {
            broadcastChannel?.postMessage({
              type: 'ACK',
              username: currentUsername,
              timestamp: Date.now(),
            });
          } catch (_) {}
        } else if (data.type === 'ACK' && data.username && data.username !== currentUsername) {
          updateFriendStatus(data.username, true, data.timestamp);
        } else if (data.type === 'LOGOUT' && data.username && data.username !== currentUsername) {
          updateFriendStatus(data.username, false, data.timestamp);
        }
      };
    }

    // 3. Optional Supabase Presence (if Supabase is configured)
    let supabaseChannel: any = null;
    const isSupabaseConfigured = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
    );

    if (isSupabaseConfigured) {
      try {
        supabaseChannel = supabase.channel('global_presence', {
          config: { presence: { key: currentUsername } },
        });

        supabaseChannel
          .on('presence', { event: 'sync' }, () => {
            const state = supabaseChannel.presenceState();
            Object.keys(state).forEach((usr) => {
              if (usr.toLowerCase() !== currentUsername) {
                updateFriendStatus(usr, true, Date.now());
              }
            });
          })
          .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
            if (key.toLowerCase() !== currentUsername) {
              updateFriendStatus(key, true, Date.now());
            }
          })
          .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
            if (key.toLowerCase() !== currentUsername) {
              updateFriendStatus(key, false, Date.now());
            }
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await supabaseChannel.track({
                online_at: new Date().toISOString(),
                username: currentUsername,
              });
            }
          });
      } catch (err) {
        console.warn('Supabase presence error:', err);
      }
    }

    // 4. Cleanup on unmount or tab close
    const handleUnload = () => {
      try {
        localStorage.removeItem(`presence_${currentUsername}`);
        broadcastChannel?.postMessage({
          type: 'LOGOUT',
          username: currentUsername,
          timestamp: Date.now(),
        });
      } catch (_) {}
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [isAuthenticated, username, updateFriendStatus, checkFriendsOnlineStatus]);
}
