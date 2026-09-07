import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SkillPhase {
  title: string;
  hoursStart: number;
  hoursEnd: number;
  desc: string;
  id?: string;
  name?: string;
  hoursRequired?: number;
  isCompleted?: boolean;
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  totalHours: number;
  dailyGoal: number;
  hoursToday: number;
  phases: SkillPhase[];
  lastUpdated: number;
  deletedAt?: number;
}

function isSameCalendarDay(timestamp?: number): boolean {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

export interface FriendUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: number;
  totalHours?: number;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender_username?: string;
  receiver_id: string;
  receiver_username?: string;
  status: string;
  created_at: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  userId: string;
  username: string;
  userEmail: string;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setBiometricVerified: (status: boolean) => void;
  biometricVerified: boolean;

  // Friends & Presence
  friends: FriendUser[];
  friendRequests: FriendRequest[];
  sentFriendRequests: FriendRequest[];
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  fetchSentFriendRequests: () => Promise<void>;
  sendFriendRequest: (receiverId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string, senderId: string) => Promise<boolean>;
  rejectFriendRequest: (requestId: string) => Promise<boolean>;
  updateFriendStatus: (username: string, isOnline: boolean, lastSeen?: number) => void;
  checkFriendsOnlineStatus: () => void;

  // Settings
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => Promise<void>;
  clearGeminiApiKey: () => Promise<void>;
  loadGeminiApiKey: () => Promise<string>;

  // Projects
  projects: Project[];
  activeProjectId: string | null;
  
  // Actions
  setActiveProject: (id: string | null) => void;
  addProject: (name: string, phases: SkillPhase[]) => void;
  updateProject: (id: string, name: string, phases: SkillPhase[]) => void;
  deleteProject: (id: string) => void;
  restoreProject: (id: string) => void;
  hardDeleteProject: (id: string) => void;
  addHours: (h: number) => void;
  addManualTime: (id: string, minutes: number) => void;
  setTotalHours: (h: number) => void;
  setDailyGoal: (h: number) => void;
  activeTimer: boolean;
  toggleTimer: () => void;
  setRemoteTimerState: (isActive: boolean) => void;
  syncTotalHoursToSupabase: () => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userId: '',
      username: '',
      userEmail: '',
      biometricVerified: false,
      friends: [],
      friendRequests: [],
      sentFriendRequests: [],

      
      login: async (u, p) => {
        const trimmed = (u || '').trim().toLowerCase();
        let emailToUse = trimmed;
        
        // Identify which user is attempting to log in
        const isDiky = trimmed === 'diky' || trimmed === 'dikydwi442@gmail.com';
        const isZahy = trimmed === 'zahy' || trimmed === 'dzaky' || trimmed === 'dzakyzr3@gmail.com';

        if (isDiky) emailToUse = 'dikydwi442@gmail.com';
        if (isZahy) emailToUse = 'dzakyzr3@gmail.com';

        // Normalize password for dev/offline or transition
        let passwordToUse = p;
        if (p === '123') {
          if (isZahy) passwordToUse = 'zahy123hours';
          if (isDiky) passwordToUse = 'diky123hours';
        }

        const resolvedUsername = isDiky ? 'diky' : isZahy ? 'zahy' : (trimmed.includes('@') ? trimmed.split('@')[0] : trimmed);
        const resolvedEmail = emailToUse;

        if (isSupabaseConfigured) {
          try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({ 
              email: emailToUse, 
              password: passwordToUse 
            });
            
            if (!error && authData?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, email')
                .eq('id', authData.user.id)
                .single();

              const finalUser = profile?.username || resolvedUsername;
              const finalEmail = authData.user.email || profile?.email || resolvedEmail;
              
              set({ 
                isAuthenticated: true, 
                biometricVerified: true,
                userId: authData.user.id,
                username: finalUser,
                userEmail: finalEmail,
                friends: [] 
              });
              try {
                localStorage.setItem('last_user', finalUser);
                localStorage.setItem(`presence_${finalUser}`, Date.now().toString());
              } catch {}
              return true;
            }
          } catch (netErr) {
            console.warn("Supabase network error, checking local fallback:", netErr);
          }
        }

        // Offline / Dev fallback
        if (p && p.length >= 1) {
          const finalUser = isDiky ? 'diky' : isZahy ? 'zahy' : resolvedUsername;
          const finalEmail = isDiky ? 'dikydwi442@gmail.com' : isZahy ? 'dzakyzr3@gmail.com' : resolvedEmail || `${resolvedUsername}@skillo.team`;
          const fallbackUserId = isDiky ? 'usr-diky' : isZahy ? 'usr-zahy' : `usr-${resolvedUsername}`;
          
          set({ 
            isAuthenticated: true, 
            biometricVerified: true,
            userId: fallbackUserId,
            username: finalUser,
            userEmail: finalEmail,
            friends: []
          });
          try {
            localStorage.setItem('last_user', finalUser);
            localStorage.setItem(`presence_${finalUser}`, Date.now().toString());
          } catch {}
          return true;
        }

        return false;
      },

      logout: async () => {
        const curr = get().username;
        try {
          if (curr) {
            localStorage.removeItem(`presence_${curr}`);
          }
        } catch {}
        await supabase.auth.signOut();
        set({ isAuthenticated: false, userId: '', username: '', userEmail: '', biometricVerified: false, friends: [], friendRequests: [] });
      },

      setBiometricVerified: (status) => set({ biometricVerified: status }),
      
      fetchFriends: async () => {
        const uid = get().userId;
        if (!uid) return;
        const { data } = await supabase
          .from('friends')
          .select('id, user_id_1, user_id_2')
          .or(`user_id_1.eq.${uid},user_id_2.eq.${uid}`);
          
        if (data && data.length > 0) {
          const friendIds = data.map(r => r.user_id_1 === uid ? r.user_id_2 : r.user_id_1);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, email, total_hours')
            .in('id', friendIds);
            
          if (profiles) {
            const mapped: FriendUser[] = profiles.map(p => ({
              id: p.id,
              username: p.username,
              name: p.username,
              email: p.email,
              role: 'User',
              isOnline: false,
              totalHours: p.total_hours || 0
            }));
            set({ friends: mapped });
          }
        }
      },
      
      fetchFriendRequests: async () => {
        const uid = get().userId;
        if (!uid) return;
        const { data } = await supabase
          .from('friend_requests')
          .select('*, profiles!sender_id(username)')
          .eq('receiver_id', uid)
          .eq('status', 'pending');
          
        if (data) {
          const reqs = data.map(d => ({
            ...d,
            sender_username: (d.profiles as any)?.username
          }));
          set({ friendRequests: reqs });
        }
      },
      
      fetchSentFriendRequests: async () => {
        const uid = get().userId;
        if (!uid) return;
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*, profiles!receiver_id(username)')
          .eq('sender_id', uid)
          .eq('status', 'pending');
          
        if (error) {
          console.error('Error fetching sent friend requests:', error);
        }
          
        if (data) {
          const reqs = data.map(d => ({
            ...d,
            receiver_username: (d.profiles as any)?.username
          }));
          set({ sentFriendRequests: reqs });
        }
      },
      
      sendFriendRequest: async (receiverId) => {
        const uid = get().userId;
        if (!uid) return false;
        const { error } = await supabase
          .from('friend_requests')
          .insert({ sender_id: uid, receiver_id: receiverId });
        return !error;
      },
      
      acceptFriendRequest: async (requestId, senderId) => {
        const uid = get().userId;
        if (!uid) return false;
        
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
        const { error } = await supabase.from('friends').insert({ user_id_1: senderId, user_id_2: uid });
        
        if (!error) {
          get().fetchFriends();
          get().fetchFriendRequests();
          return true;
        }
        return false;
      },
      
      rejectFriendRequest: async (requestId) => {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);
        if (!error) {
          get().fetchFriendRequests();
          return true;
        }
        return false;
      },

      updateFriendStatus: (username, isOnline, lastSeen) => set(state => ({
        friends: state.friends.map(f => 
          f.username.toLowerCase() === username.toLowerCase() 
            ? { ...f, isOnline, lastSeen: lastSeen ?? f.lastSeen } 
            : f
        )
      })),

      checkFriendsOnlineStatus: () => {
        const now = Date.now();
        set(state => ({
          friends: state.friends.map(f => {
            let lastSeen = f.lastSeen;
            try {
              const lastSeenStr = localStorage.getItem(`presence_${f.username.toLowerCase()}`);
              if (lastSeenStr) {
                lastSeen = Math.max(lastSeen || 0, parseInt(lastSeenStr, 10));
              }
            } catch {}
            const isOnline = Boolean(lastSeen && (now - lastSeen) < 25000);
            return { ...f, isOnline, lastSeen };
          })
        }));
      },
      
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (t: 'dark' | 'light') => set({ theme: t }),

      geminiApiKey: '',
      setGeminiApiKey: async (key: string) => {
        const trimmed = key.trim();
        set({ geminiApiKey: trimmed });
        try {
          if (trimmed) {
            localStorage.setItem('skillo_gemini_key_secure', btoa(trimmed));
          } else {
            localStorage.removeItem('skillo_gemini_key_secure');
          }
        } catch {}

        if (isSupabaseConfigured) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              const { error } = await supabase.from('user_secrets').upsert({
                user_id: authData.user.id,
                secret_type: 'gemini_api_key',
                secret_value: trimmed,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id,secret_type' });

              if (error) {
                await supabase.from('profiles').update({
                  gemini_api_key: trimmed
                }).eq('id', authData.user.id);
              }
            }
          } catch (err) {
            console.warn("Supabase secret sync:", err);
          }
        }
      },

      clearGeminiApiKey: async () => {
        set({ geminiApiKey: '' });
        try {
          localStorage.removeItem('skillo_gemini_key_secure');
        } catch {}
        if (isSupabaseConfigured) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              await supabase.from('user_secrets').delete()
                .eq('user_id', authData.user.id)
                .eq('secret_type', 'gemini_api_key');
            }
          } catch {}
        }
      },

      loadGeminiApiKey: async () => {
        let key = get().geminiApiKey;
        if (!key) {
          try {
            const saved = localStorage.getItem('skillo_gemini_key_secure');
            if (saved) key = atob(saved);
          } catch {}
        }

        if (isSupabaseConfigured) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              const { data } = await supabase.from('user_secrets')
                .select('secret_value')
                .eq('user_id', authData.user.id)
                .eq('secret_type', 'gemini_api_key')
                .single();
              if (data?.secret_value) {
                key = data.secret_value;
              }
            }
          } catch {}
        }

        if (key && key !== get().geminiApiKey) {
          set({ geminiApiKey: key });
        }
        return key || '';
      },

      projects: [
        {
          id: 'default-1',
          name: 'Ethical Hacking',
          totalHours: 120,
          dailyGoal: 2,
          hoursToday: 0.5,
          lastUpdated: Date.now(),
          phases: [
            { title: "Core Foundations & Low-Level Mechanics", hoursStart: 1, hoursEnd: 150, desc: "Networking, OS, Programming for Security." },
            { title: "Web App Security & Vulnerability Analysis", hoursStart: 151, hoursEnd: 300, desc: "OWASP Top 10, Web Fundamentals." },
            { title: "Infrastructure, Network Pentesting & AD", hoursStart: 301, hoursEnd: 480, desc: "Recon, AD Security, Host Exploitation." },
            { title: "Defensive Engineering & Remediation", hoursStart: 481, hoursEnd: 600, desc: "Blue Team, Secure Coding, Reporting." },
            { title: "Real-World App & Public Good", hoursStart: 601, hoursEnd: 750, desc: "Bug Bounty, CVD, Threat Intelligence." },
          ]
        }
      ],
      activeProjectId: null,

      setActiveProject: (id) => set({ activeProjectId: id }),
      
      addProject: (name, phases) => set((state) => ({
        projects: [...state.projects, {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          userId: state.userId,
          name,
          totalHours: 0,
          dailyGoal: 2,
          hoursToday: 0,
          phases,
          lastUpdated: Date.now()
        }]
      })),

      updateProject: (id, name, phases) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id 
            ? { ...p, name, phases, lastUpdated: Date.now() }
            : p
        )
      })),

      deleteProject: (id) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, deletedAt: Date.now() } : p),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
      })),

      restoreProject: (id) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, deletedAt: undefined } : p)
      })),

      hardDeleteProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
      })),

      addManualTime: (id, minutes) => {
        const hoursToAdd = minutes / 60;
        set((state) => ({
          projects: state.projects.map(p => {
            if (p.id !== id) return p;
            const currentToday = isSameCalendarDay(p.lastUpdated) ? p.hoursToday : 0;
            return {
              ...p,
              totalHours: Math.max(0, p.totalHours + hoursToAdd),
              hoursToday: Math.max(0, currentToday + hoursToAdd),
              lastUpdated: Date.now()
            };
          })
        }));
        get().syncTotalHoursToSupabase();
      },

      addHours: (h) => {
        set((state) => {
          const id = state.activeProjectId;
          if (!id) return state;
          return {
            projects: state.projects.map(p => {
              if (p.id !== id) return p;
              const currentToday = isSameCalendarDay(p.lastUpdated) ? p.hoursToday : 0;
              return {
                ...p,
                totalHours: Math.max(0, p.totalHours + h),
                hoursToday: Math.max(0, currentToday + h),
                lastUpdated: Date.now()
              };
            })
          };
        });
        get().syncTotalHoursToSupabase();
      },

      setTotalHours: (h) => {
        set((state) => {
          const id = state.activeProjectId;
          if (!id) return state;
          return {
            projects: state.projects.map(p => 
              p.id === id ? { ...p, totalHours: h, lastUpdated: Date.now() } : p
            )
          };
        });
        get().syncTotalHoursToSupabase();
      },

      setDailyGoal: (h) => set((state) => {
        const id = state.activeProjectId;
        if (!id) return state;
        return {
          projects: state.projects.map(p => 
            p.id === id ? { ...p, dailyGoal: h, lastUpdated: Date.now() } : p
          )
        };
      }),
      activeTimer: false,
      toggleTimer: async () => {
        const state = get();
        const newState = !state.activeTimer;
        set({ activeTimer: newState });
        
        // Push state to Supabase timer_state if configured
        if (isSupabaseConfigured && state.activeProjectId) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              await supabase.from('timer_state').upsert({
                project_id: state.activeProjectId,
                user_id: authData.user.id,
                is_active: newState,
                updated_at: new Date().toISOString()
              }, { onConflict: 'project_id, user_id' });
            }
          } catch(e) { console.error("Failed to sync timer state", e); }
        }
      },
      setRemoteTimerState: (isActive) => set({ activeTimer: isActive }),
      
      syncTotalHoursToSupabase: async () => {
        const state = get();
        if (!state.userId) return;
        const total = state.projects.reduce((acc, p) => acc + (p.deletedAt ? 0 : p.totalHours), 0);
        await supabase.from('profiles').update({ total_hours: total }).eq('id', state.userId);
      }
    }),
    {
      name: 'hours-master-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        biometricVerified: state.biometricVerified,
        userId: state.userId,
        username: state.username,
        userEmail: state.userEmail,
        friends: state.friends,
        theme: state.theme,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
);
