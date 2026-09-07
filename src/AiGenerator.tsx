import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';
import { useStore, type SkillPhase } from './store';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export function AiGenerator() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const addProject = useStore(state => state.addProject);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    if (!API_KEY) {
      setError('Gemini API Key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
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
        addProject(data.project_name || "Custom Project", data.phases as SkillPhase[]);
        setTopic('');
      } else {
        setError('Failed to generate a valid plan.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'UI/UX Mobile Design',
    'React & React Native',
    'Machine Learning & Python',
    'Public Speaking'
  ];

  return (
    <div className="glass-panel mt-6" style={{ padding: '24px' }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} style={{ color: 'var(--text-secondary)' }} />
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          AI Mastery Plan Generator
        </h2>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Masukkan keahlian yang ingin Anda kuasai, AI akan membuatkan roadmap belajar terstruktur 5 fase secara otomatis.
      </p>

      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <span style={{ fontSize: '11px', color: 'var(--text-placeholder)', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>
          Ide Cepat:
        </span>
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            className="btn"
            style={{ fontSize: '11px', height: '28px', padding: '0 10px', whiteSpace: 'nowrap', fontFamily: 'Geist Mono, monospace', color: 'var(--text-secondary)' }}
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
          placeholder="Ketik topik: e.g. Machine Learning, Mobile App, Piano..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
        />
        <button 
          className="btn-primary" 
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          style={{ height: '40px', padding: '0 18px', whiteSpace: 'nowrap' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? 'Membuat Roadmap...' : 'Generate Plan'}
        </button>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#f87171', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}
