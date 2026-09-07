import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkle, CircleNotch, Key, ShieldCheck } from '@phosphor-icons/react';
import { useStore, type SkillPhase } from './store';
import { ApiKeyModal } from './components/ApiKeyModal';

export function AiGenerator() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const { addProject, geminiApiKey, loadGeminiApiKey } = useStore();

  useEffect(() => {
    loadGeminiApiKey();
  }, [loadGeminiApiKey]);

  const effectiveKey = (geminiApiKey || '').trim();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    if (!effectiveKey) {
      setIsKeyModalOpen(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: effectiveKey });
      const prompt = `Create a 5-phase mastery plan for learning "${topic}". 
      The total hours should be around 750-1000 hours.
      Output exactly 5 phases.`;

      const interaction = await ai.interactions.create({
        model: 'gemini-3.6-flash',
        input: prompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              project_name: { type: "string", description: "A short, concise name for this project (max 30 characters)." },
              phases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Title of the phase" },
                    hoursStart: { type: "integer", description: "Start hour (e.g. 1)" },
                    hoursEnd: { type: "integer", description: "End hour" },
                    desc: { type: "string", description: "Short description of what is learned" }
                  },
                  required: ["title", "hoursStart", "hoursEnd", "desc"]
                }
              }
            },
            required: ["project_name", "phases"]
          }
        }
      });

      const data = JSON.parse(interaction.output_text || '{}');
      if (data && Array.isArray(data.phases) && data.phases.length > 0) {
        addProject(data.project_name || topic.trim(), data.phases as SkillPhase[]);
        setTopic('');
      } else {
        setError('Format respon AI tidak sesuai. Coba ulangi dengan topik yang lebih spesifik.');
      }
    } catch (err: any) {
      console.error("AI Generation error:", err);
      if (err.message && (err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid'))) {
        setError('Kunci API Gemini tidak valid atau kuota habis. Silakan periksa kunci Anda.');
      } else {
        setError(err.message || 'Terjadi kendala koneksi ke server Gemini.');
      }
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Machine Learning',
    'Mobile App Dev',
    'Piano & Musik',
    'UI/UX Design'
  ];

  return (
    <div className="glass-panel mt-6" style={{ padding: '24px', position: 'relative' }}>
      {/* Header with Title & API Key Status Trigger */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" style={{ color: 'var(--accent-cyan)' }} />
          <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
            AI Mastery Plan Generator
          </h2>
        </div>

        <button 
          type="button"
          className="btn" 
          onClick={() => setIsKeyModalOpen(true)}
          style={{ height: '30px', padding: '0 10px', fontSize: '11px', fontFamily: 'Geist Mono, monospace', gap: '6px' }}
          title="Kelola Kunci API Gemini Anda"
        >
          <Key size={13} weight={effectiveKey ? 'fill' : 'regular'} style={{ color: effectiveKey ? '#22c55e' : '#f59e0b' }} />
          <span>{effectiveKey ? 'API Key: Aktif' : 'Konfigurasi API Key'}</span>
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: effectiveKey ? '#22c55e' : '#f59e0b' 
            }} 
          />
        </button>
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Masukkan keahlian yang ingin Anda kuasai, AI akan membuatkan roadmap belajar terstruktur 5 fase secara otomatis.
      </p>

      {/* Unconfigured Key Notice Banner */}
      {!effectiveKey && (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '10px 14px', 
            background: 'rgba(245, 158, 11, 0.06)', 
            border: '1px solid rgba(245, 158, 11, 0.25)', 
            borderRadius: '6px', 
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div className="flex items-center gap-2.5" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={18} weight="fill" style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>Kunci API Gemini diperlukan untuk membuat roadmap otomatis. Kunci disimpan privat di akun Anda.</span>
          </div>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ height: '30px', padding: '0 12px', fontSize: '11px', gap: '5px' }}
            onClick={() => setIsKeyModalOpen(true)}
          >
            <Key size={13} /> Masukkan Kunci API
          </button>
        </div>
      )}

      {/* Quick Suggestion Pills - Minimalist Template Fit */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <span style={{ fontSize: '10.5px', color: 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap', marginRight: '2px' }}>
          Ide Cepat:
        </span>
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            className="chip-suggestion"
            style={{ fontSize: '10.5px', height: '24px', padding: '0 8px', borderRadius: '4px' }}
            onClick={() => setTopic(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input 
          type="text" 
          className="input-field flex-1" 
          placeholder="Ketik topik keahlian: e.g. Machine Learning, Mobile App, Piano..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
          style={{ height: '38px', fontSize: '12.5px', fontFamily: 'Geist, sans-serif' }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
        />
        <button 
          className="btn-primary" 
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          style={{ height: '38px', padding: '0 16px', whiteSpace: 'nowrap', fontSize: '12px' }}
        >
          {loading ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <Sparkle size={14} weight="fill" />
          )}
          <span>{loading ? 'Membuat Roadmap...' : 'Generate Plan'}</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '12px', color: '#ef4444' }}>
          <span>{error}</span>
          {!effectiveKey && (
            <button 
              type="button"
              className="btn" 
              style={{ height: '26px', padding: '0 8px', fontSize: '11px', color: 'var(--text-primary)' }}
              onClick={() => setIsKeyModalOpen(true)}
            >
              Buka Pengaturan Kunci
            </button>
          )}
        </div>
      )}

      {/* Api Key Modal Dialog */}
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSaved={() => setError('')}
      />
    </div>
  );
}
