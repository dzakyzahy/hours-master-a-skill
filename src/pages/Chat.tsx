import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, MessageSquare, Send, Video, Swords } from 'lucide-react';
import { useStore, type FriendUser } from '../store';
import { ClashArena } from '../components/ClashArena';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface LocalChatMessage {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: number;
}

export function Chat() {
  const navigate = useNavigate();
  const { username, userId, friends, friendRequests, sentFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, checkFriendsOnlineStatus, projects, fetchFriendRequests, fetchSentFriendRequests, fetchFriends } = useStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'chat' | 'clash'>('friends');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendUser | null>(null);
  const effectiveSelectedFriend = selectedFriend || friends[0] || null;

  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: username === 'diky' ? 'zahy' : 'diky',
      recipient: username || 'diky',
      text: 'Halo! Selamat datang di Skillo Hub. Siap kolaborasi proyek hari ini?',
      timestamp: Date.now() - 3600000,
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync friends status continuously
  useEffect(() => {
    checkFriendsOnlineStatus();
    fetchFriendRequests();
    fetchSentFriendRequests();
    const timer = setInterval(() => {
      checkFriendsOnlineStatus();
      fetchFriendRequests();
      fetchSentFriendRequests();
    }, 3000);
    return () => clearInterval(timer);
  }, [checkFriendsOnlineStatus, fetchFriendRequests, fetchSentFriendRequests]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeTab]);

  // Broadcast channel for real-time global chat across devices
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase.channel('global-chat')
        .on('broadcast', { event: 'NEW_CHAT_MSG' }, (payload) => {
          setLocalMessages(prev => [...prev, payload.payload]);
        })
        .subscribe();
    } catch (e) {
      console.error('Chat sync error', e);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !effectiveSelectedFriend) return;

    const newMsgObj: LocalChatMessage = {
      id: 'msg_' + Date.now(),
      sender: username || 'diky',
      recipient: effectiveSelectedFriend.username,
      text: newMessage.trim(),
      timestamp: Date.now(),
    };

    setLocalMessages(prev => [...prev, newMsgObj]);

    // Broadcast globally via Supabase
    try {
      supabase.channel('global-chat').send({
        type: 'broadcast',
        event: 'NEW_CHAT_MSG',
        payload: newMsgObj
      });
    } catch {}

    setNewMessage('');
  };

  const handleStartChat = (friend: FriendUser) => {
    setSelectedFriend(friend);
    setActiveTab('chat');
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearchUsers();
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .neq('id', userId)
        .ilike('username', `%${searchQuery.trim()}%`)
        .limit(5);
        
      if (data) {
        const friendIds = friends.map(f => f.id);
        const filtered = data.filter(u => !friendIds.includes(u.id));

        if (filtered.length > 0) {
          // Check for pending requests
          const { data: pendingReqs } = await supabase
            .from('friend_requests')
            .select('receiver_id')
            .eq('sender_id', userId)
            .eq('status', 'pending');
          
          const pendingIds = new Set((pendingReqs || []).map(r => r.receiver_id));
          
          setSearchResults(filtered.map(u => ({
            ...u,
            isPending: pendingIds.has(u.id)
          })));
        } else {
          setSearchResults([]);
        }
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (receiverId: string, receiverUsername: string) => {
    const success = await sendFriendRequest(receiverId);
    if (success) {
      toast.success(`Permintaan pertemanan terkirim ke @${receiverUsername}`);
      setSearchResults(prev => prev.map(item => item.id === receiverId ? { ...item, isPending: true } : item));
    } else {
      toast.error('Gagal mengirim permintaan pertemanan');
    }
  };

  const currentFriendInChat = friends.find(f => f.username.toLowerCase() === effectiveSelectedFriend?.username.toLowerCase()) || effectiveSelectedFriend;

  return (
    <div className="no-drag mobile-content-container" style={{ padding: '28px 16px 80px', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => navigate('/')} style={{ padding: '0 12px', height: '36px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)' }}>
              Collaboration Hub
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Teman, status kehadiran online & chat tim
            </p>
          </div>
        </div>

        {username && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-hairline)', background: 'var(--surface-input)', fontSize: '11px', fontFamily: 'Geist Mono, monospace' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Masuk sebagai:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }} className="capitalize">{username}</span>
          </div>
        )}
      </div>

      {/* Sleek Minimalist Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: '6px', padding: '3px', gap: '4px', marginBottom: '16px' }}>
        <button 
          className={activeTab === 'friends' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('friends')}
          style={{ flex: 1, height: '36px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}
        >
          <Users size={15} /> Daftar Teman ({friends.length})
        </button>
        <button 
          className={activeTab === 'requests' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('requests')}
          style={{ flex: 1, height: '36px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}
        >
          Permintaan ({friendRequests.length})
        </button>
        <button 
          className={activeTab === 'chat' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('chat')}
          style={{ flex: 1, height: '36px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}
        >
          <MessageSquare size={15} /> Ruang Chat
        </button>
        <button 
          className={activeTab === 'clash' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('clash')}
          style={{ flex: 1, height: '36px', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}
        >
          <Swords size={15} /> Clash
        </button>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel flex-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px' }}>
        
        {/* TAB 1: FRIENDS LIST & ONLINE STATUS */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-6" style={{ overflowY: 'auto' }}>
            {/* Search & Add Friend */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Cari Teman
              </label>
              <form onSubmit={handleSearchUsers} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  className="input-field flex-1" 
                  placeholder="Ketik username teman..." 
                  value={searchQuery} 
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() === '') {
                      setSearchResults([]);
                    }
                  }} 
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 16px', height: '40px', whiteSpace: 'nowrap' }} disabled={isSearching}>
                  <UserPlus size={15} /> {isSearching ? 'Mencari...' : 'Cari'}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="flex flex-col gap-2 mb-6 p-4 rounded-lg bg-slate-800/40 border border-slate-700/50">
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Hasil Pencarian</h3>
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-slate-800/60 rounded border border-slate-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center font-bold text-xs uppercase">{u.username.substring(0,2)}</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">@{u.username}</span>
                        </div>
                      </div>
                      <button 
                        className="btn-primary text-xs px-3 py-1 h-auto" 
                        disabled={u.isPending}
                        onClick={() => {
                          if (!u.isPending) {
                            handleSendRequest(u.id, u.username);
                          }
                        }}
                      >
                        {u.isPending ? 'Menunggu...' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List of Friends with Live Online / Offline Presence */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Teman & Rekan Tim
                </h2>
                <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                  {friends.filter(f => f.isOnline).length} sedang online
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {friends.length === 0 && sentFriendRequests.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                    Belum ada teman. Tambahkan teman melalui form di atas.
                  </p>
                )}

                {friends.map(f => {
                  const initials = f.name.substring(0, 2).toUpperCase();
                  return (
                    <div 
                      key={f.id} 
                      style={{ 
                        padding: '12px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px'
                      }}
                    >
                      {/* Left: Avatar + Info */}
                      <div className="flex items-center gap-3" style={{ minWidth: '200px' }}>
                        <div style={{ position: 'relative' }}>
                          <div 
                            style={{ 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '4px', 
                              background: 'var(--surface-card)',
                              border: '1px solid var(--border-hairline-strong)',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontFamily: 'Geist Mono, monospace',
                              fontSize: '13px',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {initials}
                          </div>
                          {/* Online Badge Dot */}
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: f.isOnline ? '#4ade80' : '#64748b',
                              border: '1.5px solid var(--surface-card)'
                            }}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{f.name}</span>
                            <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>@{f.username}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {f.isOnline ? (
                              <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'Geist Mono, monospace' }}>
                                ● Online
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>
                                ○ Offline
                              </span>
                            )}
                            <span style={{ color: 'var(--border-hairline-strong)' }}>·</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>{f.role}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0 12px', height: '32px', fontSize: '12px' }} 
                          onClick={() => handleStartChat(f)}
                        >
                          <MessageSquare size={13} /> Chat
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0 12px', height: '32px', fontSize: '12px' }} 
                          onClick={() => navigate('/meeting')}
                          title="Ajak ke Focus Room"
                        >
                          <Video size={13} /> Focus Room
                        </button>
                      </div>
                    </div>
                  );
                })}

                {sentFriendRequests.map(req => {
                  const initials = (req.receiver_username || '?').substring(0, 2).toUpperCase();
                  return (
                    <div 
                      key={`sent-${req.id}`} 
                      style={{ 
                        padding: '12px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '4px',
                        opacity: 0.7
                      }}
                    >
                      <div className="flex items-center gap-3" style={{ minWidth: '200px' }}>
                        <div style={{ position: 'relative' }}>
                          <div 
                            style={{ 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '4px', 
                              background: 'var(--surface-card)',
                              border: '1px solid var(--border-hairline-strong)',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontFamily: 'Geist Mono, monospace',
                              fontSize: '13px',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {initials}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>@{req.receiver_username}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontFamily: 'Geist Mono, monospace' }}>
                              Menunggu Persetujuan...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* SENT PENDING FRIEND REQUESTS */}
                {sentFriendRequests.map(req => {
                  const initials = (req.receiver_username || '?').substring(0, 2).toUpperCase();
                  return (
                    <div 
                      key={`sent-${req.id}`} 
                      style={{ 
                        padding: '12px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        background: 'var(--surface-input)',
                        border: '1px dashed var(--border-hairline-strong)',
                        borderRadius: '4px',
                        opacity: 0.7
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '4px', 
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-hairline-strong)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontFamily: 'Geist Mono, monospace',
                            fontSize: '13px',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>@{req.receiver_username}</span>
                          <span style={{ fontSize: '11px', color: '#60a5fa' }}>Menunggu Persetujuan...</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: REQUESTS */}
        {activeTab === 'requests' && (
          <div className="flex flex-col gap-4" style={{ overflowY: 'auto' }}>
            <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Permintaan Pertemanan
            </h2>
            
            {friendRequests.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '16px', textAlign: 'center' }}>
                Belum ada permintaan masuk.
              </p>
            )}

            {friendRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded border border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">@{req.sender_username}</span>
                  <span className="text-xs text-slate-400">Ingin menjadi teman Anda</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-900/50 px-3 py-1 rounded"
                    onClick={() => rejectFriendRequest(req.id)}
                  >
                    Tolak
                  </button>
                  <button 
                    className="btn bg-green-900/30 text-green-400 hover:bg-green-900/60 border border-green-900/50 px-3 py-1 rounded"
                    onClick={() => acceptFriendRequest(req.id, req.sender_id)}
                  >
                    Terima
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: ACTIVE CHAT ROOM */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full" style={{ minHeight: '350px' }}>
            {/* Chat Target Header */}
            {currentFriendInChat ? (
              <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ position: 'relative' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '4px', 
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-hairline-strong)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '12px',
                        fontFamily: 'Geist Mono, monospace',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {currentFriendInChat.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span 
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: currentFriendInChat.isOnline ? '#4ade80' : '#64748b',
                        border: '1.5px solid var(--surface-card)'
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{currentFriendInChat.name}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>@{currentFriendInChat.username}</span>
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace' }}>
                      {currentFriendInChat.isOnline ? (
                        <span style={{ color: '#4ade80' }}>● Active Now</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>○ Offline</span>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  className="btn" 
                  style={{ padding: '0 12px', height: '32px', fontSize: '12px' }} 
                  onClick={() => navigate('/meeting')}
                >
                  <Video size={13} /> Video Call
                </button>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Pilih teman terlebih dahulu</div>
            )}

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 mb-3" style={{ maxHeight: 'calc(100vh - 360px)' }}>
              {localMessages.map(m => {
                const isMe = m.sender.toLowerCase() === (username || 'diky').toLowerCase();
                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      style={{ 
                        maxWidth: '80%', 
                        padding: '9px 13px', 
                        borderRadius: '4px',
                        backgroundColor: isMe ? 'var(--cta-primary-bg)' : 'var(--surface-input)',
                        color: isMe ? 'var(--cta-primary-text)' : 'var(--text-primary)',
                        border: isMe ? 'none' : '1px solid var(--border-hairline)',
                        fontWeight: 400,
                        fontSize: '13px',
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </div>
                    <span style={{ fontSize: '10px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-placeholder)', marginTop: '3px', padding: '0 2px' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                className="input-field flex-1" 
                placeholder={`Kirim pesan ke @${currentFriendInChat?.username || 'teman'}...`}
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!newMessage.trim()}
                style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: CLASH ARENA */}
        {activeTab === 'clash' && (
          <ClashArena 
            friends={friends} 
            myUsername={username || 'You'} 
            myTotalHours={projects.filter(p => !p.userId || p.userId === userId).reduce((acc, p) => acc + (p.deletedAt ? 0 : p.totalHours), 0)} 
          />
        )}
      </div>
    </div>
  );
}
