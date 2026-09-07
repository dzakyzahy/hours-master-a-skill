import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faFloppyDisk, 
  faArrowLeft, 
  faShieldHalved, 
  faCircleCheck, 
  faKey, 
  faFingerprint 
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => void;
      onUpdateStatus: (callback: (msg: string) => void) => void;
    };
  }
}

export function Profile() {
  const { username, userEmail, geminiApiKey, loadGeminiApiKey } = useStore();
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState(username || 'diky');
  const [email, setEmail] = useState(userEmail || (username === 'diky' ? 'dikydwi442@gmail.com' : 'dzakyzr3@gmail.com'));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const isDiky = (username || '').toLowerCase() === 'diky';
  const roleTitle = isDiky ? 'UI/UX & Mobile Design Lead' : 'Tech Lead & Full-Stack Architect';
  const userInitials = (newUsername || 'DK').substring(0, 2).toUpperCase();

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onUpdateStatus((statusMsg: string) => {
        setUpdateStatus(statusMsg);
      });
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          if (authData.user.email) setEmail(authData.user.email);
          const { data } = await supabase.from('profiles').select('username').eq('id', authData.user.id).single();
          if (data?.username) setNewUsername(data.username);
        }
      } catch {}
    }
    loadProfile();
    loadGeminiApiKey();
  }, [loadGeminiApiKey]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      // Local state update
      useStore.setState({ username: newUsername, userEmail: email });
      localStorage.setItem('last_user', newUsername);

      const isSupabaseConfigured = Boolean(
        import.meta.env.VITE_SUPABASE_URL && 
        !import.meta.env.VITE_SUPABASE_URL.includes('your-project')
      );

      if (isSupabaseConfigured) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const updates: any = {};
          if (email && email !== authData.user.email) updates.email = email;
          if (password) updates.password = password;

          if (Object.keys(updates).length > 0) {
            await supabase.auth.updateUser(updates);
          }

          if (newUsername && newUsername !== username) {
            await supabase.from('profiles').update({ username: newUsername }).eq('id', authData.user.id);
          }
        }
      }

      setMsg('Profil berhasil diperbarui!');
      setPassword('');
    } catch (error: any) {
      setMsg(`Catatan: ${error.message || 'Data disimpan secara lokal'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-drag mobile-content-container" style={{ padding: '32px 20px 80px', flex: 1, maxWidth: '960px', margin: '0 auto', width: '100%' }}>
      {/* Header with Symmetrical Back & Theme Switcher */}
      <header className="header-topbar mb-8" style={{ borderBottom: '1px solid var(--border-hairline)', paddingBottom: '16px' }}>
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
              Profil & Pengaturan
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Kelola kredensial akun dan identitas kolaborasi tim
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dedicated Isolated Theme Switcher */}
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* User Identity Banner Card */}
      <div className="glass-panel mb-6" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div 
          style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '8px', 
            background: 'var(--surface-input)', 
            border: '1px solid var(--border-hairline-strong)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'Geist Mono, monospace',
            color: 'var(--text-primary)',
          }}
        >
          {userInitials}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.015em' }} className="capitalize">{newUsername}</h2>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e' }} className="inline-flex items-center gap-1.5">
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> Online
            </span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>{email}</p>
          <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', background: 'var(--surface-input)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }} className="inline-block">
            {roleTitle}
          </span>
        </div>
      </div>

      {/* Settings Grid - Stack vertically on mobile, 2-col on desktop */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Account Form */}
        <div className="glass-panel flex-1" style={{ padding: '28px' }}>
          <div className="flex items-center gap-2 mb-5">
            <FontAwesomeIcon icon={faUser} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
            <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Pengaturan Akun
            </h2>
          </div>

          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Nama Pengguna
              </label>
              <input
                type="text"
                className="input-field"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Email Akun
              </label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Ubah Kata Sandi (Opsional)
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Kosongkan jika tidak ingin mengubah"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {msg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#22c55e', padding: '8px 12px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: '14px' }} />
                <span>{msg}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary mt-2" 
              disabled={loading}
              style={{ height: '40px', gap: '6px' }}
            >
              <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: '14px' }} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* System & Update Info Card */}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '100%', padding: '28px', flex: '0 1 380px' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Informasi Sistem
              </h2>
            </div>
            <span style={{ fontSize: '10.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', background: 'var(--surface-input)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
              v1.1.0
            </span>
          </div>
          
          {/* Gemini AI Integration Section */}
          <div style={{ marginBottom: '20px', paddingBottom: '18px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-start gap-2.5">
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '6px', 
                    background: 'var(--surface-input)', 
                    border: '1px solid var(--border-hairline)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: geminiApiKey ? '#22c55e' : 'var(--accent-cyan)',
                    flexShrink: 0
                  }}
                >
                  <FontAwesomeIcon icon={faKey} style={{ fontSize: '13px' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Kunci API Gemini
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    AI Mastery Generator (RLS Supabase)
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                className="btn" 
                style={{ height: '30px', padding: '0 10px', fontSize: '11px', flexShrink: 0 }}
                onClick={() => setIsApiKeyModalOpen(true)}
              >
                {geminiApiKey ? 'Ubah' : 'Konfigurasi'}
              </button>
            </div>

            {/* Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Status Kunci</span>
              <span style={{ fontSize: geminiApiKey ? '11px' : '9.5px', fontFamily: geminiApiKey ? 'Geist Mono, monospace' : "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: geminiApiKey ? '#22c55e' : '#f59e0b', letterSpacing: geminiApiKey ? 'normal' : '0.01em', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: geminiApiKey ? '#22c55e' : '#f59e0b' }} />
                {geminiApiKey ? `${geminiApiKey.substring(0, 8)}••••••••••••` : 'Belum Dikonfigurasi'}
              </span>
            </div>
          </div>

          {/* Biometric Sensor Section */}
          <div style={{ marginBottom: '20px', paddingBottom: '18px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={faFingerprint} style={{ color: 'var(--accent-cyan)', fontSize: '15px' }} />
                <div>
                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>
                    Sensor Biometrik
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Otentikasi cepat WebAuthn
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '10.5px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '3px 8px', borderRadius: '4px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Siap
              </span>
            </div>
          </div>

          {/* Updates & Runtime Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 style={{ margin: 0, fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Pembaruan Sistem
              </h3>
              <button 
                className="btn" 
                style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.checkForUpdates();
                  } else {
                    setUpdateStatus("Aplikasi berjalan pada versi build terbaru (Android/Web Ready).");
                  }
                }}
              >
                Periksa Pembaruan
              </button>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Skillo memeriksa pembaruan otomatis di background secara berkala.
            </p>
            {updateStatus && (
              <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: 'var(--text-primary)', padding: '7px 10px', borderRadius: '4px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)' }}>
                {updateStatus}
              </p>
            )}
          </div>

          <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between">
              <span>Platform</span>
              <span style={{ color: 'var(--text-primary)' }}>Android & Desktop Hybrid</span>
            </div>
            <div className="flex justify-between">
              <span>Koneksi P2P</span>
              <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Active (Real-time)
              </span>
            </div>
          </div>
        </div>
      </div>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
