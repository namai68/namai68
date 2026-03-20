import { GoogleGenAI } from "@google/genai";

export const getAiClient = (apiKey?: string) => {
  const key = apiKey || localStorage.getItem('geminiApiKey') || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey: key });
};
