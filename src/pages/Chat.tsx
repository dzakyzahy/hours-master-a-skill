import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, MessageSquare, Send, Video } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import { MeetingRoom } from '../components/MeetingRoom';

export function Chat() {
  const navigate = useNavigate();
  const { username } = useStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'chat'>('friends');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [inMeeting, setInMeeting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [myUserId, setMyUserId] = useState<string>('');

  const fetchFriendRequests = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase.from('friend_requests')
        .select('*, sender:profiles!sender_id(username, email)')
        .eq('receiver_id', uid)
        .eq('status', 'pending');
      if (data) setFriendRequests(data);
    } catch (err) {
      console.warn("Could not fetch friend requests:", err);
    }
  }, []);

  const fetchFriends = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase.from('friends').select('*').or(`user_id_1.eq.${uid},user_id_2.eq.${uid}`);
      if (data) {
        const friendIds = data.map(f => f.user_id_1 === uid ? f.user_id_2 : f.user_id_1);
        if (friendIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', friendIds);
          if (profiles) setFriends(profiles);
        }
      }
    } catch (err) {
      console.warn("Could not fetch friends:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      const { data: authData } = await supabase.auth.getUser();
      if (!active) return;
      const uid = authData?.user?.id || '';
      setMyUserId(uid);

      if (uid) {
        fetchFriendRequests(uid);
        fetchFriends(uid);
      }
    }
    loadData();

    const friendSub = supabase.channel('friends_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        if (myUserId) fetchFriendRequests(myUserId);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(friendSub);
    };
  }, [fetchFriendRequests, fetchFriends, myUserId]);

  useEffect(() => {
    if (!activeRoom) return;
    
    const fetchMsgs = async () => {
      const { data } = await supabase.from('chat_messages').select('*').eq('room_id', activeRoom.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMsgs();

    const msgSub = supabase.channel(`room_${activeRoom.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom.id}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(msgSub); };
  }, [activeRoom]);

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const { data } = await supabase.from('profiles').select('id, username, email')
      .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq('id', myUserId);
    if (data) setSearchResults(data);
  };

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friend_requests').insert({ sender_id: myUserId, receiver_id: receiverId });
    alert("Request sent!");
  };

  const respondRequest = async (reqId: string, status: 'accepted' | 'rejected') => {
    await supabase.from('friend_requests').update({ status }).eq('id', reqId);
    if (status === 'accepted') {
      const req = friendRequests.find(r => r.id === reqId);
      if (req) {
         await supabase.from('friends').insert({ user_id_1: req.sender_id, user_id_2: req.receiver_id });
         fetchFriends(myUserId);
      }
    }
    fetchFriendRequests(myUserId);
  };

  const startChat = async (friend: any) => {
    // Check if direct room exists (simplified: just create a new room or use existing logic)
    // For simplicity, we just create a room named with their username
    const { data: room } = await supabase.from('chat_rooms').insert({ name: `DM with ${friend.username}` }).select().single();
    if (room) {
      await supabase.from('chat_participants').insert([
        { room_id: room.id, user_id: myUserId },
        { room_id: room.id, user_id: friend.id }
      ]);
      setActiveRoom(room);
      setActiveTab('chat');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;
    await supabase.from('chat_messages').insert({ room_id: activeRoom.id, sender_id: myUserId, content: newMessage });
    setNewMessage('');
  };

  return (
    <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }} className="no-drag">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button className="btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
          <h1 style={{ margin: 0 }}>Collaboration Hub</h1>
        </div>
        {username && (
          <div className="text-xs text-muted font-mono px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60">
            Signed in as: <span className="text-cyan font-bold">{username}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <button className={`btn ${activeTab === 'friends' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('friends')}><Users size={18} className="mr-2"/> Friends</button>
        <button className={`btn ${activeTab === 'chat' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('chat')}><MessageSquare size={18} className="mr-2"/> Active Chat</button>
      </div>

      <div className="glass-panel flex-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-6" style={{ overflowY: 'auto' }}>
            {/* Search & Add */}
            <div>
              <h3 className="mb-2">Add Friend</h3>
              <form onSubmit={searchUsers} className="flex gap-2">
                <input type="text" className="input-field flex-1" placeholder="Search by username or email..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                <button type="submit" className="btn btn-primary">Search</button>
              </form>
              <div className="mt-2 flex flex-col gap-2">
                {searchResults.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--input-bg)' }}>
                    <span>{u.username} <small className="text-muted">({u.email})</small></span>
                    <button className="btn text-cyan" onClick={() => sendRequest(u.id)}><UserPlus size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div>
                <h3 className="mb-2 text-purple">Pending Requests</h3>
                <div className="flex flex-col gap-2">
                  {friendRequests.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--input-bg)' }}>
                      <span>{r.sender?.username} wants to connect</span>
                      <div className="flex gap-2">
                        <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => respondRequest(r.id, 'accepted')}>Accept</button>
                        <button className="btn" style={{ padding: '4px 8px' }} onClick={() => respondRequest(r.id, 'rejected')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div>
              <h3 className="mb-2">My Friends</h3>
              <div className="flex flex-col gap-2">
                {friends.length === 0 ? <p className="text-muted">No friends yet. Search and add some!</p> : null}
                {friends.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-2 rounded" style={{ background: 'var(--input-bg)' }}>
                    <span>{f.username}</span>
                    <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={() => startChat(f)}>
                      <MessageSquare size={16} className="mr-2"/> Message
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            {inMeeting && activeRoom ? (
               <div className="flex-1">
                 <MeetingRoom roomId={activeRoom.id} roomName={activeRoom.name} onLeave={() => setInMeeting(false)} />
               </div>
            ) : !activeRoom ? (
              <div className="flex-1 flex items-center justify-center text-muted">Select a friend to start chatting</div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                  <h3 className="m-0">{activeRoom.name}</h3>
                  <button className="btn btn-primary bg-purple-600 hover:bg-purple-700" onClick={() => setInMeeting(true)}>
                    <Video size={18} className="mr-2"/> Start Meeting
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-2 pr-2">
                  {messages.map(m => (
                    <div key={m.id} className={`p-2 rounded max-w-[80%] ${m.sender_id === myUserId ? 'bg-cyan text-black self-end' : 'bg-gray-800 self-start'}`}>
                      {m.content}
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input type="text" className="input-field flex-1" placeholder="Type a message..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
                  <button type="submit" className="btn btn-primary"><Send size={18} /></button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
