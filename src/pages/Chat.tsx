import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, MessageSquare, Send, Video, Swords, Loader2, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

export function Chat() {
  const navigate = useNavigate();
  const { } = useStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'clash'>('friends');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [myUserId, setMyUserId] = useState<string>('');
  
  const [clashLeaderboard, setClashLeaderboard] = useState<any[]>([]);

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
          const { data: profiles } = await supabase.from('profiles').select('id, username, email').in('id', friendIds);
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

  useEffect(() => {
    if (activeTab !== 'clash' || friends.length === 0 || !myUserId) return;
    
    const fetchClashData = async () => {
      const allIds = [myUserId, ...friends.map(f => f.id)];
      const { data } = await supabase.from('profiles').select('id, username, total_hours, current_skill').in('id', allIds).order('total_hours', { ascending: false });
      if (data) setClashLeaderboard(data);
    };

    fetchClashData();
  }, [activeTab, friends, myUserId]);

  const searchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !myUserId) return;
    
    setIsSearching(true);
    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, email')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', myUserId)
        .limit(5);

      if (users) {
        const { data: existingReqs } = await supabase
          .from('friend_requests')
          .select('receiver_id')
          .eq('sender_id', myUserId)
          .eq('status', 'pending');
        
        const reqIds = new Set(existingReqs?.map(r => r.receiver_id) || []);
        setSearchResults(users.map(u => ({ ...u, requested: reqIds.has(u.id) })));
      }
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (receiverId: string) => {
    if (!myUserId) return;
    await supabase.from('friend_requests').insert({ sender_id: myUserId, receiver_id: receiverId });
    setSearchResults(prev => prev.map(u => u.id === receiverId ? { ...u, requested: true } : u));
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
    setFriendRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const startChat = async (friend: any) => {
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*, chat_room_participants!inner(user_id)')
      .eq('is_group', false);
      
    let room = rooms?.find(r => r.chat_room_participants.some((p: any) => p.user_id === friend.id));

    if (!room) {
      const { data: newRoom } = await supabase.from('chat_rooms').insert({ name: `Chat with ${friend.username}`, is_group: false }).select().single();
      if (newRoom) {
        await supabase.from('chat_room_participants').insert([
          { room_id: newRoom.id, user_id: myUserId },
          { room_id: newRoom.id, user_id: friend.id }
        ]);
        room = newRoom;
      }
    }
    setActiveRoom({ ...room, name: friend.username });
    setActiveTab('chat');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !myUserId) return;
    
    await supabase.from('chat_messages').insert({
      room_id: activeRoom.id,
      sender_id: myUserId,
      content: newMessage.trim()
    });
    setNewMessage('');
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <div className="w-80 border-r border-slate-700/50 bg-slate-800/20 flex flex-col">
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn p-2 hover:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold m-0">Collaboration Hub</h2>
        </div>
        
        <div className="flex p-2 bg-slate-800/40 m-4 rounded-lg">
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'friends' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            onClick={() => { setActiveTab('chat'); if(!activeRoom && friends.length>0) startChat(friends[0]); }}
          >
            Active Chat
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'clash' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab('clash')}
          >
            Clash Arena
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {activeTab === 'friends' && (
            <div className="flex flex-col gap-2">
              {friends.map(f => (
                <button 
                  key={f.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${activeRoom?.name === f.username ? 'bg-purple-500/20 border border-purple-500/50' : 'hover:bg-slate-800 border border-transparent'}`}
                  onClick={() => startChat(f)}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold">
                    {f.username.substring(0,2).toUpperCase()}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold">{f.username}</div>
                    <div className="text-xs text-slate-400 truncate">{f.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {activeTab === 'chat' && activeRoom && (
             <div className="p-4 text-center text-slate-400 text-sm">
               Chatting with <span className="font-bold text-purple-400">{activeRoom.name}</span>
             </div>
          )}
          {activeTab === 'clash' && (
             <div className="p-4 text-center text-slate-400 text-sm">
               Leaderboard active.
             </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 relative">
        {activeTab === 'friends' && (
          <div className="max-w-2xl mx-auto flex flex-col h-full overflow-y-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><UserPlus className="text-purple-400" /> Find Friends</h2>
              <form onSubmit={searchUsers} className="flex gap-2">
                <input 
                  type="text" 
                  className="input-field flex-1 bg-slate-800/50 border-slate-700 focus:border-purple-500" 
                  placeholder="Search by username..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <button type="submit" className="btn btn-primary bg-purple-600 hover:bg-purple-700" disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
                </button>
              </form>
              <div className="mt-4 flex flex-col gap-2">
                {searchResults.map(u => {
                  const isFriend = friends.some(f => f.id === u.id);
                  return (
                    <div key={u.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 transition-colors hover:bg-slate-800/50">
                      <div>
                        <div className="font-medium text-white">{u.username}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                      {isFriend ? (
                        <span className="text-xs text-green-400 flex items-center gap-1 bg-green-400/10 px-2 py-1 rounded">
                          <Check size={14} /> Friends
                        </span>
                      ) : (
                        <button 
                          className={`btn ${u.requested ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'btn-primary bg-purple-600 hover:bg-purple-700'}`}
                          style={{ padding: '6px 12px' }}
                          onClick={() => !u.requested && sendRequest(u.id)}
                          disabled={u.requested}
                        >
                          {u.requested ? 'Requested' : <><UserPlus size={16} className="mr-2"/> Add</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {friendRequests.length > 0 && (
              <div>
                <h3 className="mb-2 text-purple-400 flex items-center gap-2">Pending Requests <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">{friendRequests.length}</span></h3>
                <div className="flex flex-col gap-2">
                  {friendRequests.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                      <span><span className="font-semibold text-white">{r.sender?.username}</span> wants to connect</span>
                      <div className="flex gap-2">
                        <button className="btn btn-primary bg-purple-600 hover:bg-purple-700" style={{ padding: '6px 12px' }} onClick={() => respondRequest(r.id, 'accepted')}>Accept</button>
                        <button className="btn hover:bg-slate-700" style={{ padding: '6px 12px' }} onClick={() => respondRequest(r.id, 'rejected')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="mb-2">My Friends</h3>
              <div className="flex flex-col gap-2">
                {friends.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-700 rounded-lg text-slate-400">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    No friends yet. Search and add some!
                  </div>
                ) : null}
                {friends.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
                    <span className="font-medium text-white">{f.username}</span>
                    <button className="btn btn-primary" style={{ padding: '6px 16px' }} onClick={() => startChat(f)}>
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
            {!activeRoom ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                <MessageSquare size={48} className="opacity-20" />
                <p>Select a friend from the Friends tab to start chatting</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700/50">
                  <h3 className="m-0 text-lg font-bold">{activeRoom.name}</h3>
                  <button className="btn btn-primary bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/20" onClick={() => navigate(`/meeting/${activeRoom.id}`)}>
                    <Video size={18} className="mr-2"/> Start Meeting
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 pr-2">
                  {messages.map(m => (
                    <div key={m.id} className={`p-3 rounded-2xl max-w-[80%] ${m.sender_id === myUserId ? 'bg-purple-600 ml-auto text-white' : 'bg-slate-700/50 border border-slate-600/50 text-slate-200'}`}>
                      {m.content}
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input type="text" className="input-field flex-1" placeholder="Type a message..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
                  <button type="submit" className="btn btn-primary px-6" disabled={!newMessage.trim()}>
                    <Send size={18} className={newMessage.trim() ? '' : 'opacity-50'} />
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {activeTab === 'clash' && (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 rounded-full mb-3 border border-rose-500/20">
                <Swords size={32} className="text-rose-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Clash Arena</h2>
              <p className="text-slate-400">Compare your progress with friends. Keep the streak alive!</p>
            </div>

            <div className="flex flex-col gap-3 max-w-3xl mx-auto w-full">
              {clashLeaderboard.length === 0 ? (
                <div className="text-center p-8 text-slate-500">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                  Loading leaderboard...
                </div>
              ) : (
                clashLeaderboard.map((user, idx) => {
                  const isMe = user.id === myUserId;
                  const totalHours = user.total_hours || 0;
                  const maxHours = clashLeaderboard[0]?.total_hours || 1;
                  const percentage = Math.max(5, Math.min(100, (totalHours / maxHours) * 100));

                  return (
                    <div key={user.id} className={`p-4 rounded-xl border relative overflow-hidden ${isMe ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-700/50 bg-slate-800/30'}`}>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-8 text-center font-bold text-lg ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className={`font-bold text-lg ${isMe ? 'text-purple-400' : 'text-white'}`}>
                              {user.username} {isMe && '(You)'}
                            </span>
                            <span className="font-mono font-bold text-slate-300">{totalHours.toFixed(1)} hrs</span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">
                            Current: {user.current_skill || 'No active project'}
                          </div>
                          <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${isMe ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-slate-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
