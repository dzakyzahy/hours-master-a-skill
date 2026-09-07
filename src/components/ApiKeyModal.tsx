import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, Check, AlertCircle, Eye, EyeOff, ExternalLink, Trash2, Loader2 } from 'lucide-react';
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
      }, 1200);
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
          maxWidth: '540px', 
          maxHeight: '92vh', 
          overflowY: 'auto', 
          position: 'relative',
          padding: '28px',
          border: '1px solid var(--border-hairline-strong)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="btn" 
          style={{ position: 'absolute', top: 20, right: 20, width: '32px', height: '32px', padding: 0 }}
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '6px', 
              background: 'var(--surface-input)', 
              border: '1px solid var(--border-hairline-strong)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}
          >
            <Key size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Pengaturan Kunci API Gemini
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Integrasi privat AI Mastery Generator
            </span>
          </div>
        </div>

        {/* Security Assurance Card */}
        <div 
          style={{ 
            padding: '12px 14px', 
            borderRadius: '4px', 
            background: 'rgba(0, 229, 255, 0.04)', 
            border: '1px solid rgba(0, 229, 255, 0.15)',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          <ShieldCheck size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
              Keamanan Data & Privasi Terjamin
            </span>
            Kunci API disimpan secara privat di database Supabase akun Anda (<code style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--accent-cyan)', fontSize: '11px' }}>user_secrets</code>) dengan proteksi Row Level Security (RLS). Kunci tidak pernah dibagikan atau dipublikasikan.
          </div>
        </div>

        {/* Current Key Status Badge */}
        <div className="flex justify-between items-center mb-3">
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Status Kunci API
          </span>
          {isConfigured ? (
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '11px', 
                fontFamily: 'Geist Mono, monospace', 
                color: '#4ade80',
                padding: '3px 8px',
                borderRadius: '3px',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                background: 'rgba(74, 222, 128, 0.05)'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
              Tersimpan & Aktif
            </span>
          ) : (
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '11px', 
                fontFamily: 'Geist Mono, monospace', 
                color: '#f59e0b',
                padding: '3px 8px',
                borderRadius: '3px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                background: 'rgba(245, 158, 11, 0.05)'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              Belum Dikonfigurasi
            </span>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label 
              htmlFor="gemini-key-input" 
              style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}
            >
              Gemini API Key
            </label>
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
                  letterSpacing: showKey ? '0.02em' : '0.15em',
                  fontSize: '13px',
                  height: '42px'
                }}
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="button" 
                onClick={() => setShowKey(!showKey)} 
                className="btn" 
                style={{ 
                  position: 'absolute', 
                  right: '6px', 
                  width: '32px', 
                  height: '32px', 
                  padding: 0, 
                  border: 'none',
                  color: 'var(--text-placeholder)' 
                }}
                title={showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span style={{ fontSize: '11px', color: 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace' }}>
                Format: AIzaSy... (39 karakter)
              </span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-primary)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border-hairline-strong)'
                }}
              >
                Dapatkan API Key Gratis <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Test and Save Results Banner */}
          {testResult && (
            <div 
              style={{ 
                padding: '10px 14px', 
                borderRadius: '4px', 
                marginBottom: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                fontSize: '12px',
                background: testResult.success ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: testResult.success ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                color: testResult.success ? '#4ade80' : '#f87171'
              }}
            >
              {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveSuccess && (
            <div 
              style={{ 
                padding: '10px 14px', 
                borderRadius: '4px', 
                marginBottom: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                fontSize: '12px',
                background: 'rgba(74, 222, 128, 0.08)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                color: '#4ade80'
              }}
            >
              <Check size={16} />
              <span>Kunci API berhasil disimpan secara privat di database akun Anda!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end mt-4 pt-4" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            {geminiApiKey && (
              <button 
                type="button" 
                className="btn" 
                onClick={handleClear}
                style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)', marginRight: 'auto' }}
                title="Hapus Kunci API yang tersimpan"
              >
                <Trash2 size={14} /> Hapus
              </button>
            )}

            <button 
              type="button" 
              className="btn" 
              onClick={handleTestKey}
              disabled={testing || !keyInput.trim()}
              style={{ height: '38px', padding: '0 14px' }}
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {testing ? 'Menguji...' : 'Uji Koneksi'}
            </button>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={saving || !keyInput.trim()}
              style={{ height: '38px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan Kunci API'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
