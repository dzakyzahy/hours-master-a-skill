import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFloppyDisk, 
  faArrowLeft, 
  faShieldHalved, 
  faCircleCheck, 
  faKey, 
  faFingerprint,
  faVolumeHigh,
  faVolumeXmark,
  faRightFromBracket,
  faPaintbrush,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useStore } from '../store';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { AVATAR_PRESETS, getAvatarDisplay } from '../utils/profilePresets';
import { AchievementsSection } from '../components/AchievementsSection';

declare global {
  interface Window {
    electronAPI?: {
      checkForUpdates: () => void;
      onUpdateStatus: (callback: (msg: string) => void) => void;
    };
  }
}

export function Profile() {
  const { 
    username, 
    userEmail, 
    geminiApiKey, 
    loadGeminiApiKey, 
    soundEnabled, 
    toggleSound, 
    logout,
    avatar: storeAvatar,
    title: storeTitle,
    bio: storeBio,
    updateProfileCustomization 
  } = useStore();
  const navigate = useNavigate();
  const isDiky = (username || '').toLowerCase() === 'diky';
  const defaultRoleTitle = isDiky ? 'UI/UX & Mobile Design Lead' : 'Tech Lead & Full-Stack Architect';

  const [newUsername, setNewUsername] = useState(username || 'diky');
  const [email, setEmail] = useState(userEmail || (username === 'diky' ? 'dikydwi442@gmail.com' : 'dzakyzr3@gmail.com'));
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(storeAvatar || 'cyber-neon');
  const [customTitle, setCustomTitle] = useState(storeTitle || defaultRoleTitle);
  const [customBio, setCustomBio] = useState(storeBio || 'Belajar dan bertumbuh di Skillo');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

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
          const { data } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
          if (data) {
            if (data.username) setNewUsername(data.username);
            if (data.avatar_url) setSelectedAvatar(data.avatar_url);
            if (data.title) setCustomTitle(data.title);
            if (data.bio) setCustomBio(data.bio);
          }
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
      updateProfileCustomization({
        avatar: selectedAvatar,
        title: customTitle,
        bio: customBio
      });
      localStorage.setItem('last_user', newUsername);

      if (isSupabaseConfigured) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          const updates: any = {};
          if (email && email !== authData.user.email) updates.email = email;
          if (password) updates.password = password;

          if (Object.keys(updates).length > 0) {
            await supabase.auth.updateUser(updates);
          }

          try {
            await supabase.from('profiles').update({
              username: newUsername,
              avatar_url: selectedAvatar,
              title: customTitle,
              bio: customBio
            }).eq('id', authData.user.id);
          } catch {
            await supabase.from('profiles').update({ username: newUsername }).eq('id', authData.user.id);
          }
        }
      }

      setMsg('Profil & personalisasi berhasil disimpan!');
      setPassword('');
    } catch (error: any) {
      setMsg(`Catatan: ${error.message || 'Data disimpan secara lokal'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="no-drag mobile-content-container" style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* Header with Unified Single-Row App Header */}
      <header className="app-header-bar">
        <div className="header-nav-group">
          <button 
            type="button"
            className="header-back-btn" 
            onClick={() => navigate('/')} 
            title="Kembali ke Beranda"
            aria-label="Kembali ke Beranda"
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} />
            <span className="header-back-label">Kembali</span>
          </button>
          <div className="header-title-block">
            <h1 className="header-title-main">
              Profil & Pengaturan
            </h1>
            <p className="header-subtitle-text">
              Kelola kredensial akun & identitas kolaborasi tim
            </p>
          </div>
        </div>

        <div className="header-actions-group">
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* User Identity Banner Card */}
      {(() => {
        const avatarDisplay = getAvatarDisplay(selectedAvatar, userInitials);
        return (
          <div className="glass-panel mb-6" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: avatarDisplay.gradient, 
                border: '1px solid var(--border-hairline-strong)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 700,
                fontFamily: 'Geist Mono, monospace',
                color: avatarDisplay.textColor,
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
              }}
            >
              {avatarDisplay.isCustomImage ? (
                <img src={avatarDisplay.imageUrl} alt={newUsername} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
              ) : (
                avatarDisplay.initials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="capitalize">{newUsername}</h2>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e' }} className="inline-flex items-center gap-1.5">
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> Online
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--accent-primary)', background: 'var(--surface-input)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }} className="inline-block">
                  {customTitle || defaultRoleTitle}
                </span>
              </div>
              {customBio && (
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{customBio}"
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Settings Grid - Generous relaxed vertical layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Personalization & Account Form */}
        <div className="glass-panel" style={{ padding: '24px 20px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
            <FontAwesomeIcon icon={faPaintbrush} style={{ color: 'var(--accent-primary)', fontSize: '14px' }} />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Personalisasi & Identitas Tim
            </h2>
          </div>

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Avatar Preset Picker */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>
                Pilih Tema Avatar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatar === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedAvatar(preset.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
                        background: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--surface-input)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: preset.gradient,
                          color: preset.textColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700,
                          flexShrink: 0,
                          boxShadow: isSelected ? '0 0 8px rgba(14, 165, 233, 0.4)' : 'none'
                        }}
                      >
                        {isSelected ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px' }} /> : userInitials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preset.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Role */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Gelar / Peran Utama (Title)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: UI/UX & Mobile Design Lead"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>

            {/* Bio / Motto */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Bio Singkat & Fokus Belajar
              </label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Tuliskan tujuan atau fokus belajar..."
                value={customBio}
                onChange={(e) => setCustomBio(e.target.value)}
                style={{ resize: 'vertical', minHeight: '60px', fontFamily: 'inherit', fontSize: '12.5px' }}
              />
            </div>

            <div style={{ height: '1px', background: 'var(--border-hairline)', margin: '4px 0' }} />

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
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
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
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
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#22c55e', padding: '10px 14px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: '14px' }} />
                <span>{msg}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ height: '42px', marginTop: '6px', gap: '8px', fontSize: '13px', fontWeight: 600 }}
            >
              <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: '14px' }} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>

        {/* Achievements & Badges Section */}
        <AchievementsSection />

        {/* System & Update Info Card */}
        <div className="glass-panel" style={{ width: '100%', padding: '24px 20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Informasi Sistem
              </h2>
            </div>
            <span style={{ fontSize: '10.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', background: 'var(--surface-input)', padding: '3px 9px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
              v1.1.0
            </span>
          </div>
          
          {/* Gemini AI Integration Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div 
                  style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '6px', 
                    background: 'var(--surface-input)', 
                    border: '1px solid var(--border-hairline)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: geminiApiKey ? 'var(--color-success)' : 'var(--accent-primary)',
                    flexShrink: 0
                  }}
                >
                  <FontAwesomeIcon icon={faKey} style={{ fontSize: '13px' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Kunci API Gemini
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    AI Mastery Generator (RLS Supabase)
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                className="btn" 
                style={{ height: '30px', padding: '0 12px', fontSize: '11px', flexShrink: 0 }}
                onClick={() => setIsApiKeyModalOpen(true)}
              >
                {geminiApiKey ? 'Ubah' : 'Konfigurasi'}
              </button>
            </div>

            {/* Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Status Kunci</span>
              <span style={{ fontSize: geminiApiKey ? '11px' : '10px', fontFamily: geminiApiKey ? 'Geist Mono, monospace' : "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: geminiApiKey ? '#22c55e' : '#f59e0b', letterSpacing: geminiApiKey ? 'normal' : '0.01em', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: geminiApiKey ? '#22c55e' : '#f59e0b' }} />
                {geminiApiKey ? `${geminiApiKey.substring(0, 8)}••••••••••••` : 'Belum Dikonfigurasi'}
              </span>
            </div>
          </div>

          {/* Biometric Sensor Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '6px', 
                    background: 'var(--surface-input)', 
                    border: '1px solid var(--border-hairline)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--accent-primary)',
                    flexShrink: 0
                  }}
                >
                  <FontAwesomeIcon icon={faFingerprint} style={{ fontSize: '15px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    Sensor Biometrik
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Otentikasi cepat WebAuthn
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '4px 10px', borderRadius: '4px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Siap
              </span>
            </div>
          </div>

          {/* Sound & Audio FX Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: '6px', 
                    background: 'var(--surface-input)', 
                    border: '1px solid var(--border-hairline)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    flexShrink: 0
                  }}
                >
                  <FontAwesomeIcon icon={soundEnabled ? faVolumeHigh : faVolumeXmark} style={{ fontSize: '14px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    Efek Suara & Audio
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Notifikasi synth pesan, timer, & duel
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={toggleSound}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: soundEnabled ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid var(--border-hairline)',
                    background: soundEnabled ? 'rgba(14, 165, 233, 0.1)' : 'var(--surface-input)',
                    color: soundEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {soundEnabled ? 'Aktif' : 'Mati'}
                </button>
              </div>
            </div>
          </div>

          {/* Updates & Runtime Info */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Pembaruan Sistem
              </h3>
              <button 
                className="btn" 
                style={{ height: '28px', padding: '0 12px', fontSize: '11px' }}
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
            <p style={{ margin: '0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Skillo memeriksa pembaruan otomatis di background secara berkala.
            </p>
            {updateStatus && (
              <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)' }}>
                {updateStatus}
              </p>
            )}
          </div>

          {/* Bottom Info: Platform & P2P */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '11.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Platform</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Android & Desktop Hybrid</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Koneksi P2P</span>
              <span style={{ color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                Active (Real-time)
              </span>
            </div>
          </div>

          {/* Dedicated Logout Action */}
          <div style={{ marginTop: '26px', paddingTop: '20px', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--color-danger)',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Keluar dari Akun (Logout)
            </button>
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
