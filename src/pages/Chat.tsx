import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faUserPlus, 
  faUsers, 
  faCommentDots, 
  faPaperPlane, 
  faVideo,
  faHandFist
} from '@fortawesome/free-solid-svg-icons';
import { useStore, type FriendUser } from '../store';
import { ClashArena } from '../components/ClashArena';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

interface LocalChatMessage {
  id: string;
  sender: string;
  recipient: string;
  text: string;
  timestamp: number;
}

const STORAGE_KEY = 'skillo_chat_history_v2';

const loadStoredMessages = (currentUsername: string): LocalChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Strict deduplication against duplicate IDs or duplicate messages within 2 seconds
        const seenIds = new Set<string>();
        const deduped: LocalChatMessage[] = [];
        for (const item of parsed) {
          if (!item || !item.id) continue;
          if (seenIds.has(item.id)) continue;
          const isNearbyDuplicate = deduped.some(
            existing => existing.sender === item.sender && 
                        existing.text === item.text && 
                        Math.abs(existing.timestamp - item.timestamp) < 2000
          );
          if (!isNearbyDuplicate) {
            seenIds.add(item.id);
            deduped.push(item);
          }
        }
        return deduped;
      }
    }
  } catch {}

  const partner = currentUsername.toLowerCase() === 'diky' ? 'zahy' : 'diky';
  return [
    {
      id: 'msg_welcome_seed',
      sender: partner,
      recipient: currentUsername.toLowerCase(),
      text: 'Halo! Selamat datang di Skillo Hub. Siap kolaborasi proyek hari ini?',
      timestamp: Date.now() - 3600000,
    }
  ];
};

const saveMessagesToStorage = (msgs: LocalChatMessage[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-250)));
  } catch {}
};

export function Chat() {
  const navigate = useNavigate();
  const { username, userId, friends, friendRequests, sentFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, checkFriendsOnlineStatus, projects, fetchFriendRequests, fetchSentFriendRequests, fetchFriends } = useStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'chat' | 'clash'>('friends');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendUser | null>(null);
  const effectiveSelectedFriend = selectedFriend || friends[0] || null;

  const currentUsername = (username || 'diky').toLowerCase();
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>(() => loadStoredMessages(currentUsername));
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabaseChannelRef = useRef<any>(null);

  // Sync friends status continuously
  useEffect(() => {
    fetchFriends();
    checkFriendsOnlineStatus();
    fetchFriendRequests();
    fetchSentFriendRequests();
    const timer = setInterval(() => {
      checkFriendsOnlineStatus();
      fetchFriendRequests();
      fetchSentFriendRequests();
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchFriends, checkFriendsOnlineStatus, fetchFriendRequests, fetchSentFriendRequests]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeTab]);

  // Real-Time Sync: Supabase Realtime WebSocket (across internet to Dzaky) + BroadcastChannel + Window Storage
  useEffect(() => {
    const myUser = currentUsername;

    // 1. Supabase Realtime Channel
    const isSupabaseConfigured = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
    );

    let supabaseChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        supabaseChannel = supabase.channel('skillo_team_chat', {
          config: { broadcast: { self: false } }
        });
        supabaseChannelRef.current = supabaseChannel;

        supabaseChannel
          .on('broadcast', { event: 'NEW_CHAT_MSG' }, ({ payload }: { payload: LocalChatMessage }) => {
            if (!payload || !payload.id) return;
            const sender = (payload.sender || '').toLowerCase();
            const recipient = (payload.recipient || '').toLowerCase();

            // Only add if this message is for me or from me
            if (sender === myUser || recipient === myUser) {
              setLocalMessages(prev => {
                if (prev.some(m => m.id === payload.id)) return prev;
                if (prev.some(m => m.sender === payload.sender && m.text === payload.text && Math.abs(m.timestamp - payload.timestamp) < 2000)) {
                  return prev;
                }
                const next = [...prev, payload];
                saveMessagesToStorage(next);
                return next;
              });
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('Supabase chat realtime error:', err);
      }
    }

    // 2. Local BroadcastChannel for same-origin tabs/windows
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('skillo_chat_channel');
        bc.onmessage = (event) => {
          const msg = event.data;
          if (msg && msg.type === 'NEW_CHAT_MSG' && msg.payload?.id) {
            const sender = (msg.payload.sender || '').toLowerCase();
            // Don't re-add messages sent by self
            if (sender === myUser) return;

            setLocalMessages(prev => {
              if (prev.some(m => m.id === msg.payload.id)) return prev;
              if (prev.some(m => m.sender === msg.payload.sender && m.text === msg.payload.text && Math.abs(m.timestamp - msg.payload.timestamp) < 2000)) {
                return prev;
              }
              const next = [...prev, msg.payload];
              saveMessagesToStorage(next);
              return next;
            });
          }
        };
      }
    } catch {}

    // 3. Storage event synchronization for multi-window local testing
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setLocalMessages(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
        supabaseChannelRef.current = null;
      }
      if (bc) {
        bc.close();
      }
    };
  }, [currentUsername]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !effectiveSelectedFriend || isSending) return;

    setIsSending(true);
    const myUser = currentUsername;
    const targetUser = effectiveSelectedFriend.username.toLowerCase();

    const newMsgObj: LocalChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      sender: myUser,
      recipient: targetUser,
      text: text,
      timestamp: Date.now(),
    };

    // 1. Deduplicated local state update
    setLocalMessages(prev => {
      if (prev.some(m => m.id === newMsgObj.id)) return prev;
      const next = [...prev, newMsgObj];
      saveMessagesToStorage(next);
      return next;
    });

    setNewMessage('');

    // 2. Broadcast across internet via Supabase WebSocket
    const isSupabaseConfigured = Boolean(
      import.meta.env.VITE_SUPABASE_URL &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
    );

    if (isSupabaseConfigured) {
      try {
        const channel = supabaseChannelRef.current || supabase.channel('skillo_team_chat');
        channel.send({
          type: 'broadcast',
          event: 'NEW_CHAT_MSG',
          payload: newMsgObj,
        });
      } catch (err) {
        console.warn('Supabase message send error:', err);
      }
    }

    setTimeout(() => {
      setIsSending(false);
    }, 150);
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
  const currentFriendUsername = (currentFriendInChat?.username || '').toLowerCase();

  // Filter messages specifically for the selected friend conversation
  const activeConversationMessages = localMessages.filter(m => {
    const s = m.sender.toLowerCase();
    const r = m.recipient.toLowerCase();
    return (s === currentUsername && r === currentFriendUsername) || 
           (s === currentFriendUsername && r === currentUsername);
  });

  return (
    <div className="no-drag mobile-content-container" style={{ padding: '28px 16px 80px', flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header - Symmetrical & Clean */}
      <header className="header-topbar mb-6" style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '16px' }}>
        <div className="flex items-center gap-4">
          <button 
            className="btn" 
            onClick={() => navigate('/')} 
            style={{ 
              padding: '0 12px', 
              height: '34px', 
              fontSize: '12px', 
              fontWeight: 500, 
              gap: '6px', 
              borderRadius: '6px',
              border: '1px solid var(--border-hairline-strong)',
              background: 'var(--surface-input)',
              color: 'var(--text-secondary)'
            }} 
            title="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} />
            <span>Kembali</span>
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: "'Geist', sans-serif" }}>
              Collaboration Hub
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Teman, status kehadiran online & chat tim
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-hairline)', background: 'var(--surface-input)', fontSize: '11px', fontFamily: 'Geist Mono, monospace' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>@</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{username}</span>
            </div>
          )}

          <div className="header-divider" aria-hidden="true" />
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* Sleek Minimalist Segmented Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '6px', padding: '3px', gap: '4px', marginBottom: '16px' }}>
        <button 
          className={activeTab === 'friends' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('friends')}
          style={{ flex: 1, height: '34px', border: 'none', borderRadius: '4px', fontSize: '12.5px', fontWeight: activeTab === 'friends' ? 600 : 500, gap: '6px' }}
        >
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '13px' }} /> Daftar Teman ({friends.length})
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
          style={{ flex: 1, height: '34px', border: 'none', borderRadius: '4px', fontSize: '12.5px', fontWeight: activeTab === 'chat' ? 600 : 500, gap: '6px' }}
        >
          <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '13px' }} /> Ruang Chat
        </button>
        <button 
          className={activeTab === 'clash' ? 'btn-primary' : 'btn'}
          onClick={() => setActiveTab('clash')}
          style={{ flex: 1, height: '34px', border: 'none', borderRadius: '4px', fontSize: '12.5px', fontWeight: activeTab === 'clash' ? 600 : 500, gap: '6px' }}
        >
          <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '13px' }} /> Clash
        </button>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel flex-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
        
        {/* TAB 1: FRIENDS LIST & ONLINE STATUS */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-5" style={{ overflowY: 'auto' }}>
            {/* Search & Add Friend */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                Cari & Tambah Teman Baru
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
                  style={{ height: '38px', fontSize: '13px' }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 16px', height: '38px', whiteSpace: 'nowrap', fontSize: '12px', gap: '6px' }} disabled={isSearching}>
                  <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '13px' }} /> {isSearching ? 'Mencari...' : 'Cari'}
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

            {/* List of Friends with Minimalist Online/Offline Presence Dot */}
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
                    Belum ada rekan tim. Tambahkan teman melalui form di atas.
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
                        borderRadius: '6px'
                      }}
                    >
                      {/* Left: Avatar with Minimalist Dot Indicator + Name */}
                      <div className="flex items-center gap-3" style={{ minWidth: '200px' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <div 
                            style={{ 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '6px', 
                              background: 'var(--surface-card)',
                              border: '1px solid var(--border-hairline-strong)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontFamily: 'Geist Mono, monospace',
                              fontSize: '13px',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {initials}
                          </div>
                          {/* Minimalist Presence Dot: Green glow when online, subtle slate when offline */}
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: f.isOnline ? '#22c55e' : '#64748b',
                              border: '2px solid var(--surface-card)',
                              boxShadow: f.isOnline ? '0 0 6px rgba(34, 197, 94, 0.7)' : 'none'
                            }}
                          />
                        </div>

                        <div style={{ paddingLeft: '10px' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                            <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>@{f.username}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace', marginTop: '1px' }}>
                            {f.role}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0 12px', height: '32px', fontSize: '12px', gap: '5px' }} 
                          onClick={() => handleStartChat(f)}
                        >
                          <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '12px' }} /> Chat
                        </button>
                        <button 
                          className="btn" 
                          style={{ padding: '0 12px', height: '32px', fontSize: '12px', gap: '5px' }} 
                          onClick={() => navigate('/meeting')}
                          title="Ajak ke Focus Room"
                        >
                          <FontAwesomeIcon icon={faVideo} style={{ fontSize: '12px' }} /> Focus Room
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

                        <div style={{ paddingLeft: '10px' }}>
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
            {/* Chat Target Header with Minimalist Dot */}
            {currentFriendInChat ? (
              <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '6px', 
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-hairline-strong)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        fontFamily: 'Geist Mono, monospace',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {currentFriendInChat.name.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Corner Presence Dot */}
                    <span 
                      style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: currentFriendInChat.isOnline ? '#22c55e' : '#64748b',
                        border: '1.5px solid var(--surface-card)',
                        boxShadow: currentFriendInChat.isOnline ? '0 0 6px rgba(34, 197, 94, 0.7)' : 'none'
                      }}
                    />
                  </div>

                  <div style={{ paddingLeft: '10px' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{currentFriendInChat.name}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>@{currentFriendInChat.username}</span>
                      <span 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: currentFriendInChat.isOnline ? '#22c55e' : '#64748b',
                          boxShadow: currentFriendInChat.isOnline ? '0 0 6px rgba(34, 197, 94, 0.75)' : 'none',
                          marginLeft: '2px'
                        }} 
                        title={currentFriendInChat.isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  className="btn" 
                  style={{ padding: '0 12px', height: '32px', fontSize: '12px', gap: '6px', borderRadius: '6px' }} 
                  onClick={() => navigate('/meeting')}
                  title="Mulai Video Call"
                >
                  <FontAwesomeIcon icon={faVideo} style={{ fontSize: '12px', color: 'var(--accent-cyan)' }} />
                  <span>Video Call</span>
                </button>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Pilih rekan tim terlebih dahulu</div>
            )}

            {/* Message Feed: Dedicated 1-on-1 Conversation Only */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 mb-4" style={{ maxHeight: 'calc(100vh - 360px)', padding: '8px 4px' }}>
              {activeConversationMessages.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-placeholder)', fontSize: '12px', fontFamily: 'Geist Mono, monospace' }}>
                  Belum ada pesan dengan @{currentFriendUsername}. Mulai percakapan di bawah.
                </div>
              )}

              {activeConversationMessages.map(m => {
                const isMe = m.sender.toLowerCase() === currentUsername;
                return (
                  <div 
                    key={m.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      width: '100%',
                      margin: '2px 0'
                    }}
                  >
                    <div 
                      style={{ 
                        width: 'fit-content',
                        maxWidth: '75%', 
                        padding: '9px 14px', 
                        borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        backgroundColor: isMe ? 'var(--cta-primary-bg)' : 'var(--surface-input)',
                        color: isMe ? 'var(--cta-primary-text)' : 'var(--text-primary)',
                        border: isMe ? 'none' : '1px solid var(--border-hairline)',
                        fontWeight: 450,
                        fontSize: '13px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'
                      }}
                    >
                      {m.text}
                    </div>
                    <span style={{ 
                      fontSize: '10px', 
                      fontFamily: 'Geist Mono, monospace', 
                      color: 'var(--text-placeholder)', 
                      marginTop: '3px', 
                      padding: '0 4px',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input message form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center" style={{ paddingTop: '8px', borderTop: '1px solid var(--border-hairline)' }}>
              <input 
                type="text" 
                className="input-field flex-1" 
                placeholder={`Kirim pesan ke @${currentFriendInChat?.username || 'rekan'}...`}
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                style={{ height: '40px', fontSize: '13px', borderRadius: '6px' }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={!newMessage.trim() || isSending}
                style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '6px' }}
                title="Kirim pesan (Enter)"
              >
                <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: '13px' }} />
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
