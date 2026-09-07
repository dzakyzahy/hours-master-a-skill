import { useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { playFriendRequest, playAchievement } from '../utils/audio';

export function useFriendRequests() {
  const { isAuthenticated, userId, fetchFriendRequests, fetchFriends } = useStore();

  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    // Initial fetch
    fetchFriends();
    fetchFriendRequests();

    // Listen for incoming friend requests
    const channel = supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch sender info for toast
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', payload.new.sender_id)
            .single();
            
          const senderName = data?.username || 'Seseorang';
          playFriendRequest();
          toast.success(`${senderName} mengirimkan permintaan pertemanan!`, {
            icon: '👋',
            duration: 5000,
            style: {
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }
          });
          
          fetchFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `sender_id=eq.${userId}`,
        },
        async (payload) => {
          // If my request was accepted/rejected by the receiver
          if (payload.new.status === 'accepted') {
            const { data } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', payload.new.receiver_id)
              .single();
            playAchievement();
            toast.success(`${data?.username || 'Teman Anda'} menerima permintaan Anda!`, { icon: '🎉' });
            fetchFriends();
          } else if (payload.new.status === 'rejected') {
            const { data } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', payload.new.receiver_id)
              .single();
            toast.error(`${data?.username || 'Teman Anda'} menolak permintaan Anda.`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // If a request I received was updated (maybe I accepted it from another device)
          fetchFriendRequests();
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, fetchFriendRequests, fetchFriends]);
}
