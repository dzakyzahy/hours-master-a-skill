import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faSquare, faKey } from '@fortawesome/free-solid-svg-icons';
import { useStore } from './store';
import { supabase } from './supabaseClient';
import { useGlobalTimer } from './hooks/useGlobalTimer';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { usePresence } from './hooks/usePresence';
import { useFriendRequests } from './hooks/useFriendRequests';
import { IncomingCallModal } from './components/meeting/IncomingCallModal';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom').then(m => ({ default: m.MeetingRoom })));

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--color-warning)',
        color: '#000',
        padding: '5px 12px',
        fontSize: '11.5px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'Geist, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      <FontAwesomeIcon icon={faWifi} style={{ fontSize: '11px' }} />
      <span>Mode Offline — Data tersimpan lokal dan disinkronkan otomatis saat tersambung kembali.</span>
    </div>
  );
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
      <div 
        className="animate-spin" 
        style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid var(--border-color)', 
          borderTopColor: 'var(--accent-primary)', 
          borderRadius: '50%' 
        }} 
      />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function GlobalFloatingTimer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTimer, activeProject, elapsedSeconds, formatTime, toggleTimer } = useGlobalTimer();

  // Hide on /dashboard, /login, or when timer is not running
  if (!activeTimer || location.pathname === '/dashboard' || location.pathname === '/login') {
    return null;
  }

  return (
    <div 
      className="global-floating-timer"
      onClick={() => navigate('/dashboard')}
      title="Sesi fokus aktif - Klik untuk kembali ke Dasbor"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        borderRadius: '9999px',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline-strong)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.15s ease'
      }}
    >
      <span 
        style={{ 
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: '#22c55e',
          boxShadow: '0 0 8px rgba(34, 197, 94, 0.7)',
          flexShrink: 0
        }} 
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activeProject?.name || 'Fokus Aktif'}
        </span>
        <span style={{ fontSize: '12px', fontFamily: 'Geist Mono, monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleTimer();
        }}
        title="Hentikan timer sesi ini"
        style={{
          marginLeft: '4px',
          padding: '4px 8px',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <FontAwesomeIcon icon={faSquare} style={{ fontSize: '9px' }} />
        <span>Stop</span>
      </button>
    </div>
  );
}

function PasswordRecoveryModal() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const { updatePassword, logout } = useStore();

  useEffect(() => {
    // Listen for Supabase recovery event
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsOpen(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await updatePassword(newPassword);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setTimeout(async () => {
          setIsOpen(false);
          await logout();
          window.location.hash = '#/login';
        }, 1800);
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Gagal menyimpan kata sandi baru.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="glass-panel animate-scale-in" 
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}
          >
            <FontAwesomeIcon icon={faKey} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Setel Kata Sandi Baru</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Sesi pemulihan akun aktif. Masukkan kata sandi baru Anda.
            </p>
          </div>
        </div>

        {feedback && (
          <div 
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: feedback.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
              border: `1px solid ${feedback.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
            }}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Kata Sandi Baru
            </label>
            <input 
              type="password"
              className="input-field"
              placeholder="Minimal 6 karakter..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Konfirmasi Kata Sandi Baru
            </label>
            <input 
              type="password"
              className="input-field"
              placeholder="Ulangi kata sandi baru..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsOpen(false)}
              style={{ flex: 1, height: '38px', fontSize: '13px' }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 2, height: '38px', fontSize: '13px' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { theme } = useStore();
  usePresence();
  useFriendRequests();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Native Capacitor Integration (Android Back Button & Status Bar)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#090d16' : '#f8fafc' }).catch(() => {});

      const backListener = CapApp.addListener('backButton', () => {
        const hash = window.location.hash;
        if (hash && hash !== '#/' && hash !== '#/login') {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then((l: any) => l.remove()).catch(() => {});
      };
    }
  }, [theme]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <OfflineBanner />
      <PasswordRecoveryModal />
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meeting/:roomId?" 
              element={
                <ProtectedRoute>
                  <MeetingRoom />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
        <IncomingCallModal />
        <GlobalFloatingTimer />
      </HashRouter>
    </div>
  );
}
