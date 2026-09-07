import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { playTimerStart, playTimerStop } from './utils/audio';

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

const DEFAULT_DEMO_PROJECT: Project = {
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
};

function loadUserProjects(userId: string, username?: string): Project[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`projects_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  if (username === 'diky' || userId === 'usr-diky' || userId === 'e2ce644a-dca1-4ae9-9c17-3ea852ba5428') {
    return [DEFAULT_DEMO_PROJECT];
  }
  return [];
}

function saveUserProjects(userId: string, projects: Project[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`projects_${userId}`, JSON.stringify(projects));
  } catch {}
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
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (emailOrUsername: string) => Promise<{ success: boolean; message: string }>;
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
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
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
  timerStartedAt: number | null;
  timerProjectId: string | null;
  lastTimerTick: number | null;
  toggleTimer: (targetProjectId?: string) => Promise<void>;
  setRemoteTimerState: (isActive: boolean) => void;
  tickTimer: () => void;
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
              const userProjects = loadUserProjects(authData.user.id, finalUser);
              
              set({ 
                isAuthenticated: true, 
                biometricVerified: true, 
                userId: authData.user.id, 
                username: finalUser, 
                userEmail: finalEmail, 
                projects: userProjects,
                activeProjectId: userProjects[0]?.id || null,
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
          const fallbackUserId = isDiky ? 'e2ce644a-dca1-4ae9-9c17-3ea852ba5428' : isZahy ? '6b5525ce-a74a-42ee-a50a-0353bccd4d10' : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-0000-0000-${Math.random().toString(16).substring(2, 14)}`);
          const userProjects = loadUserProjects(fallbackUserId, finalUser);
          
          set({ 
            isAuthenticated: true, 
            biometricVerified: true, 
            userId: fallbackUserId, 
            username: finalUser, 
            userEmail: finalEmail, 
            projects: userProjects,
            activeProjectId: userProjects[0]?.id || null,
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

      register: async (email, username, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const cleanPass = password.trim();

        if (!cleanEmail || !cleanUser || !cleanPass) {
          return { success: false, error: 'Semua kolom wajib diisi.' };
        }
        if (cleanUser.length < 3) {
          return { success: false, error: 'Username minimal 3 karakter (huruf, angka, _).' };
        }
        if (cleanPass.length < 6) {
          return { success: false, error: 'Kata sandi minimal 6 karakter.' };
        }

        if (isSupabaseConfigured) {
          try {
            // Check if username is already taken
            const { data: existingUser } = await supabase
              .from('profiles')
              .select('id')
              .ilike('username', cleanUser)
              .maybeSingle();

            if (existingUser) {
              return { success: false, error: 'Username sudah digunakan. Silakan pilih username lain.' };
            }

            // Register in Supabase Auth
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
              email: cleanEmail,
              password: cleanPass,
              options: {
                data: {
                  username: cleanUser,
                }
              }
            });

            if (signUpError) {
              return { success: false, error: signUpError.message || 'Gagal mendaftarkan akun di Supabase.' };
            }

            if (authData?.user) {
              // Ensure profile entry exists with columns matching the database schema
              await supabase.from('profiles').upsert({
                id: authData.user.id,
                username: cleanUser,
                email: cleanEmail,
                total_hours: 0
              }, { onConflict: 'id' });

              set({
                isAuthenticated: true,
                biometricVerified: true,
                userId: authData.user.id,
                username: cleanUser,
                userEmail: cleanEmail,
                projects: [],
                activeProjectId: null,
                friends: []
              });

              saveUserProjects(authData.user.id, []);

              try {
                localStorage.setItem('last_user', cleanUser);
                localStorage.setItem(`presence_${cleanUser}`, Date.now().toString());
              } catch {}

              return { success: true };
            }
          } catch (err: any) {
            console.warn("Supabase registration error, attempting local fallback:", err);
          }
        }

        // Offline / Local registration fallback with valid UUID
        const fallbackUserId = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : '00000000-0000-0000-0000-' + Math.random().toString(16).substring(2, 14);

        set({
          isAuthenticated: true,
          biometricVerified: true,
          userId: fallbackUserId,
          username: cleanUser,
          userEmail: cleanEmail,
          projects: [],
          activeProjectId: null,
          friends: []
        });

        saveUserProjects(fallbackUserId, []);

        try {
          localStorage.setItem('last_user', cleanUser);
          localStorage.setItem(`presence_${cleanUser}`, Date.now().toString());
        } catch {}

        return { success: true };
      },

      resetPassword: async (emailOrUsername) => {
        const query = emailOrUsername.trim().toLowerCase();
        if (!query) {
          return { success: false, message: 'Masukkan email atau username Anda.' };
        }

        if (isSupabaseConfigured) {
          try {
            let targetEmail = query;
            if (!query.includes('@')) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .ilike('username', query)
                .maybeSingle();

              if (profile?.email) {
                targetEmail = profile.email;
              } else {
                return { success: false, message: `Username "${query}" tidak ditemukan di sistem.` };
              }
            }

            const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
              redirectTo: window.location.origin
            });

            if (error) {
              return { success: false, message: error.message || 'Gagal mengirim email reset kata sandi.' };
            }

            return { 
              success: true, 
              message: `Tautan pemulihan kata sandi telah dikirim ke ${targetEmail}. Silakan periksa email Anda.` 
            };
          } catch (err: any) {
            console.warn("Supabase reset password error:", err);
          }
        }

        // Offline mode guidance
        if (query === 'diky' || query === 'zahy') {
          return {
            success: true,
            message: `Akun "${query}" pada mode lokal dapat langsung masuk menggunakan kata sandi default: 123`
          };
        }

        return {
          success: true,
          message: 'Mode lokal aktif: Anda dapat langsung masuk dengan kata sandi yang Anda gunakan saat login sebelumnya.'
        };
      },

      logout: async () => {
        const curr = get().username;
        const uid = get().userId;
        if (uid) {
          saveUserProjects(uid, get().projects);
        }
        try {
          if (curr) {
            localStorage.removeItem(`presence_${curr}`);
          }
        } catch {}
        await supabase.auth.signOut();
        set({ 
          isAuthenticated: false, 
          userId: '', 
          username: '', 
          userEmail: '', 
          biometricVerified: false, 
          projects: [],
          activeProjectId: null,
          friends: [], 
          friendRequests: [] 
        });
      },

      setBiometricVerified: (status) => set({ biometricVerified: status }),
      
      fetchFriends: async () => {
        const uid = get().userId;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
        if (!uid || !isUUID) return;
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
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
        if (!uid || !isUUID) return;
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
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
        if (!uid || !isUUID) return;
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
        let uid = get().userId;
        const currentUsername = get().username;
        if (!uid) return false;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
        if (!isUUID && currentUsername) {
          try {
            const { data: myProf } = await supabase
              .from('profiles')
              .select('id')
              .ilike('username', currentUsername)
              .maybeSingle();

            if (myProf?.id) {
              uid = myProf.id;
              set({ userId: myProf.id });
            }
          } catch {}
        }

        try {
          const { error } = await supabase
            .from('friend_requests')
            .insert({ sender_id: uid, receiver_id: receiverId });

          if (error) {
            console.error('sendFriendRequest error:', error);
            return false;
          }
          return true;
        } catch (err) {
          console.error('sendFriendRequest exception:', err);
          return false;
        }
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
      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

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
      
      addProject: (name, phases) => set((state) => {
        const newProjects = [...state.projects, {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          userId: state.userId,
          name,
          totalHours: 0,
          dailyGoal: 2,
          hoursToday: 0,
          phases,
          lastUpdated: Date.now()
        }];
        saveUserProjects(state.userId, newProjects);
        return { projects: newProjects };
      }),

      updateProject: (id, name, phases) => set((state) => {
        const newProjects = state.projects.map(p => 
          p.id === id 
            ? { ...p, name, phases, lastUpdated: Date.now() }
            : p
        );
        saveUserProjects(state.userId, newProjects);
        return { projects: newProjects };
      }),

      deleteProject: (id) => set((state) => {
        const newProjects = state.projects.map(p => p.id === id ? { ...p, deletedAt: Date.now() } : p);
        saveUserProjects(state.userId, newProjects);
        return {
          projects: newProjects,
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
        };
      }),

      restoreProject: (id) => set((state) => {
        const newProjects = state.projects.map(p => p.id === id ? { ...p, deletedAt: undefined } : p);
        saveUserProjects(state.userId, newProjects);
        return { projects: newProjects };
      }),

      hardDeleteProject: (id) => set((state) => {
        const newProjects = state.projects.filter(p => p.id !== id);
        saveUserProjects(state.userId, newProjects);
        return {
          projects: newProjects,
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
        };
      }),

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
      timerStartedAt: null,
      timerProjectId: null,
      lastTimerTick: null,

      toggleTimer: async (targetProjectId?: string) => {
        const state = get();
        const now = Date.now();

        if (state.activeTimer) {
          // Stopping timer: credit remaining fractional hours
          const projId = state.timerProjectId || state.activeProjectId;
          if (state.lastTimerTick && projId) {
            const diffMs = Math.min(now - state.lastTimerTick, 12 * 3600 * 1000);
            const hoursToAdd = diffMs / 3600000;
            if (hoursToAdd > 0) {
              set((s) => ({
                projects: s.projects.map(p => {
                  if (p.id !== projId) return p;
                  const currentToday = isSameCalendarDay(p.lastUpdated) ? p.hoursToday : 0;
                  return {
                    ...p,
                    totalHours: Math.max(0, p.totalHours + hoursToAdd),
                    hoursToday: Math.max(0, currentToday + hoursToAdd),
                    lastUpdated: now
                  };
                })
              }));
            }
          }

          set({
            activeTimer: false,
            timerStartedAt: null,
            timerProjectId: null,
            lastTimerTick: null
          });

          playTimerStop();
          get().syncTotalHoursToSupabase();

          // Sync timer_state to Supabase
          if (isSupabaseConfigured && projId) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user) {
                await supabase.from('timer_state').upsert({
                  project_id: projId,
                  user_id: authData.user.id,
                  is_active: false,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'project_id, user_id' });
              }
            } catch (e) {
              console.error("Failed to sync timer state", e);
            }
          }
        } else {
          // Starting timer
          const projId = targetProjectId || state.activeProjectId;
          if (!projId) return;

          set({
            activeTimer: true,
            timerStartedAt: now,
            timerProjectId: projId,
            lastTimerTick: now
          });

          playTimerStart();

          if (isSupabaseConfigured) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user) {
                await supabase.from('timer_state').upsert({
                  project_id: projId,
                  user_id: authData.user.id,
                  is_active: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'project_id, user_id' });
              }
            } catch (e) {
              console.error("Failed to sync timer state", e);
            }
          }
        }
      },

      tickTimer: () => {
        const state = get();
        if (!state.activeTimer || !state.lastTimerTick) return;

        const now = Date.now();
        const diffMs = now - state.lastTimerTick;
        if (diffMs < 1000) return;

        const projId = state.timerProjectId || state.activeProjectId;
        if (!projId) return;

        const safeDiffMs = Math.min(diffMs, 12 * 3600 * 1000);
        const hoursToAdd = safeDiffMs / 3600000;

        set((s) => ({
          lastTimerTick: now,
          projects: s.projects.map(p => {
            if (p.id !== projId) return p;
            const currentToday = isSameCalendarDay(p.lastUpdated) ? p.hoursToday : 0;
            return {
              ...p,
              totalHours: Math.max(0, p.totalHours + hoursToAdd),
              hoursToday: Math.max(0, currentToday + hoursToAdd),
              lastUpdated: now
            };
          })
        }));
      },

      setRemoteTimerState: (isActive) => {
        const state = get();
        const now = Date.now();
        if (isActive && !state.activeTimer) {
          set({
            activeTimer: true,
            timerStartedAt: now,
            timerProjectId: state.activeProjectId,
            lastTimerTick: now
          });
        } else if (!isActive && state.activeTimer) {
          set({
            activeTimer: false,
            timerStartedAt: null,
            timerProjectId: null,
            lastTimerTick: null
          });
        }
      },
      
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
        soundEnabled: state.soundEnabled,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        activeTimer: state.activeTimer,
        timerStartedAt: state.timerStartedAt,
        timerProjectId: state.timerProjectId,
        lastTimerTick: state.lastTimerTick,
      }),
    }
  )
);
