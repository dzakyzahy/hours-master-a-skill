import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useCallSignaling } from '../hooks/useCallSignaling';
import { showChatMessageNotification, requestCallNotificationPermissions } from '../utils/callNotifications';
import { saveChatMessage, getChatHistory } from '../services/ChatDB';
import { Avatar } from '../components/Avatar';

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
  const location = useLocation();
  const { username, userId, friends, friendRequests, sentFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, checkFriendsOnlineStatus, projects, fetchFriendRequests, fetchSentFriendRequests, fetchFriends } = useStore();
  const initialTab = (location.state as any)?.tab;
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'chat' | 'clash'>(() => {
    if (initialTab === 'clash' || initialTab === 'chat' || initialTab === 'requests' || initialTab === 'friends') {
      return initialTab;
    }
    return 'friends';
  });
  const [prevLocationKey, setPrevLocationKey] = useState(location.key);

  if (location.key !== prevLocationKey) {
    setPrevLocationKey(location.key);
    const requestedTab = (location.state as any)?.tab;
    if (requestedTab && (requestedTab === 'clash' || requestedTab === 'chat' || requestedTab === 'requests' || requestedTab === 'friends')) {
      setActiveTab(requestedTab);
    }
  }
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [communityUsers, setCommunityUsers] = useState<any[]>([]);

  // Friend-request rows carry only ids and usernames, so borrow the photo from the
  // lists already loaded rather than firing another query per card.
  const avatarById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of [...friends, ...communityUsers, ...searchResults]) {
      const value = (u as any).avatar || (u as any).avatar_url;
      if (u?.id && value) map.set(u.id, value);
    }
    return map;
  }, [friends, communityUsers, searchResults]);
  const [selectedFriend, setSelectedFriend] = useState<FriendUser | null>(null);
  const [lobbySearch, setLobbySearch] = useState('');
  const effectiveSelectedFriend = selectedFriend || (typeof window !== 'undefined' && window.innerWidth > 720 && friends.length > 0 ? friends[0] : null);

  const currentUsername = (username || 'diky').toLowerCase();
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>(() => loadStoredMessages(currentUsername));
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const supabaseChannelRef = useRef<any>(null);
  const { initiateCall } = useCallSignaling();

  // Sync friends status continuously with reasonable 8s interval (prevents Supabase rate spikes)
  useEffect(() => {
    requestCallNotificationPermissions();
    fetchFriends();
    checkFriendsOnlineStatus();
    fetchFriendRequests();
    fetchSentFriendRequests();
    const timer = setInterval(() => {
      checkFriendsOnlineStatus();
      fetchFriendRequests();
      fetchSentFriendRequests();
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchFriends, checkFriendsOnlineStatus, fetchFriendRequests, fetchSentFriendRequests]);

  // Scroll to bottom of messages inside feed only (never shifts parent viewport)
  useEffect(() => {
    if (activeTab === 'chat' && effectiveSelectedFriend && chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [localMessages, activeTab, effectiveSelectedFriend]);

  // Load chat history from local database (ChatDB via IndexedDB)
  useEffect(() => {
    if (!userId || !effectiveSelectedFriend) return;
    getChatHistory(userId, effectiveSelectedFriend.id)
      .then(history => {
        if (history && history.length > 0) {
          setLocalMessages(prev => {
            const merged = [...prev];
            for (const item of history) {
              if (!merged.some(m => m.id === item.id)) {
                merged.push({
                  id: item.id,
                  sender: item.senderId === userId ? currentUsername : (effectiveSelectedFriend.username || effectiveSelectedFriend.name || '').toLowerCase(),
                  recipient: item.receiverId === userId ? currentUsername : (effectiveSelectedFriend.username || effectiveSelectedFriend.name || '').toLowerCase(),
                  text: item.text,
                  timestamp: item.timestamp
                });
              }
            }
            return merged.sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      })
      .catch(err => {
        console.warn('Gagal memuat riwayat chat dari ChatDB:', err);
      });
  }, [userId, effectiveSelectedFriend, currentUsername]);

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
                if (userId) {
                  saveChatMessage(userId, {
                    id: payload.id,
                    senderId: payload.sender,
                    receiverId: userId,
                    text: payload.text,
                    timestamp: payload.timestamp,
                    synced: true
                  }).catch(() => {});
                }
                if (sender !== myUser) {
                  playMessageReceived();
                  showChatMessageNotification(payload.sender, payload.text);
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
              if (userId) {
                saveChatMessage(userId, {
                  id: msg.payload.id,
                  senderId: msg.payload.sender,
                  receiverId: userId,
                  text: msg.payload.text,
                  timestamp: msg.payload.timestamp,
                  synced: true
                }).catch(() => {});
              }
              playMessageReceived();
              showChatMessageNotification(msg.payload.sender, msg.payload.text);
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
    const targetUser = (effectiveSelectedFriend.username || effectiveSelectedFriend.name || '').trim().toLowerCase().replace(/^@/, '');

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

    if (userId && effectiveSelectedFriend) {
      saveChatMessage(userId, {
        id: newMsgObj.id,
        senderId: userId,
        receiverId: effectiveSelectedFriend.id,
        text: newMsgObj.text,
        timestamp: newMsgObj.timestamp,
        synced: true,
      }).catch(err => console.warn('Gagal menyimpan pesan ke ChatDB:', err));
    }

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

  const handleDirectCall = (targetFriendUser: FriendUser) => {
    const rId = initiateCall(targetFriendUser);

    const callNotice: LocalChatMessage = {
      id: `msg_call_${Date.now()}`,
      sender: currentUsername,
      recipient: (targetFriendUser.username || targetFriendUser.name || '').toLowerCase(),
      text: `📞 Memulai panggilan video dengan ${targetFriendUser.username.replace(/^@+/, '')}...`,
      timestamp: Date.now(),
    };

    setLocalMessages(prev => {
      const next = [...prev, callNotice];
      saveMessagesToStorage(next);
      return next;
    });

    if (isSupabaseConfigured) {
      try {
        const channel = supabaseChannelRef.current || supabase.channel('skillo_team_chat');
        channel.send({
          type: 'broadcast',
          event: 'NEW_CHAT_MSG',
          payload: callNotice,
        });
      } catch {}
    }

    navigate(`/meeting/${rId}?type=direct&with=${encodeURIComponent(targetFriendUser.username || targetFriendUser.name)}&isCaller=true`);
  };

  const loadCommunityUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, total_hours, avatar_url')
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
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, email, total_hours, avatar_url')
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
        console.warn('Failed to load community users in effect:', err);
      }
    })();
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
        .select('id, username, email, total_hours, avatar_url')
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

  const getLastMessageWith = (friendUsername: string) => {
    const fUser = (friendUsername || '').toLowerCase();
    for (let i = localMessages.length - 1; i >= 0; i--) {
      const m = localMessages[i];
      const s = (m.sender || '').toLowerCase();
      const r = (m.recipient || '').toLowerCase();
      if ((s === currentUsername && r === fUser) || (s === fUser && r === currentUsername)) {
        return m;
      }
    }
    return null;
  };

  const filteredLobbyFriends = friends.filter(f => {
    if (!lobbySearch.trim()) return true;
    const q = lobbySearch.toLowerCase();
    return (f.name || '').toLowerCase().includes(q) || (f.username || '').toLowerCase().includes(q);
  });

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
    <div className="no-drag chat-page-container">
      {/* Header - Unified Single-Row Mobile & Desktop */}
      <header className="chat-header-bar">
        <div className="flex items-center gap-2.5" style={{ minWidth: 0, flex: 1 }}>
          <button 
            className="chat-back-btn" 
            onClick={() => navigate('/')} 
            title="Kembali ke Beranda"
            aria-label="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} />
            <span className="chat-back-label">Kembali</span>
          </button>
          <div className="chat-title-group">
            <h1 className="chat-title">
              Collaboration Hub
            </h1>
            <p className="chat-subtitle">
              Teman, status kehadiran & chat tim
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              title={`Profil Saya (${username}) • Online`}
              aria-label={`Profil Saya (${username})`}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '7px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '12px',
                fontFamily: 'Geist Mono, monospace',
                cursor: 'pointer',
                flexShrink: 0
              }}
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

      {/* Proportional Segmented Tab Bar */}
      <div className="hub-tab-bar">
        <button 
          className={`hub-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: '11.5px' }} />
          <span>Teman</span>
          <span className="hub-tab-badge">{friends.length}</span>
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <span>Permintaan</span>
          {friendRequests.length > 0 && (
            <span className="hub-tab-badge badge-alert">{friendRequests.length}</span>
          )}
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '11.5px' }} />
          <span>Chat</span>
        </button>
        <button 
          className={`hub-tab-btn ${activeTab === 'clash' ? 'active' : ''}`}
          onClick={() => setActiveTab('clash')}
        >
          <FontAwesomeIcon icon={faHandFist} style={{ fontSize: '11.5px' }} />
          <span>Clash</span>
        </button>
      </div>

      {/* Main Responsive Panel */}
      <div className={`chat-main-panel ${activeTab === 'chat' ? 'is-chat-tab' : ''}`}>
        
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
                    {suggestedName}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                <input 
                  type="text" 
                  id="searchUser"
                  name="searchUser"
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
                          <Avatar className="community-avatar" avatar={u.avatar_url} name={u.username} />
                          <div className="community-info">
                            <span className="community-name">{u.username.replace(/^@+/, '')}</span>
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
                  Tidak ditemukan pengguna dengan nama "{searchQuery.replace(/^@/, '')}". 
                  Pengguna lain yang terdaftar di database saat ini: 
                  <strong style={{ color: 'var(--accent-primary)', marginLeft: '4px' }}>
                    {['diky', 'zahy', 'gg442'].filter(u => u !== currentUsername).join(', ')}
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
                          <Avatar className="community-avatar" avatar={u.avatar_url} name={u.username} />
                          <div className="community-info">
                            <span className="community-name">{u.username.replace(/^@+/, '')}</span>
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
                  const displayName = f.name || f.username || 'User';
                  const showHandle = f.username && f.name && f.name.toLowerCase() !== f.username.toLowerCase();

                  return (
                    <div key={f.id} className="friend-card">
                      <div className="friend-card-left">
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar className="friend-avatar" avatar={f.avatar} name={f.username} />
                          <span 
                            style={{
                              position: 'absolute',
                              bottom: '-2px',
                              right: '-2px',
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: f.isOnline ? 'var(--color-success)' : '#94a3b8',
                              border: '1.5px solid var(--surface-card)'
                            }} 
                          />
                        </div>

                        <div className="friend-card-info">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="friend-name">{displayName}</span>
                            {showHandle && (
                              <span className="friend-handle">{f.username.replace(/^@+/, '')}</span>
                            )}
                          </div>
                          <div className="friend-meta">
                            <span style={{ color: f.isOnline ? 'var(--color-success)' : 'var(--text-placeholder)' }}>
                              {f.isOnline ? '● Online' : '○ Offline'}
                            </span>
                            {f.role && <span> • {f.role}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="friend-card-actions">
                        <button 
                          className="btn-primary friend-action-btn" 
                          onClick={() => handleStartChat(f)}
                          title={`Kirim pesan ke ${displayName}`}
                        >
                          <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '12px' }} /> 
                          <span>Chat</span>
                        </button>
                        <button 
                          className="btn friend-action-btn" 
                          onClick={() => handleDirectCall(f)}
                          title={`Panggilan Video Privat dengan ${displayName}`}
                        >
                          <FontAwesomeIcon icon={faVideo} style={{ fontSize: '12px', color: 'var(--accent-primary)' }} /> 
                          <span>Video Call</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {sentFriendRequests.map(req => {
                  return (
                    <div key={`sent-${req.id}`} className="friend-card" style={{ opacity: 0.75 }}>
                      <div className="friend-card-left">
                        <Avatar
                          className="friend-avatar"
                          style={{ color: 'var(--text-secondary)' }}
                          avatar={avatarById.get(req.receiver_id)}
                          name={req.receiver_username}
                        />
                        <div className="friend-card-info">
                          <span className="friend-name">{(req.receiver_username || '').replace(/^@+/, '')}</span>
                          <span className="friend-meta" style={{ color: 'var(--accent-primary)' }}>
                            <FontAwesomeIcon icon={faClock} style={{ fontSize: '10px' }} /> Menunggu persetujuan...
                          </span>
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
                return (
                  <div key={req.id} className="community-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <Avatar
                        className="community-avatar"
                        avatar={avatarById.get(req.sender_id)}
                        name={req.sender_username}
                      />
                      <div className="community-info">
                        <span className="community-name">{(req.sender_username || '').replace(/^@+/, '')}</span>
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
                            toast.success(`Sekarang berteman dengan ${(req.sender_username || '').replace(/^@+/, '')}`);
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
        {/* TAB 2: CHAT LOBBY & ACTIVE ROOM (SPLIT-PANE) */}
        {activeTab === 'chat' && (
          <div className={`chat-layout-split ${effectiveSelectedFriend ? 'has-selected' : ''}`}>
            {/* LOBBY SIDEBAR */}
            <div className="chat-lobby-sidebar">
              <div className="chat-lobby-header">
                <div className="chat-lobby-title-row">
                  <span className="chat-lobby-title">Daftar Obrolan</span>
                  <span className="chat-lobby-count">{friends.length} kontak</span>
                </div>
                <input 
                  type="text"
                  id="lobbySearch"
                  name="lobbySearch"
                  className="chat-lobby-search-input"
                  placeholder="Cari kontak obrolan..."
                  value={lobbySearch}
                  onChange={e => setLobbySearch(e.target.value)}
                />
              </div>

              <div className="chat-lobby-list">
                {friends.length === 0 ? (
                  <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.5 }}>
                    Belum ada kontak obrolan.<br/>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ marginTop: '10px', height: '30px', padding: '0 12px', fontSize: '11px' }}
                      onClick={() => setActiveTab('friends')}
                    >
                      + Tambah Teman
                    </button>
                  </div>
                ) : filteredLobbyFriends.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-placeholder)', fontSize: '12px' }}>
                    Kontak "{lobbySearch}" tidak ditemukan.
                  </div>
                ) : (
                  filteredLobbyFriends.map(f => {
                    const isSelected = effectiveSelectedFriend?.id === f.id;
                    const lastMsg = getLastMessageWith(f.username);
                    const timeStr = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`chat-lobby-item ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedFriend(f)}
                      >
                        <Avatar className="chat-lobby-avatar" avatar={f.avatar} name={f.username}>
                          <span className={`chat-lobby-dot ${f.isOnline ? 'online' : 'offline'}`} />
                        </Avatar>
                        <div className="chat-lobby-info">
                          <div className="chat-lobby-name-row">
                            <span className="chat-lobby-name">{f.name || f.username}</span>
                            {timeStr && <span className="chat-lobby-time">{timeStr}</span>}
                          </div>
                          <span className="chat-lobby-preview">
                            {lastMsg 
                              ? (lastMsg.sender.toLowerCase() === currentUsername ? `Anda: ${lastMsg.text}` : lastMsg.text)
                              : `${f.username.replace(/^@+/, '')} - Ketuk untuk chat`}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTIVE CHAT ROOM PANE */}
            <div className="chat-room-pane">
              {currentFriendInChat ? (
                <>
                  <div className="chat-room-header">
                    <div className="flex items-center gap-2.5" style={{ minWidth: 0, flex: 1 }}>
                      {/* Mobile Back Button */}
                      <button 
                        className="btn chat-room-back-btn"
                        onClick={() => setSelectedFriend(null)}
                        title="Kembali ke Daftar Obrolan"
                        aria-label="Kembali ke Daftar Obrolan"
                      >
                        <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} />
                      </button>

                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar
                          className="chat-lobby-avatar"
                          style={{ width: '36px', height: '36px', fontSize: '12px' }}
                          avatar={currentFriendInChat.avatar}
                          name={currentFriendInChat.name || currentFriendInChat.username}
                        />
                        <span className={`chat-lobby-dot ${currentFriendInChat.isOnline ? 'online' : 'offline'}`} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentFriendInChat.name || currentFriendInChat.username}
                          </span>
                          {currentFriendInChat.name && currentFriendInChat.username && currentFriendInChat.name.toLowerCase() !== currentFriendInChat.username.toLowerCase() && (
                            <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {currentFriendInChat.username.replace(/^@+/, '')}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '10.5px', color: currentFriendInChat.isOnline ? 'var(--color-success)' : 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentFriendInChat.isOnline ? 'var(--color-success)' : '#94a3b8', display: 'inline-block' }} />
                          <span>{currentFriendInChat.isOnline ? 'Online' : 'Offline'}</span>
                        </span>
                      </div>
                    </div>

                    <button 
                      className="btn chat-action-btn" 
                      onClick={() => currentFriendInChat && handleDirectCall(currentFriendInChat)}
                      title="Mulai Video Call Privat"
                      aria-label="Mulai Video Call Privat"
                    >
                      <FontAwesomeIcon icon={faVideo} style={{ fontSize: '12px', color: 'var(--accent-primary)' }} />
                      <span className="chat-action-label">Video Call</span>
                    </button>
                  </div>

                  {/* Message Feed */}
                  <div className="chat-room-feed" ref={chatFeedRef}>
                    {activeConversationMessages.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-placeholder)', fontSize: '12px', fontFamily: 'Geist Mono, monospace' }}>
                        Belum ada pesan dengan {currentFriendUsername.replace(/^@+/, '')}. Mulai percakapan di bawah.
                      </div>
                    ) : (
                      activeConversationMessages.map(m => {
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
                                maxWidth: '82%', 
                                padding: '9px 13px', 
                                borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                backgroundColor: isMe ? 'var(--cta-primary-bg)' : 'var(--surface-input)',
                                color: isMe ? 'var(--cta-primary-text)' : 'var(--text-primary)',
                                border: isMe ? 'none' : '1px solid var(--border-hairline)',
                                fontWeight: 450,
                                fontSize: '13.5px',
                                lineHeight: 1.45,
                                wordBreak: 'break-word',
                                boxShadow: isMe 
                                  ? '0 2px 8px -2px rgba(14, 165, 233, 0.35)' 
                                  : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              {m.text}
                            </div>
                            <span style={{ 
                              fontSize: '10px', 
                              fontFamily: 'Geist Mono, monospace', 
                              color: 'var(--text-placeholder)', 
                              marginTop: '2px', 
                              padding: '0 4px',
                              alignSelf: isMe ? 'flex-end' : 'flex-start'
                            }}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input message form */}
                  <form onSubmit={handleSendMessage} className="chat-room-form">
                    <input 
                      type="text" 
                      id="chatMessage"
                      name="chatMessage"
                      className="chat-room-input" 
                      placeholder={`Kirim pesan ke ${(currentFriendInChat?.username || 'rekan').replace(/^@+/, '')}...`}
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      autoComplete="off"
                    />
                    <button 
                      type="submit" 
                      className="chat-send-btn" 
                      disabled={!newMessage.trim() || isSending}
                      title="Kirim pesan (Enter)"
                      aria-label="Kirim pesan"
                    >
                      <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: '13px' }} />
                    </button>
                  </form>
                </>
              ) : (
                <div className="chat-room-empty">
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '16px', 
                    background: 'var(--surface-input)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid var(--border-hairline)'
                  }}>
                    <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: '24px', color: 'var(--accent-primary)' }} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Lobby Ruang Chat
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: 1.5 }}>
                    Pilih rekan dari daftar obrolan di sebelah kiri untuk mulai mengobrol, berbagi progress belajar, atau panggilan video.
                  </p>
                </div>
              )}
            </div>
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
