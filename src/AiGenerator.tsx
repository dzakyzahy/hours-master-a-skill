import { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRoute, faWandMagicSparkles, faCircleNotch, faKey, faLock, faChevronUp, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useStore, type SkillPhase } from './store';
import { ApiKeyModal } from './components/ApiKeyModal';

export function AiGenerator() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
        setIsExpanded(false); // Otomatis tutup setelah sukses dibuat
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
    <div className="glass-panel ai-generator-panel mt-4" style={{ position: 'relative' }}>
      {/* Header Bar with Toggle */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '8px', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
            <FontAwesomeIcon icon={faRoute} style={{ fontSize: '13px' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                AI Mastery Roadmap
              </h2>
              <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Gemini
              </span>
            </div>
            {!isExpanded && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Buat 5 fase roadmap belajar otomatis
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
          {effectiveKey && (
            <button 
              type="button"
              className="btn" 
              onClick={() => setIsKeyModalOpen(true)}
              style={{ height: '26px', padding: '0 8px', fontSize: '10px', fontFamily: 'Geist Mono, monospace', gap: '5px' }}
              title="Kelola Kunci API Gemini Anda"
            >
              <FontAwesomeIcon icon={faKey} style={{ color: '#22c55e', fontSize: '10px' }} />
              <span>API Aktif</span>
            </button>
          )}

          <button
            type="button"
            className={isExpanded ? "btn" : "btn-primary"}
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ height: '28px', padding: '0 10px', fontSize: '11px', gap: '5px', borderRadius: '6px' }}
          >
            {isExpanded ? (
              <>
                <span>Tutup</span>
                <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: '10px' }} />
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                <span>Buat Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-hairline)' }}>
          <p className="ai-plan-desc" style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Ketik keahlian yang ingin dikuasai. AI akan menyusun roadmap 5 fase terukur (total ~1.000 jam).
          </p>

          {/* Unconfigured Key Notice Banner */}
          {!effectiveKey && (
            <div className="ai-key-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-secondary)', flex: '1 1 200px' }}>
                <FontAwesomeIcon icon={faLock} style={{ color: '#f59e0b', flexShrink: 0, fontSize: '13px' }} />
                <span>Kunci API Gemini diperlukan untuk menyusun roadmap otomatis.</span>
              </div>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ height: '30px', padding: '0 12px', fontSize: '11px', gap: '6px', whiteSpace: 'nowrap' }}
                onClick={() => setIsKeyModalOpen(true)}
              >
                <FontAwesomeIcon icon={faKey} style={{ fontSize: '10px' }} /> Atur API Key
              </button>
            </div>
          )}

          {/* Quick Suggestion Pills - Minimalist Template Fit */}
          <div className="ai-suggestion-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', overflowX: 'auto', width: '100%', maxWidth: '100%', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-placeholder)', fontFamily: "'Geist', sans-serif", whiteSpace: 'nowrap', marginRight: '4px', fontWeight: 500, flexShrink: 0 }}>
              Ide Cepat:
            </span>
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                className="chip-suggestion"
                style={{ fontSize: '11px', height: '26px', padding: '0 10px', borderRadius: '9999px', flexShrink: 0, whiteSpace: 'nowrap' }}
                onClick={() => setTopic(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="ai-plan-form">
            <input 
              type="text" 
              id="aiPlanTopic"
              name="aiPlanTopic"
              className="ai-plan-input" 
              placeholder="Ketik topik keahlian: e.g. Machine Learning, Mobile App, Piano..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
            />
            <button 
              className="ai-plan-btn" 
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
            >
              {loading ? (
                <FontAwesomeIcon icon={faCircleNotch} spin style={{ fontSize: '14px' }} />
              ) : (
                <FontAwesomeIcon icon={faWandMagicSparkles} style={{ fontSize: '13px' }} />
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
