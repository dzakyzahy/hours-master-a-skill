import { GoogleGenAI } from '@google/genai';
import { useStore } from '../store';

let aiInstance: GoogleGenAI | null = null;

export const initAi = (apiKey: string) => {
  aiInstance = new GoogleGenAI({ apiKey });
};

export const getAiResponse = async (prompt: string, context?: string) => {
  if (!aiInstance) {
    const key = await useStore.getState().loadGeminiApiKey();
    if (!key) throw new Error("Gemini API Key is not set. Please set it in profile settings.");
    initAi(key);
  }
  
  const sysInstruction = context ? `You are Skillo AI, a learning assistant. Context: ${context}` : "You are Skillo AI, a learning assistant for the user.";
  
  try {
    const response = await aiInstance!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: sysInstruction
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
