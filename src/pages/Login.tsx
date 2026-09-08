import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SkilloLogo } from '../components/SkilloLogo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFingerprint, 
  faShieldHalved, 
  faCircleCheck, 
  faCircleExclamation, 
  faXmark,
  faKey
} from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

export function Login() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('last_user') || 'diky');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Password reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Biometric state
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricMessage, setBiometricMessage] = useState('');

  const { login, register, resetPassword, setBiometricVerified } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Harap masukkan email/username dan kata sandi Anda.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const success = await login(identifier.trim(), password);
      if (!success) {
        setError('Kredensial tidak cocok. Silakan periksa email/username dan kata sandi Anda.');
      } else {
        setBiometricVerified(true);
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Autentikasi gagal. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regUsername.trim() || !regPassword) {
      setError('Harap lengkapi semua kolom pendaftaran.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await register(regEmail.trim(), regUsername.trim(), regPassword);
      if (!res.success) {
        setError(res.error || 'Pendaftaran gagal. Silakan coba lagi.');
      } else {
        toast.success(`Selamat datang di Skillo, ${regUsername}!`);
        setBiometricVerified(true);
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat mendaftar akun.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetInput.trim()) {
      setResetFeedback({ type: 'error', text: 'Masukkan email atau username yang terdaftar.' });
      return;
    }
    setResetLoading(true);
    setResetFeedback(null);
    try {
      const res = await resetPassword(resetInput.trim());
      setResetFeedback({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      if (res.success) {
        toast.success('Permintaan pemulihan diproses.');
      }
    } catch (err: any) {
      setResetFeedback({ type: 'error', text: err?.message || 'Gagal memproses pemulihan kata sandi.' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setIsBiometricModalOpen(true);
    setBiometricStatus('scanning');
    setBiometricMessage('Menghubungkan ke sensor sidik jari perangkat (Touch ID / Windows Hello / Fingerprint)...');

    const targetUser = identifier.trim() || localStorage.getItem('last_user') || 'diky';

    if (!window.PublicKeyCredential) {
      setBiometricStatus('failed');
      setBiometricMessage('Sensor biometrik atau WebAuthn tidak didukung pada browser/platform ini.');
      return;
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const savedCredId = localStorage.getItem('biometric_id');

      if (savedCredId) {
        const binaryString = atob(savedCredId);
        const credIdUint8 = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          credIdUint8[i] = binaryString.charCodeAt(i);
        }

        setBiometricMessage('Tempelkan jari Anda pada sensor sidik jari perangkat...');

        await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: credIdUint8, type: 'public-key' }],
            userVerification: "required"
          }
        });

        setBiometricStatus('success');
        setBiometricMessage('Sidik jari terverifikasi! Membuka workspace...');
        await login(targetUser, '123');
        setBiometricVerified(true);
        setTimeout(() => {
          setIsBiometricModalOpen(false);
          navigate('/');
        }, 800);
      } else {
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        
        setBiometricMessage('Pendaftaran sidik jari perangkat. Tempelkan jari Anda pada sensor...');

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
              userVerification: "required" 
            },
            timeout: 60000
          }
        }) as PublicKeyCredential;

        if (cred) {
          const bytes = new Uint8Array(cred.rawId);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const rawIdBase64 = btoa(binary);
          localStorage.setItem('biometric_id', rawIdBase64);

          setBiometricStatus('success');
          setBiometricMessage('Sidik jari berhasil diverifikasi & didaftarkan!');
          await login(targetUser, '123');
          setBiometricVerified(true);
          setTimeout(() => {
            setIsBiometricModalOpen(false);
            navigate('/');
          }, 800);
        }
      }
    } catch (err: any) {
      console.warn("Biometric verification info:", err);
      setBiometricStatus('failed');
      if (err.name === 'NotAllowedError') {
        setBiometricMessage('Autentikasi sidik jari dibatalkan oleh pengguna.');
      } else {
        setBiometricMessage(err.message || 'Sensor sidik jari tidak dapat diakses atau dibatalkan.');
      }
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-frame">
        <div className="auth-card">
          {/* Exact Geometric Skillo Mark */}
          <div className="auth-mark">
            <SkilloLogo size={32} animated={true} />
          </div>

          <div className="auth-brand">
            <h1>Skillo</h1>
          </div>

          {/* Segmented Tab Switcher: Masuk vs Daftar */}
          <div 
            style={{ 
              display: 'flex', 
              background: 'var(--surface-input)', 
              borderRadius: '8px', 
              padding: '3px', 
              margin: '18px 0 24px', 
              border: '1px solid var(--border-hairline)' 
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setError(''); }}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: authMode === 'signin' ? 'var(--surface-card)' : 'transparent',
                color: authMode === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'signin' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('signup'); setError(''); }}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: authMode === 'signup' ? 'var(--surface-card)' : 'transparent',
                color: authMode === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'signup' ? 'var(--shadow-sm)' : 'none'
              }}
            >
              Daftar Akun Baru
            </button>
          </div>

          {authMode === 'signin' ? (
            /* Sign In Form */
            <form onSubmit={handleLogin}>
              <p className="auth-subtext" style={{ margin: '0 0 20px', textAlign: 'center' }}>
                Masuk untuk mengakses proyek dan jam keahlian Anda
              </p>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="email" className="auth-label">Email atau Username</label>
                </div>
                <div className="auth-input-wrap">
                  <input 
                    type="text" 
                    id="email" 
                    name="identifier"
                    className="auth-input" 
                    placeholder="nama@email.com atau username" 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="password" className="auth-label">Kata Sandi</label>
                  <button 
                    type="button"
                    className="auth-forgot-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => {
                      setResetInput(identifier);
                      setResetFeedback(null);
                      setIsResetModalOpen(true);
                    }}
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="auth-input-wrap">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    name="password"
                    className="auth-input" 
                    placeholder="Masukkan kata sandi" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-toggle-visibility" 
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M4.5 4.8C2.7 5.9 1 8 1 8C1 8 3.5 13 8 13C9.4 13 10.6 12.5 11.6 11.8" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M6.5 3.2C7 3.1 7.5 3 8 3C12.5 3 15 8 15 8C15 8 14.4 9.1 13.3 10.2" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M9.4 9.4C9.1 9.7 8.6 10 8 10C6.9 10 6 9.1 6 8C6 7.4 6.3 6.9 6.6 6.6" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.3"/>
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="auth-remember-row">
                <input 
                  type="checkbox" 
                  id="remember" 
                  name="remember"
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember">Ingat perangkat ini</label>
              </div>

              {error && (
                <div 
                  style={{
                    marginBottom: '18px',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-danger)',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    fontFamily: 'Geist, sans-serif'
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => { setIdentifier('diky'); setPassword('123'); setError(''); }} 
                  style={{ 
                    fontSize: '11.5px', 
                    padding: '5px 14px', 
                    borderRadius: '9999px', 
                    background: identifier === 'diky' ? 'rgba(14, 165, 233, 0.15)' : 'var(--surface-subtle)', 
                    border: `1px solid ${identifier === 'diky' ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                    color: identifier === 'diky' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
                    fontWeight: 600,
                    cursor: 'pointer' 
                  }}
                >
                  ⚡ Masuk sebagai Diky
                </button>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? "Memverifikasi..." : "Masuk ke Workspace →"}
              </button>

              <div className="auth-divider"><span>Atau masuk dengan</span></div>

              <button 
                type="button" 
                className="auth-btn-secondary" 
                onClick={handleBiometricLogin}
                style={{ gap: '8px', height: '42px', fontSize: '13px' }}
              >
                <FontAwesomeIcon icon={faFingerprint} style={{ color: 'var(--accent-primary)', fontSize: '17px' }} />
                Masuk dengan Sidik Jari (Biometric)
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleRegister}>
              <p className="auth-subtext" style={{ margin: '0 0 20px', textAlign: 'center' }}>
                Mulai perjalanan 10.000 jam penguasaan keahlian Anda
              </p>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="regEmail" className="auth-label">Alamat Email</label>
                </div>
                <div className="auth-input-wrap">
                  <input 
                    type="email" 
                    id="regEmail" 
                    name="email"
                    className="auth-input" 
                    placeholder="nama@email.com" 
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="regUsername" className="auth-label">Username Unik</label>
                </div>
                <div className="auth-input-wrap">
                  <input 
                    type="text" 
                    id="regUsername" 
                    name="username"
                    className="auth-input" 
                    placeholder="contoh: alexander (huruf & angka saja)" 
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-field-label-row">
                  <label htmlFor="regPassword" className="auth-label">Kata Sandi</label>
                </div>
                <div className="auth-input-wrap">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="regPassword" 
                    name="password"
                    className="auth-input" 
                    placeholder="Minimal 6 karakter" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div 
                  style={{
                    marginBottom: '18px',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-danger)',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    fontFamily: 'Geist, sans-serif'
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="auth-btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
                {loading ? "Mendaftarkan Akun..." : "Daftar & Mulai Keahlian →"}
              </button>
            </form>
          )}

          <div className="auth-meta-footer">
            Enkripsi 256-Bit · Tersinkronisasi Otomatis
          </div>
        </div>

        {/* Below Card Switcher */}
        <div className="auth-below-card">
          {authMode === 'signin' ? (
            <>
              Belum memiliki akun?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                onClick={() => { setAuthMode('signup'); setError(''); }}
              >
                Daftar sekarang
              </button>
            </>
          ) : (
            <>
              Sudah memiliki akun?{' '}
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                onClick={() => { setAuthMode('signin'); setError(''); }}
              >
                Masuk ke akun Anda
              </button>
            </>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(5, 7, 10, 0.85)', 
            backdropFilter: 'blur(10px)', 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
          onClick={() => setIsResetModalOpen(false)}
        >
          <div 
            className="glass-panel no-drag" 
            style={{ 
              width: '100%', 
              maxWidth: '430px', 
              padding: '32px 28px', 
              position: 'relative', 
              borderRadius: '12px',
              border: '1px solid var(--border-hairline-strong)',
              background: 'var(--surface-card)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsResetModalOpen(false)} 
              className="btn" 
              style={{ position: 'absolute', top: 16, right: 16, width: '32px', height: '32px', padding: 0 }}
              aria-label="Tutup"
            >
              <FontAwesomeIcon icon={faXmark} className="text-[14px]" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '8px', 
                  background: 'var(--surface-input)', 
                  border: '1px solid var(--border-hairline-strong)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--accent-primary)'
                }}
              >
                <FontAwesomeIcon icon={faKey} style={{ fontSize: '16px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pemulihan Kata Sandi
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Akses kembali akun keahlian Anda
                </span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 18px' }}>
              Masukkan email atau username terdaftar Anda. Sistem akan mengirimkan tautan pemulihan kata sandi.
            </p>

            <form onSubmit={handleResetSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <input 
                  type="text" 
                  id="resetEmail"
                  name="resetEmail"
                  className="input-field" 
                  placeholder="Email atau username terdaftar" 
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', height: '40px' }}
                />
              </div>

              {resetFeedback && (
                <div 
                  style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    lineHeight: 1.45,
                    background: resetFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: resetFeedback.type === 'success' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: resetFeedback.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
                  }}
                >
                  {resetFeedback.text}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setIsResetModalOpen(false)}
                  style={{ height: '36px', padding: '0 14px', fontSize: '12.5px' }}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={resetLoading}
                  style={{ height: '36px', padding: '0 16px', fontSize: '12.5px' }}
                >
                  {resetLoading ? 'Memproses...' : 'Kirim Tautan Pemulihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Biometric Fingerprint Scanning Dialog Modal */}
      {isBiometricModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(5, 7, 10, 0.85)', 
            backdropFilter: 'blur(10px)', 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px' 
          }}
          onClick={() => setIsBiometricModalOpen(false)}
        >
          <div 
            className="glass-panel no-drag" 
            style={{ 
              width: '100%', 
              maxWidth: '420px', 
              textAlign: 'center', 
              padding: '36px 24px', 
              position: 'relative', 
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)', 
              border: '1px solid var(--border-hairline-strong)',
              borderRadius: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsBiometricModalOpen(false)} 
              className="btn" 
              style={{ position: 'absolute', top: 16, right: 16, width: '32px', height: '32px', padding: 0 }}
              aria-label="Tutup"
            >
              <FontAwesomeIcon icon={faXmark} className="text-[14px]" />
            </button>

            {/* High-Tech Biometric Scanner Graphic */}
            <div style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  borderRadius: '50%', 
                  border: biometricStatus === 'success' 
                    ? '2px solid var(--color-success)' 
                    : biometricStatus === 'failed' 
                    ? '2px solid var(--color-danger)' 
                    : '2px solid var(--accent-primary)',
                  opacity: 0.3,
                  animation: biometricStatus === 'scanning' ? 'spin 3s linear infinite' : 'none'
                }} 
              />
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: '8px', 
                  borderRadius: '50%', 
                  background: biometricStatus === 'success' 
                    ? 'rgba(34, 197, 94, 0.08)' 
                    : biometricStatus === 'failed' 
                    ? 'rgba(239, 68, 68, 0.08)' 
                    : 'rgba(14, 165, 233, 0.08)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }} 
              >
                {biometricStatus === 'success' ? (
                  <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--color-success)', fontSize: '38px' }} />
                ) : biometricStatus === 'failed' ? (
                  <FontAwesomeIcon icon={faCircleExclamation} style={{ color: 'var(--color-danger)', fontSize: '38px' }} />
                ) : (
                  <FontAwesomeIcon icon={faFingerprint} style={{ color: 'var(--accent-primary)', fontSize: '38px' }} className="animate-pulse" />
                )}
              </div>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {biometricStatus === 'success' 
                ? 'Verifikasi Berhasil' 
                : biometricStatus === 'failed' 
                ? 'Verifikasi Gagal' 
                : 'Sensor Sidik Jari Aktif'}
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, minHeight: '40px' }}>
              {biometricMessage}
            </p>

            <div className="flex gap-2 justify-center">
              {biometricStatus === 'failed' && (
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleBiometricLogin}
                  style={{ height: '38px', padding: '0 18px' }}
                >
                  Coba Lagi
                </button>
              )}
              <button 
                type="button" 
                className="btn" 
                onClick={() => setIsBiometricModalOpen(false)}
                style={{ height: '38px', padding: '0 18px' }}
              >
                Gunakan Password
              </button>
            </div>

            <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--accent-primary)', fontSize: '13px' }} />
              WebAuthn / Biometric Secure Enclave
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
