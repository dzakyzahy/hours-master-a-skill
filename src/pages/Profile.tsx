import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => void;
      onUpdateStatus: (callback: (msg: string) => void) => void;
    };
  }
}

export function Profile() {
  const { username, userEmail } = useStore();
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState(username || 'diky');
  const [email, setEmail] = useState(userEmail || (username === 'diky' ? 'dikydwi442@gmail.com' : 'dzakyzr3@gmail.com'));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

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
  }, []);

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
    <div className="no-drag mobile-content-container" style={{ padding: '32px 20px 80px', flex: 1, maxWidth: '920px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button className="btn" onClick={() => navigate('/')} style={{ padding: '0 12px', height: '36px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text-primary)' }}>
            Profile & Settings
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage your account credentials and team identity
          </p>
        </div>
      </div>

      {/* User Identity Banner Card */}
      <div className="glass-panel mb-6" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div 
          style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '4px', 
            background: 'var(--surface-input)', 
            border: '1px solid var(--border-hairline-strong)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 600,
            fontFamily: 'Geist Mono, monospace',
            color: 'var(--text-primary)',
          }}
        >
          {userInitials}
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }} className="capitalize">{newUsername}</h2>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--surface-input)', color: '#4ade80' }} className="inline-flex items-center gap-1.5">
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#4ade80' }} /> Online
            </span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace' }}>{email}</p>
          <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', background: 'var(--surface-input)', padding: '3px 8px', borderRadius: '3px', border: '1px solid var(--border-hairline)' }} className="inline-block">
            {roleTitle}
          </span>
        </div>
      </div>

      {/* Settings Grid - Stack vertically on mobile, 2-col on desktop */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Account Form */}
        <div className="glass-panel flex-1" style={{ padding: '28px' }}>
          <div className="flex items-center gap-2 mb-5">
            <User size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Pengaturan Akun
            </h2>
          </div>

          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Username
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={newUsername} 
                onChange={e => setNewUsername(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Alamat Email
              </label>
              <input 
                type="email" 
                className="input-field" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Ganti Password <span style={{ color: 'var(--text-placeholder)', fontWeight: 400 }}>(kosongkan jika tidak diubah)</span>
              </label>
              <input 
                type="password" 
                className="input-field" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
            </div>
            
            {msg && (
              <div style={{ padding: '10px 12px', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} /> {msg}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary mt-2" 
              disabled={loading}
              style={{ height: '40px' }}
            >
              <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* System & Update Info */}
        <div className="glass-panel" style={{ width: '100%', maxWidth: '100%', padding: '28px', flex: '0 1 360px' }}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Informasi Sistem
            </h2>
          </div>
          
          <div className="mb-6">
            <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Pembaruan Aplikasi
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Skillo memeriksa pembaruan secara otomatis di latar belakang. Versi Mobile Android disinkronkan melalui build APK terbaru.
            </p>
            <button 
              className="btn w-full"
              style={{ height: '40px' }}
              onClick={() => {
                if (window.electronAPI) {
                  window.electronAPI.checkForUpdates();
                } else {
                  setUpdateStatus("Aplikasi berjalan pada versi build terbaru (Android/Web Ready).");
                }
              }}
            >
              Periksa Pembaruan Sistem
            </button>
            {updateStatus && (
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)' }}>
                {updateStatus}
              </p>
            )}
          </div>

          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
            <div className="flex justify-between">
              <span>Platform</span>
              <span style={{ color: 'var(--text-primary)' }}>Android & Desktop Hybrid</span>
            </div>
            <div className="flex justify-between">
              <span>Status Koneksi</span>
              <span style={{ color: '#4ade80' }}>Active (Real-time P2P)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
