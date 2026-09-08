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
    } catch {}

    // 1. Initial Heartbeat & Broadcast
    const sendHeartbeat = () => {
      const now = Date.now();
      try {
        localStorage.setItem(`presence_${currentUsername}`, now.toString());
      } catch {}

      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({
            type: 'HEARTBEAT',
            username: currentUsername,
            timestamp: now,
          });
        } catch {}
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
          const usr = data.username.toLowerCase();
          try {
            localStorage.setItem(`presence_${usr}`, (data.timestamp || Date.now()).toString());
          } catch {}
          updateFriendStatus(data.username, true, data.timestamp);
          // Respond back so the other tab knows we are online immediately
          try {
            broadcastChannel?.postMessage({
              type: 'ACK',
              username: currentUsername,
              timestamp: Date.now(),
            });
          } catch {}
        } else if (data.type === 'ACK' && data.username && data.username !== currentUsername) {
          const usr = data.username.toLowerCase();
          try {
            localStorage.setItem(`presence_${usr}`, (data.timestamp || Date.now()).toString());
          } catch {}
          updateFriendStatus(data.username, true, data.timestamp);
        } else if (data.type === 'LOGOUT' && data.username && data.username !== currentUsername) {
          const usr = data.username.toLowerCase();
          try {
            localStorage.removeItem(`presence_${usr}`);
          } catch {}
          updateFriendStatus(data.username, false, data.timestamp);
        }
      };
    }

    // 3. Optional Supabase Presence (if Supabase is configured)
    let supabaseChannel: any = null;
    let supabaseOnlineUsers: Set<string> = new Set();
    let supabaseInterval: any = null;
    
    const isSupabaseConfigured = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
    );

    if (isSupabaseConfigured) {
      try {
        supabaseChannel = supabase.channel('global_presence', {
          config: { presence: { key: currentUsername } },
        });

        const syncSupabasePresence = () => {
          const state = supabaseChannel.presenceState();
          const currentlyOnline = new Set<string>();
          Object.keys(state).forEach((usr) => {
            if (usr.toLowerCase() !== currentUsername) {
              currentlyOnline.add(usr.toLowerCase());
              updateFriendStatus(usr, true, Date.now());
            }
          });
          
          // Mark users offline if they are in our previous set but not in the new state
          supabaseOnlineUsers.forEach(usr => {
            if (!currentlyOnline.has(usr)) {
              updateFriendStatus(usr, false, Date.now());
            }
          });
          supabaseOnlineUsers = currentlyOnline;
        };

        supabaseChannel
          .on('presence', { event: 'sync' }, syncSupabasePresence)
          .on('presence', { event: 'join' }, syncSupabasePresence)
          .on('presence', { event: 'leave' }, syncSupabasePresence)
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await supabaseChannel.track({
                online_at: new Date().toISOString(),
                username: currentUsername,
              });
            }
          });
          
        // Override local check for Supabase users periodically
        supabaseInterval = setInterval(() => {
          supabaseOnlineUsers.forEach(usr => {
            updateFriendStatus(usr, true, Date.now());
          });
        }, 3000);
        
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
      } catch {}
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      if (supabaseInterval) clearInterval(supabaseInterval);
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
