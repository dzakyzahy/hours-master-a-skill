import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRoute, faBolt, faCircleNotch, faKey, faLock } from '@fortawesome/free-solid-svg-icons';
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
        model: 'gemini-2.5-flash',
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
      {/* Header with Title & API Key Status Trigger (No Duplicate Button) */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <FontAwesomeIcon icon={faRoute} style={{ color: 'var(--accent-cyan)', fontSize: '15px' }} />
          <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
            AI Mastery Plan Generator
          </h2>
        </div>

        {/* Only show button in header if API key is already configured */}
        {effectiveKey && (
          <button 
            type="button"
            className="btn" 
            onClick={() => setIsKeyModalOpen(true)}
            style={{ height: '30px', padding: '0 10px', fontSize: '11px', fontFamily: 'Geist Mono, monospace', gap: '6px' }}
            title="Kelola Kunci API Gemini Anda"
          >
            <FontAwesomeIcon icon={faKey} style={{ color: '#22c55e', fontSize: '12px' }} />
            <span>API Key: Aktif</span>
            <span 
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: '#22c55e' 
              }} 
            />
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Masukkan keahlian yang ingin Anda kuasai, AI akan membuatkan roadmap belajar terstruktur 5 fase secara otomatis.
      </p>

      {/* Unconfigured Key Notice Banner - Single Clear CTA without duplication */}
      {!effectiveKey && (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '11px 14px', 
            background: 'rgba(245, 158, 11, 0.06)', 
            border: '1px solid rgba(245, 158, 11, 0.25)', 
            borderRadius: '6px', 
            marginBottom: '16px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div className="flex items-center gap-2.5" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <FontAwesomeIcon icon={faLock} style={{ color: '#f59e0b', flexShrink: 0, fontSize: '14px' }} />
            <span>Kunci API Gemini diperlukan untuk membuat roadmap otomatis. Kunci disimpan privat di akun Anda.</span>
          </div>
          <button 
            type="button" 
            className="btn-primary" 
            style={{ height: '32px', padding: '0 14px', fontSize: '11.5px', gap: '6px' }}
            onClick={() => setIsKeyModalOpen(true)}
          >
            <FontAwesomeIcon icon={faKey} style={{ fontSize: '11px' }} /> Masukkan Kunci API
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
          style={{ height: '38px', padding: '0 16px', whiteSpace: 'nowrap', fontSize: '12px', gap: '6px' }}
        >
          {loading ? (
            <FontAwesomeIcon icon={faCircleNotch} spin style={{ fontSize: '13px' }} />
          ) : (
            <FontAwesomeIcon icon={faBolt} style={{ fontSize: '12px' }} />
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
