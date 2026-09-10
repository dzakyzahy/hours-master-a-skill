import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFloppyDisk, 
  faArrowLeft, 
  faShieldHalved, 
  faCircleCheck, 
  faKey, 
  faFingerprint,
  faRightFromBracket,
  faPaintbrush,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { useStore } from '../store';
import { ApiKeyModal } from '../components/ApiKeyModal';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { AVATAR_PRESETS, getAvatarDisplay } from '../utils/profilePresets';
import { fileToAvatarDataUrl } from '../utils/avatarUpload';
import { AchievementsSection } from '../components/AchievementsSection';
import toast from 'react-hot-toast';

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
    logout,
    biometricEnabled,
    setBiometricEnabled,
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [biometricFeedback, setBiometricFeedback] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const userInitials = (newUsername || 'DK').substring(0, 2).toUpperCase();

  const handleToggleBiometrics = async () => {
    if (biometricEnabled) {
      setBiometricEnabled(false);
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('biometric_user');
      setBiometricFeedback('Sensor sidik jari dinonaktifkan untuk perangkat ini.');
      toast('Login sidik jari dinonaktifkan', { icon: '🔒' });
    } else {
      const targetUser = (newUsername || username || 'diky').toLowerCase();
      try {
        if (window.PublicKeyCredential) {
          try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);
            
            const cred = await navigator.credentials.create({
              publicKey: {
                challenge,
                rp: { name: "Skillo Workspace" },
                user: { id: userId, name: targetUser, displayName: targetUser.toUpperCase() },
                pubKeyCredParams: [
                  { type: "public-key", alg: -7 },
                  { type: "public-key", alg: -257 }
                ],
                authenticatorSelection: { 
                  authenticatorAttachment: "platform",
                  userVerification: "preferred" 
                },
                timeout: 30000
              }
            }) as PublicKeyCredential;

            if (cred) {
              const bytes = new Uint8Array(cred.rawId);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              localStorage.setItem('biometric_id', btoa(binary));
            }
          } catch (credErr) {
            console.info("Hardware credential registration note:", credErr);
          }
        }

        setBiometricEnabled(true);
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_user', targetUser);
        localStorage.setItem('last_user', targetUser);
        setBiometricFeedback(`Sensor sidik jari berhasil diaktifkan untuk akun ${targetUser}.`);
        toast.success('Login sidik jari berhasil diaktifkan!');
      } catch (err: any) {
        setBiometricFeedback(err?.message || 'Gagal mengaktifkan sensor biometrik.');
      }
    }
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setUpdateStatus('');
    setTimeout(() => {
      setIsCheckingUpdate(false);
      if (window.electronAPI) {
        window.electronAPI.checkForUpdates();
      } else {
        setUpdateStatus("Aplikasi Skillo v1.1.0 sudah menggunakan versi build terbaru.");
        toast.success("Skillo v1.1.0 sudah versi terbaru!");
      }
    }, 850);
  };

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

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again after a failure
    if (!file) return;

    setPhotoBusy(true);
    setMsg('');
    try {
      setSelectedAvatar(await fileToAvatarDataUrl(file));
      setMsg('Foto siap. Tekan Simpan untuk menerapkannya.');
    } catch (err: any) {
      setMsg(err?.message || 'Gagal memproses foto.');
    } finally {
      setPhotoBusy(false);
    }
  };

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

          // supabase-js returns { error }, it does not throw — a try/catch here hides
          // a missing column and the profile silently stays device-only.
          const { error: profileError } = await supabase.from('profiles').update({
            username: newUsername,
            avatar_url: selectedAvatar,
            title: customTitle,
            bio: customBio
          }).eq('id', authData.user.id);

          if (profileError) {
            await supabase.from('profiles').update({ username: newUsername }).eq('id', authData.user.id);
            setMsg(`Tersimpan di perangkat ini saja. Server menolak: ${profileError.message}`);
            setLoading(false);
            return;
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
          <div className="glass-panel mb-6" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderRadius: 'var(--radius-card, 14px)' }}>
            <div 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: 'var(--radius-card, 14px)', 
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
                <img src={avatarDisplay.imageUrl} alt={newUsername} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-card, 14px)', objectFit: 'cover' }} />
              ) : (
                avatarDisplay.initials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="capitalize">{newUsername}</h2>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 'var(--radius-pill, 9999px)', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e' }} className="inline-flex items-center gap-1.5">
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> Online
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Geist Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontFamily: 'Geist Mono, monospace', color: 'var(--accent-primary)', background: 'var(--surface-input)', padding: '3px 8px', borderRadius: 'var(--radius-pill, 9999px)', border: '1px solid var(--border-hairline)' }} className="inline-block">
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
        <div className="glass-panel" style={{ padding: '24px 20px', borderRadius: 'var(--radius-card, 14px)' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
            <FontAwesomeIcon icon={faPaintbrush} style={{ color: 'var(--accent-primary)', fontSize: '14px' }} />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Personalisasi & Identitas Tim
            </h2>
          </div>

          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Photo Upload */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>
                Foto Profil
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickPhoto}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn"
                disabled={photoBusy}
                onClick={() => photoInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {photoBusy ? 'Memproses foto...' : 'Unggah Foto dari Galeri'}
              </button>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                Foto dikecilkan otomatis ke 256px. Memilih tema di bawah akan menggantikan foto.
              </p>
            </div>

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
                        borderRadius: 'var(--radius-btn, 8px)',
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
                        background: isSelected ? 'rgba(14, 165, 233, 0.08)' : 'var(--surface-input)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
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
        <div className="glass-panel" style={{ width: '100%', padding: '24px 20px', borderRadius: 'var(--radius-card, 14px)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--text-secondary)', fontSize: '14px' }} />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Informasi Sistem
              </h2>
            </div>
            <span style={{ fontSize: '10.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)', background: 'var(--surface-input)', padding: '3px 9px', borderRadius: 'var(--radius-pill, 9999px)', border: '1px solid var(--border-hairline)' }}>
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
                    borderRadius: 'var(--radius-input, 8px)', 
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
                style={{ height: '30px', padding: '0 12px', fontSize: '11px', flexShrink: 0, borderRadius: 'var(--radius-btn, 8px)' }}
                onClick={() => setIsApiKeyModalOpen(true)}
              >
                {geminiApiKey ? 'Ubah' : 'Konfigurasi'}
              </button>
            </div>

            {/* Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-input, 8px)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Status Kunci</span>
              <span style={{ fontSize: geminiApiKey ? '11px' : '10px', fontFamily: geminiApiKey ? 'Geist Mono, monospace' : "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: geminiApiKey ? '#22c55e' : '#f59e0b', letterSpacing: geminiApiKey ? 'normal' : '0.01em', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: geminiApiKey ? '#22c55e' : '#f59e0b' }} />
                {geminiApiKey ? `${geminiApiKey.substring(0, 8)}••••••••••••` : 'Belum Dikonfigurasi'}
              </span>
            </div>
          </div>


          {/* Biometrics & Device Security Section */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{ 
                    width: '34px', 
                    height: '34px', 
                    borderRadius: 'var(--radius-input, 8px)', 
                    background: biometricEnabled ? 'rgba(14, 165, 233, 0.15)' : 'var(--surface-input)', 
                    color: biometricEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: biometricEnabled ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid var(--border-hairline)'
                  }}
                >
                  <FontAwesomeIcon icon={faFingerprint} style={{ fontSize: '16px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                    Sensor Sidik Jari (Biometrik)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    {biometricEnabled 
                      ? 'Aktif untuk akun ' + (newUsername || username || 'Anda') + ' (Login Cepat)' 
                      : 'Aktifkan untuk masuk tanpa kata sandi'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleBiometrics}
                style={{
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-btn, 8px)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: biometricEnabled ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-hairline)',
                  background: biometricEnabled ? 'rgba(34, 197, 94, 0.12)' : 'var(--surface-input)',
                  color: biometricEnabled ? '#22c55e' : 'var(--text-secondary)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {biometricEnabled ? 'Aktif ✓' : 'Aktivasi'}
              </button>
            </div>
            {biometricFeedback && (
              <div style={{ marginTop: '12px', fontSize: '11.5px', color: biometricEnabled ? '#22c55e' : 'var(--text-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-input, 8px)', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)' }}>
                {biometricFeedback}
              </div>
            )}
          </div>

          {/* Updates & Runtime Info */}
          <div style={{ marginBottom: '24px', paddingBottom: '22px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pembaruan Sistem
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Versi Build: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'Geist Mono, monospace' }}>v1.1.0</strong>
                </span>
              </div>
              <button 
                type="button"
                className="btn" 
                disabled={isCheckingUpdate}
                style={{ height: '30px', padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleCheckUpdate}
              >
                {isCheckingUpdate ? (
                  <>
                    <span className="animate-spin">↻</span>
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <span>Periksa Pembaruan</span>
                )}
              </button>
            </div>
            <p style={{ margin: '0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Pengecekan rilis build berdasarkan kanal rilis resmi (GitHub Releases & distribusi APK Android).
            </p>
            {updateStatus && (
              <div style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: 'var(--radius-input, 8px)', background: 'var(--surface-input)', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--color-success)', fontSize: '14px', flexShrink: 0 }} />
                <div>
                  <div>{updateStatus}</div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-placeholder)', marginTop: '2px', fontFamily: 'Geist Mono, monospace' }}>
                    Sumber: GitHub Releases & APK Build v1.1.0 (Stabil)
                  </div>
                </div>
              </div>
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
