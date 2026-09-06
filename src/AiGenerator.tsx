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

  return (
    <div className="glass-panel mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={24} className="text-purple" />
        <h3 style={{ margin: 0 }}>AI Mastery Plan Generator</h3>
      </div>
      <p className="text-muted text-sm mb-4">
        Enter any skill you want to master, and our AI will automatically generate a custom 5-phase roadmap for you.
      </p>
      <div className="flex gap-2">
        <input 
          type="text" 
          className="input-field" 
          placeholder="e.g. Machine Learning, Piano, Japanese..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={loading}
        />
        <button 
          className="btn btn-primary" 
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>
      {error && <p className="text-sm mt-2" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  );
}
