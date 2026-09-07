import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabaseClient';

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
  name: string;
  totalHours: number;
  dailyGoal: number;
  hoursToday: number;
  phases: SkillPhase[];
  lastUpdated: number;
  deletedAt?: number;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  username: string;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setBiometricVerified: (status: boolean) => void;
  biometricVerified: boolean;

  // Settings
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  clockEnabled: boolean;
  toggleClock: () => void;

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
  syncToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: '',
      biometricVerified: false,
      
      login: async (u, p) => {
        let emailToUse = u;
        
        // If it's a username (no @), look up the email
        if (!u.includes('@')) {
          const { data } = await supabase
            .from('profiles')
            .select('email, username')
            .eq('username', u)
            .single();
            
          if (data && data.email) {
            emailToUse = data.email;
          } else {
            // Fallback for hardcoded "zahy" or "diky" if lookup fails or DB not ready
            if (u === 'zahy') emailToUse = 'dzakyzr3@gmail.com';
            if (u === 'diky') emailToUse = 'dikydwi442@gmail.com';
          }
        }
        
        // Use real password if provided, or map '123' to 'zahy123hours' / 'diky123hours' for smooth transition
        let passwordToUse = p;
        if (p === '123') {
           if (u === 'zahy' || emailToUse === 'dzakyzr3@gmail.com') passwordToUse = 'zahy123hours';
           if (u === 'diky' || emailToUse === 'dikydwi442@gmail.com') passwordToUse = 'diky123hours';
        }

        // Check if Supabase is actually configured with real URL
        const isSupabaseConfigured = Boolean(
          import.meta.env.VITE_SUPABASE_URL && 
          !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
        );

        if (isSupabaseConfigured) {
          try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({ 
              email: emailToUse, 
              password: passwordToUse 
            });
            
            if (!error && authData?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', authData.user.id)
                .single();

              set({ isAuthenticated: true, username: profile?.username || u });
              return true;
            }
          } catch (netErr) {
            console.warn("Supabase network error, checking local fallback:", netErr);
          }
        }

        // Offline / Dev fallback for zahy and diky
        const isZahy = (u === 'zahy' || emailToUse === 'dzakyzr3@gmail.com') && (p === '123' || p === 'zahy123hours');
        const isDiky = (u === 'diky' || emailToUse === 'dikydwi442@gmail.com') && (p === '123' || p === 'diky123hours');
        
        if (isZahy || isDiky) {
          set({ isAuthenticated: true, username: u === 'diky' ? 'diky' : 'zahy' });
          return true;
        }

        return false;
      },
      logout: async () => {
        await supabase.auth.signOut();
        set({ isAuthenticated: false, username: '', biometricVerified: false });
      },
      setBiometricVerified: (status) => set({ biometricVerified: status }),
      
      theme: 'dark',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      clockEnabled: true,
      toggleClock: () => set((state) => ({ clockEnabled: !state.clockEnabled })),

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

      setActiveProject: (id) => {
        set({ activeProjectId: id });
        get().syncToSupabase();
      },
      
      addProject: (name, phases) => set((state) => ({
        projects: [...state.projects, {
          id: Date.now().toString(),
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
        get().syncToSupabase();
      },

      addHours: (h) => {
        const state = get();
        const id = state.activeProjectId;
        if (!id) return;
        set((state) => ({
          projects: state.projects.map(p => 
            p.id === id 
              ? { ...p, totalHours: p.totalHours + h, hoursToday: p.hoursToday + h, lastUpdated: Date.now() } 
              : p
          )
        }));
        get().syncToSupabase();
      },

      setTotalHours: (h) => set((state) => {
        const id = state.activeProjectId;
        if (!id) return state;
        return {
          projects: state.projects.map(p => 
            p.id === id ? { ...p, totalHours: h, lastUpdated: Date.now() } : p
          )
        };
      }),

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
      
      syncToSupabase: async () => {
        const state = get();
        if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project')) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              const totalHours = state.projects.reduce((acc, p) => acc + p.totalHours, 0);
              const activeProj = state.projects.find(p => p.id === state.activeProjectId);
              await supabase.from('profiles').update({
                total_hours: totalHours,
                current_skill: activeProj ? activeProj.name : null
              }).eq('id', authData.user.id);
            }
          } catch (e) {
            console.error("Supabase sync error:", e);
          }
        }
      },
      
      loadFromSupabase: async () => {
        if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('your-project')) {
           // Fetch from Supabase and set() here
           console.log("Loading from Supabase...");
        }
      }
    }),
    {
      name: 'hours-master-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        theme: state.theme,
        clockEnabled: state.clockEnabled,
        projects: state.projects,
        activeProjectId: state.activeProjectId
      }),
    }
  )
);
