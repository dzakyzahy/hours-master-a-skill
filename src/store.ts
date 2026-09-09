import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabaseClient';
import {
  saveProject,
  getProjects,
  removeProject,
  cleanupLegacyDefaultProject,
} from './services/ProjectDB';

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
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  sendFriendRequest: (receiverId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string, senderId: string) => Promise<boolean>;
  rejectFriendRequest: (requestId: string) => Promise<boolean>;
  addFriend: (friend: FriendUser) => void;
  removeFriend: (id: string) => void;
  updateFriendStatus: (username: string, isOnline: boolean, lastSeen?: number) => void;
  checkFriendsOnlineStatus: () => void;

  // Settings
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (t: 'dark' | 'light') => void;
  clockEnabled: boolean;
  toggleClock: () => void;
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
  loadUserProjects: () => Promise<void>;
  syncToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  syncTotalHoursToSupabase: () => Promise<void>;
}

// ================================================================
// STORAGE VERSION — digunakan untuk migrasi data lama
// Naikkan versi ini jika ada perubahan schema pada persisted state
// ================================================================
const STORAGE_VERSION = 2;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      userId: '',
      username: '',
      userEmail: '',
      biometricVerified: false,
      friends: [],

      
      login: async (u, p) => {
        const trimmed = (u || '').trim();
        // Tentukan apakah input adalah email atau username
        const isEmail = trimmed.includes('@');
        const emailToUse = isEmail ? trimmed : null;
        const usernameInput = isEmail ? null : trimmed.toLowerCase();

        // Supabase membutuhkan email untuk signIn
        // Jika user input username, kita lookup email dari profiles
        const isSupabaseConfigured = Boolean(
          import.meta.env.VITE_SUPABASE_URL &&
          !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
        );

        if (isSupabaseConfigured) {
          try {
            let resolvedEmail = emailToUse;

            // Jika input adalah username, cari email dari tabel profiles
            if (!resolvedEmail && usernameInput) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', usernameInput)
                .single();
              resolvedEmail = profileData?.email || null;
            }

            if (!resolvedEmail) {
              // Username tidak ditemukan di database
              return false;
            }

            const { data: authData, error } = await supabase.auth.signInWithPassword({
              email: resolvedEmail,
              password: p,
            });

            if (!error && authData?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, email')
                .eq('id', authData.user.id)
                .single();

              const finalUser = profile?.username || resolvedEmail.split('@')[0];
              const finalEmail = authData.user.email || resolvedEmail;

              set({
                isAuthenticated: true,
                biometricVerified: true,
                userId: authData.user.id,
                username: finalUser,
                userEmail: finalEmail,
                friends: [],
              });
              try {
                localStorage.setItem('last_user', finalUser);
                localStorage.setItem(`presence_${finalUser}`, Date.now().toString());
              } catch {}
              return true;
            }
          } catch (netErr) {
            console.warn('Supabase network error:', netErr);
          }
        }

        // ================================================================
        // Dev-only offline fallback — hanya aktif jika VITE_DEV_EMAIL diset
        // JANGAN digunakan di production build
        // ================================================================
        const devEmail = import.meta.env.VITE_DEV_EMAIL;
        const devPassword = import.meta.env.VITE_DEV_PASSWORD;
        if (devEmail && devPassword && trimmed === devEmail && p === devPassword) {
          const devUsername = devEmail.split('@')[0];
          set({
            isAuthenticated: true,
            biometricVerified: true,
            userId: `dev-${devUsername}`,
            username: devUsername,
            userEmail: devEmail,
            friends: [],
          });
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
      
      friendRequests: [],
      
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

      addFriend: (friend) => set(state => {
        if (state.friends.some(f => f.username.toLowerCase() === friend.username.toLowerCase())) {
          return state;
        }
        return { friends: [...state.friends, friend] };
      }),

      removeFriend: (id) => set(state => ({
        friends: state.friends.filter(f => f.id !== id)
      })),

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
            const isOnline = Boolean(lastSeen && (now - lastSeen) < 12000);
            return { ...f, isOnline, lastSeen };
          })
        }));
      },
      
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (t: 'dark' | 'light') => set({ theme: t }),
      clockEnabled: true,
      toggleClock: () => set((state) => ({ clockEnabled: !state.clockEnabled })),

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

        const isSupabaseConfigured = Boolean(
          import.meta.env.VITE_SUPABASE_URL && 
          !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
        );
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
        const isSupabaseConfigured = Boolean(
          import.meta.env.VITE_SUPABASE_URL && 
          !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
        );
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

        const isSupabaseConfigured = Boolean(
          import.meta.env.VITE_SUPABASE_URL && 
          !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
        );
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

        if (!key && import.meta.env.VITE_GEMINI_API_KEY) {
          key = import.meta.env.VITE_GEMINI_API_KEY;
        }

        if (key && key !== get().geminiApiKey) {
          set({ geminiApiKey: key });
        }
        return key || '';
      },

      // Projects awalnya kosong — di-load dari ProjectDB (LocalForage) setelah login
      // Ini mencegah data hardcoded muncul untuk semua user baru
      projects: [],
      activeProjectId: null,

      setActiveProject: (id) => set({ activeProjectId: id }),

      addProject: (name, phases) => {
        const state = get();
        const newProject: Project = {
          id: Date.now().toString(),
          userId: state.userId,
          name,
          totalHours: 0,
          dailyGoal: 2,
          hoursToday: 0,
          phases,
          lastUpdated: Date.now(),
        };
        set((s) => ({ projects: [...s.projects, newProject] }));
        // Simpan ke LocalForage juga
        if (state.userId) {
          saveProject(state.userId, newProject).catch(console.error);
        }
      },

      updateProject: (id, name, phases) => {
        const state = get();
        const updated = state.projects.map((p) =>
          p.id === id ? { ...p, name, phases, lastUpdated: Date.now() } : p
        );
        set({ projects: updated });
        const updatedProject = updated.find((p) => p.id === id);
        if (updatedProject && state.userId) {
          saveProject(state.userId, updatedProject).catch(console.error);
        }
      },

      deleteProject: (id) => {
        const state = get();
        const updated = state.projects.map((p) =>
          p.id === id ? { ...p, deletedAt: Date.now() } : p
        );
        set({ projects: updated, activeProjectId: state.activeProjectId === id ? null : state.activeProjectId });
        const softDeleted = updated.find((p) => p.id === id);
        if (softDeleted && state.userId) {
          saveProject(state.userId, softDeleted).catch(console.error);
        }
        get().syncTotalHoursToSupabase();
      },

      restoreProject: (id) => {
        const state = get();
        const updated = state.projects.map((p) =>
          p.id === id ? { ...p, deletedAt: undefined } : p
        );
        set({ projects: updated });
        const restored = updated.find((p) => p.id === id);
        if (restored && state.userId) {
          saveProject(state.userId, restored).catch(console.error);
        }
        get().syncTotalHoursToSupabase();
      },

      hardDeleteProject: (id) => {
        const state = get();
        set({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        });
        if (state.userId) {
          removeProject(state.userId, id).catch(console.error);
        }
        get().syncTotalHoursToSupabase();
      },

      addManualTime: (id, minutes) => {
        const hoursToAdd = minutes / 60;
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === id
              ? { 
                  ...p, 
                  totalHours: p.totalHours + hoursToAdd,
                  hoursToday: p.hoursToday + hoursToAdd,
                  lastUpdated: Date.now()
                }
              : p
          )
        }));
        get().syncTotalHoursToSupabase();
      },

      addHours: (h) => {
        set((state) => {
          const id = state.activeProjectId;
          if (!id) return state;
          return {
            projects: state.projects.map(p => 
              p.id === id 
                ? { ...p, totalHours: p.totalHours + h, hoursToday: p.hoursToday + h, lastUpdated: Date.now() } 
                : p
            )
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
        if (import.meta.env.VITE_SUPABASE_URL && state.activeProjectId) {
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
      
      // Load projects dari LocalForage untuk user yang sedang login
      loadUserProjects: async () => {
        const state = get();
        if (!state.userId) return;
        try {
          // Bersihkan project lama yang hardcoded (fix bug 120 jam)
          await cleanupLegacyDefaultProject();
          const projects = await getProjects(state.userId);
          set({ projects });
        } catch (e) {
          console.error('Gagal load projects dari local storage:', e);
        }
      },

      syncToSupabase: async () => {
        // TODO Sprint 3: Sync ke Supabase untuk user dengan Skillo Cloud subscription
        // const state = get();
        // if (state.cloudSyncEnabled && state.userId) { ... upsert projects ... }
      },

      syncTotalHoursToSupabase: async () => {
        const state = get();
        if (!state.userId) return;
        const total = state.projects.reduce((acc, p) => acc + (p.deletedAt ? 0 : p.totalHours), 0);
        try {
          await supabase.from('profiles').update({ total_hours: total }).eq('id', state.userId);
        } catch (e) {
          // Tidak kritis jika gagal — data tetap aman di local
          console.warn('syncTotalHours gagal:', e);
        }
      },

      loadFromSupabase: async () => {
        // TODO Sprint 3: Load dari Supabase untuk user Skillo Cloud
        // const state = get();
        // if (!state.userId || !state.cloudSyncEnabled) return;
        // const { data } = await supabase.from('projects').select('*').eq('user_id', state.userId);
        // if (data) set({ projects: data });
      }
    }),
    {
      name: 'hours-master-storage',
      version: STORAGE_VERSION,
      // Saat versi berubah, migrate data lama
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migrasi v1 → v2: hapus projects hardcoded dari localStorage
          // Projects sekarang disimpan di IndexedDB via ProjectDB
          return { ...persistedState, projects: [] };
        }
        return persistedState;
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        biometricVerified: state.biometricVerified,
        userId: state.userId,
        username: state.username,
        userEmail: state.userEmail,
        theme: state.theme,
        clockEnabled: state.clockEnabled,
        // Projects TIDAK di-persist di localStorage lagi
        // Disimpan di IndexedDB via ProjectDB (per-user, lebih aman)
        activeProjectId: state.activeProjectId,
        geminiApiKey: state.geminiApiKey,
      }),
    }
  )
);
