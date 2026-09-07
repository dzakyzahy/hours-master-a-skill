import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faUserPlus, 
  faUsers, 
  faCommentDots, 
  faPaperPlane, 
  faVideo,
  faHandFist,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { useStore, type FriendUser } from '../store';
import { ClashArena } from '../components/ClashArena';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import toast from 'react-hot-toast';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { playMessageSent, playMessageReceived } from '../utils/audio';

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
  const [hasSearched, setHasSearched] = useState(false);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);
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
                if (sender !== myUser) {
                  playMessageReceived();
                }
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
              playMessageReceived();
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
      playMessageSent();
      return next;
    });

    setNewMessage('');

    // 2. Broadcast across internet via Supabase WebSocket
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

  const loadCommunityUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, total_hours')
        .order('username', { ascending: true });

      if (data) {
        const friendIds = new Set(friends.map(f => f.id));
        const myName = currentUsername.toLowerCase();
        const pendingReceiverIds = new Set(sentFriendRequests.map(r => r.receiver_id));

        const available = data
          .filter(u => (u.username || '').toLowerCase() !== myName && !friendIds.has(u.id))
          .map(u => ({
            ...u,
            isPending: pendingReceiverIds.has(u.id)
          }));

        setCommunityUsers(available);
      }
    } catch (err) {
      console.warn('Failed to load community users:', err);
    }
  }, [friends, currentUsername, sentFriendRequests]);

  useEffect(() => {
    let active = true;
    const fetchAsync = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email, total_hours')
          .order('username', { ascending: true });

        if (data && active) {
          const friendIds = new Set(friends.map(f => f.id));
          const myName = currentUsername.toLowerCase();
          const pendingReceiverIds = new Set(sentFriendRequests.map(r => r.receiver_id));

          const available = data
            .filter(u => (u.username || '').toLowerCase() !== myName && !friendIds.has(u.id))
            .map(u => ({
              ...u,
              isPending: pendingReceiverIds.has(u.id)
            }));

          setCommunityUsers(available);
        }
      } catch (err) {
        console.warn('Failed to load community users:', err);
      }
    };
    fetchAsync();
    return () => { active = false; };
  }, [friends, currentUsername, sentFriendRequests]);

  const handleSearchUsers = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase().replace(/^@/, '');
    if (!query) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, total_hours')
        .ilike('username', `%${query}%`)
        .limit(10);
        
      if (error) {
        console.warn("Supabase profile search warning:", error);
      }
        
      if (data) {
        const friendIds = new Set(friends.map(f => f.id));
        const myName = currentUsername.toLowerCase();
        const pendingReceiverIds = new Set(sentFriendRequests.map(r => r.receiver_id));

        const filtered = data
          .filter(u => !friendIds.has(u.id) && (u.username || '').toLowerCase() !== myName)
          .map(u => ({
            ...u,
            isPending: pendingReceiverIds.has(u.id)
          }));

        setSearchResults(filtered);
      } else {
        setSearchResults([]);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, friends, currentUsername, sentFriendRequests]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearchUsers();
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 350);
    return () => clearTimeout(delay);
  }, [searchQuery, handleSearchUsers]);

  const handleSendRequest = async (receiverId: string, receiverUsername: string) => {
    const success = await sendFriendRequest(receiverId);
    if (success) {
      toast.success(`Permintaan pertemanan terkirim ke ${receiverUsername}`);
      setSearchResults(prev => prev.map(item => item.id === receiverId ? { ...item, isPending: true } : item));
      setCommunityUsers(prev => prev.map(item => item.id === receiverId ? { ...item, isPending: true } : item));
      await fetchSentFriendRequests();
      await loadCommunityUsers();
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
            <button
              type="button"
              onClick={() => navigate('/profile')}
              title={`Profil Saya (${username}) • Online`}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '6px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '12px',
                fontFamily: 'Geist Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hairline-strong)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-hairline)'}
            >
              {username.substring(0, 2).toUpperCase()}
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: '-2px', 
                  right: '-2px', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-success)', 
                  border: '1.5px solid var(--surface-card)'
                }} 
              />
            </button>
          )}

          <div className="header-divider" aria-hidden="true" />
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* Sleek Minimalist Segmented Tabs */}
      <div className="hub-tab-bar">
        <button 
          className={`hub-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '12px' }} /> Daftar Teman ({friends.length})
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Permintaan ({friendRequests.length})
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '12px' }} /> Ruang Chat
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'clash' ? 'active' : ''}`}
          onClick={() => setActiveTab('clash')}
        >
          <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '12px' }} /> Clash
        </button>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel flex-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
        
        {/* TAB 1: FRIENDS LIST & ONLINE STATUS */}
        {activeTab === 'friends' && (
          <div className="flex flex-col gap-5" style={{ overflowY: 'auto' }}>
            {/* Search & Add Friend */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                Cari & Tambah Teman Baru
              </label>

              {/* Quick Suggestions Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pengguna di Sistem:</span>
                {['diky', 'zahy', 'gg442'].filter(u => u !== currentUsername).map(suggestedName => (
                  <button
                    key={suggestedName}
                    type="button"
                    className="quick-chip"
                    onClick={() => {
                      setSearchQuery(suggestedName);
                      const filtered = communityUsers.filter(u => (u.username || '').toLowerCase() === suggestedName);
                      if (filtered.length > 0) {
                        setSearchResults(filtered);
                        setHasSearched(true);
                      }
                    }}
                  >
                    @{suggestedName}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ketik username teman (contoh: diky, zahy)..." 
                  value={searchQuery} 
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() === '') {
                      setSearchResults([]);
                      setHasSearched(false);
                    }
                  }} 
                  style={{ flex: 1, height: '40px', fontSize: '13px' }}
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '0 18px', height: '40px', whiteSpace: 'nowrap', fontSize: '12.5px', gap: '6px' }} 
                  disabled={isSearching}
                >
                  <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '13px' }} /> {isSearching ? 'Mencari...' : 'Cari'}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="community-section">
                  <div className="community-section-header">
                    <h3 className="community-section-title">Hasil Pencarian</h3>
                    <span className="community-section-badge">{searchResults.length} ditemukan</span>
                  </div>
                  <div className="community-list">
                    {searchResults.map(u => (
                      <div key={u.id} className="community-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div className="community-avatar">
                            {(u.username || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="community-info">
                            <span className="community-name">@{u.username}</span>
                            {u.email && <span className="community-meta">{u.email}</span>}
                          </div>
                        </div>
                        <button 
                          className={u.isPending ? "btn" : "btn-primary"} 
                          style={{ height: '34px', padding: '0 14px', fontSize: '12px', flexShrink: 0 }}
                          disabled={u.isPending}
                          onClick={() => {
                            if (!u.isPending) {
                              handleSendRequest(u.id, u.username);
                            }
                          }}
                        >
                          {u.isPending ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px' }} /> Menunggu Persetujuan
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '10px' }} /> + Tambah Teman
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Not Found Feedback */}
              {hasSearched && searchResults.length === 0 && searchQuery.trim() !== '' && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--border-hairline)',
                  marginBottom: '18px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}>
                  Tidak ditemukan pengguna dengan nama "@{searchQuery.replace(/^@/, '')}". 
                  Pengguna lain yang terdaftar di database saat ini: 
                  <strong style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>
                    {['diky', 'zahy', 'gg442'].filter(u => u !== currentUsername).map(u => `@${u}`).join(', ')}
                  </strong>
                </div>
              )}

              {/* Community Members List (When Not Searching) */}
              {!hasSearched && communityUsers.length > 0 && (
                <div className="community-section">
                  <div className="community-section-header">
                    <h3 className="community-section-title">
                      Pengguna Terdaftar di Komunitas
                    </h3>
                    <span className="community-section-badge">
                      {communityUsers.length} pengguna
                    </span>
                  </div>

                  <div className="community-list">
                    {communityUsers.map(u => (
                      <div key={u.id} className="community-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div className="community-avatar">
                            {(u.username || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="community-info">
                            <span className="community-name">@{u.username}</span>
                            {u.email && <span className="community-meta">{u.email}</span>}
                          </div>
                        </div>
                        <button 
                          className={u.isPending ? "btn" : "btn-primary"} 
                          style={{ height: '34px', padding: '0 14px', fontSize: '12px', flexShrink: 0 }}
                          disabled={u.isPending}
                          onClick={() => {
                            if (!u.isPending) {
                              handleSendRequest(u.id, u.username);
                            }
                          }}
                        >
                          {u.isPending ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px' }} /> Menunggu Persetujuan
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: '10px' }} /> + Tambah Teman
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List of Friends with Minimalist Online/Offline Presence Dot */}
            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '20px' }}>
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
                              backgroundColor: f.isOnline ? 'var(--color-success)' : '#64748b',
                              border: '1.5px solid var(--surface-card)'
                            }}
                          />
                        </div>

                        <div style={{ paddingLeft: '10px' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                            <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>{f.username}</span>
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
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{req.receiver_username}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'Geist Mono, monospace' }}>
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
            <div className="flex items-center justify-between">
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Permintaan Pertemanan Masuk
              </h2>
              <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
                {friendRequests.length} permintaan
              </span>
            </div>
            
            {friendRequests.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', padding: '24px 16px', textAlign: 'center', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '8px' }}>
                Belum ada permintaan pertemanan baru.
              </p>
            )}

            <div className="community-list">
              {friendRequests.map(req => {
                const initials = (req.sender_username || 'U').substring(0, 2).toUpperCase();
                return (
                  <div key={req.id} className="community-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="community-avatar">
                        {initials}
                      </div>
                      <div className="community-info">
                        <span className="community-name">@{req.sender_username}</span>
                        <span className="community-meta">Mengirim permintaan pertemanan</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className="btn" 
                        style={{ height: '32px', padding: '0 12px', fontSize: '12px', color: 'var(--text-secondary)' }}
                        onClick={async () => {
                          const ok = await rejectFriendRequest(req.id);
                          if (ok) toast.success('Permintaan pertemanan ditolak');
                        }}
                      >
                        Tolak
                      </button>
                      <button 
                        className="btn-primary" 
                        style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                        onClick={async () => {
                          const ok = await acceptFriendRequest(req.id, req.sender_id);
                          if (ok) {
                            toast.success(`Sekarang berteman dengan @${req.sender_username}`);
                          } else {
                            toast.error('Gagal menerima permintaan');
                          }
                        }}
                      >
                        Terima
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                        backgroundColor: currentFriendInChat.isOnline ? 'var(--color-success)' : '#64748b',
                        border: '1.5px solid var(--surface-card)'
                      }}
                    />
                  </div>

                  <div style={{ paddingLeft: '10px' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{currentFriendInChat.name}</span>
                      <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>{currentFriendInChat.username}</span>
                      <span 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          backgroundColor: currentFriendInChat.isOnline ? 'var(--color-success)' : '#64748b',
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
                  <FontAwesomeIcon icon={faVideo} style={{ fontSize: '12px', color: 'var(--accent-primary)' }} />
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
                  Belum ada pesan dengan {currentFriendUsername}. Mulai percakapan di bawah.
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
                placeholder={`Kirim pesan ke ${currentFriendInChat?.username || 'rekan'}...`}
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
