import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faXmark, 
  faKey, 
  faShieldHalved, 
  faCheck, 
  faCircleExclamation, 
  faEye, 
  faEyeSlash, 
  faArrowUpRightFromSquare, 
  faTrashCan, 
  faCircleNotch 
} from '@fortawesome/free-solid-svg-icons';
import { useStore } from '../store';
import { GoogleGenAI } from '@google/genai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onSaved }: ApiKeyModalProps) {
  const { geminiApiKey, setGeminiApiKey, clearGeminiApiKey, loadGeminiApiKey } = useStore();
  const [keyInput, setKeyInput] = useState(geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    loadGeminiApiKey().then(k => {
      if (active && k) setKeyInput(k);
    });
    return () => { active = false; };
  }, [loadGeminiApiKey]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const keyToTest = keyInput.trim() || geminiApiKey;
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Harap masukkan kunci API terlebih dahulu.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const response = await ai.interactions.create({
        model: 'gemini-2.5-flash',
        input: 'Test ping. Reply with OK.',
      });

      if (response && response.output_text) {
        setTestResult({ success: true, message: 'Kunci API valid! Koneksi ke Gemini AI berhasil.' });
      } else {
        setTestResult({ success: true, message: 'Kunci API terverifikasi.' });
      }
    } catch (err: any) {
      setTestResult({ 
        success: false, 
        message: err.message || 'Koneksi gagal. Periksa kembali apakah kunci API Anda benar dan aktif.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setTestResult({ success: false, message: 'Kunci API tidak boleh kosong.' });
      return;
    }

    setSaving(true);
    try {
      await setGeminiApiKey(keyInput.trim());
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setTestResult({ success: false, message: 'Gagal menyimpan: ' + (err?.message || 'Error tidak diketahui') });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Hapus kunci API Gemini yang tersimpan?')) {
      await clearGeminiApiKey();
      setKeyInput('');
      setTestResult({ success: true, message: 'Kunci API berhasil dihapus.' });
    }
  };

  const isConfigured = Boolean(geminiApiKey || keyInput.trim());

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(5, 7, 10, 0.75)', 
        backdropFilter: 'blur(8px)', 
        zIndex: 100, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '20px' 
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel no-drag" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          maxHeight: '92vh', 
          overflowY: 'auto', 
          position: 'relative',
          padding: '24px 28px',
          borderRadius: '8px',
          border: '1px solid var(--border-hairline-strong)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="btn-icon" 
          style={{ position: 'absolute', top: '18px', right: '18px', width: '32px', height: '32px' }}
          aria-label="Tutup"
        >
          <FontAwesomeIcon icon={faXmark} className="text-[14px]" />
        </button>

        {/* Modal Header: Aligned with Security Card below */}
        <div className="flex items-start gap-3 mb-4">
          <div 
            style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '6px', 
              background: 'var(--surface-input)', 
              border: '1px solid var(--border-hairline-strong)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}
          >
            <FontAwesomeIcon icon={faKey} className="text-[15px]" />
          </div>
          <div style={{ paddingLeft: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'Geist, sans-serif', lineHeight: 1.3 }}>
              Pengaturan Kunci API Gemini
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>
              Integrasi privat AI Mastery Generator
            </span>
          </div>
        </div>

        {/* Security Assurance Card */}
        <div 
          style={{ 
            padding: '11px 14px', 
            borderRadius: '6px', 
            background: 'rgba(2, 132, 199, 0.05)', 
            border: '1px solid rgba(2, 132, 199, 0.18)',
            marginBottom: '18px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}
        >
          <FontAwesomeIcon icon={faShieldHalved} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '3px', fontSize: '15px' }} />
          <div style={{ fontSize: '11.5px', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
              Keamanan Data & Privasi Terjamin
            </span>
            Kunci disimpan privat di database Supabase akun Anda (<code style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--accent-cyan)', fontSize: '10.5px' }}>user_secrets</code>) dengan proteksi RLS. Kunci tidak pernah dibagikan atau dipublikasikan.
          </div>
        </div>

        {/* Status Row: Visually demarcated */}
        <div 
          className="flex justify-between items-center mb-4 px-3 py-2 rounded"
          style={{ background: 'var(--surface-input)', border: '1px solid var(--border-hairline)' }}
        >
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Status Integrasi
          </span>
          {isConfigured ? (
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                fontSize: '9px', 
                fontFamily: 'Geist, sans-serif', 
                color: '#22c55e',
                fontWeight: 600,
                letterSpacing: '0.01em'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              Tersimpan & Aktif
            </span>
          ) : (
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px', 
                fontSize: '9px', 
                fontFamily: 'Geist, sans-serif', 
                color: '#f59e0b',
                fontWeight: 600,
                letterSpacing: '0.01em'
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Belum Dikonfigurasi
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label 
                htmlFor="gemini-key-input" 
                style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--accent-cyan)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  textDecoration: 'none'
                }}
              >
                Dapatkan API Key Gratis <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: '10px' }} />
              </a>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                id="gemini-key-input"
                type={showKey ? 'text' : 'password'} 
                className="input-field" 
                placeholder="AIzaSy..." 
                value={keyInput} 
                onChange={(e) => setKeyInput(e.target.value)} 
                style={{ 
                  paddingRight: '40px', 
                  fontFamily: showKey ? 'Geist Mono, monospace' : 'inherit',
                  letterSpacing: showKey ? '0.01em' : '0.15em',
                  fontSize: '13px',
                  height: '40px'
                }}
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="button" 
                onClick={() => setShowKey(!showKey)} 
                style={{ 
                  position: 'absolute', 
                  right: '8px', 
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-placeholder)' 
                }}
                title={showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
              >
                {showKey ? <FontAwesomeIcon icon={faEyeSlash} style={{ fontSize: '15px' }} /> : <FontAwesomeIcon icon={faEye} style={{ fontSize: '15px' }} />}
              </button>
            </div>

            <div className="flex justify-between items-center mt-1.5">
              <span style={{ fontSize: '10.5px', color: 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace' }}>
                Format standar: AIzaSy... (39 karakter)
              </span>
            </div>
          </div>

          {/* Test and Save Results Banner */}
          {testResult && (
            <div 
              style={{ 
                padding: '9px 12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '12px',
                background: testResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: testResult.success ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                color: testResult.success ? '#22c55e' : '#ef4444'
              }}
            >
              {testResult.success ? <FontAwesomeIcon icon={faCheck} className="text-[14px]" /> : <FontAwesomeIcon icon={faCircleExclamation} className="text-[14px]" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveSuccess && (
            <div 
              style={{ 
                padding: '9px 12px', 
                borderRadius: '6px', 
                marginBottom: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '12px',
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#22c55e'
              }}
            >
              <FontAwesomeIcon icon={faCheck} className="text-[14px]" />
              <span>Kunci API berhasil disimpan secara privat di database akun Anda!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-4 pt-3" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            {geminiApiKey && (
              <button 
                type="button" 
                className="btn" 
                onClick={handleClear}
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)', marginRight: 'auto', height: '36px', fontSize: '12px' }}
                title="Hapus Kunci API yang tersimpan"
              >
                <FontAwesomeIcon icon={faTrashCan} style={{ fontSize: '13px' }} /> Hapus
              </button>
            )}

            <button 
              type="button" 
              className="btn" 
              onClick={handleTestKey}
              disabled={testing || !keyInput.trim()}
              style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
            >
              {testing ? <FontAwesomeIcon icon={faCircleNotch} spin style={{ fontSize: '13px' }} /> : <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '13px' }} />}
              <span>{testing ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={saving || !keyInput.trim()}
              style={{ height: '36px', padding: '0 16px', fontSize: '12px' }}
            >
              {saving ? <FontAwesomeIcon icon={faCircleNotch} spin style={{ fontSize: '13px' }} /> : <FontAwesomeIcon icon={faCheck} style={{ fontSize: '13px' }} />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Kunci API'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
