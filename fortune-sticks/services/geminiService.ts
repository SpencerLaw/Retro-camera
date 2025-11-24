import { GoogleGenAI } from "@google/genai";
import { FortuneData, Language } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, FORTUNE_SCHEMA } from '../constants';

// Lazy initialization to avoid errors when API key is not set
let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    if (!apiKey) {
      throw new Error("API Key is not configured. Please set VITE_GEMINI_API_KEY environment variable.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const PROMPT_BY_LANG: Record<Language, string> = {
  'zh-TW': "請隨機為我抽一支靈簽。使用繁體中文生成結果。Title 格式如 '第八簽 上上'。Poem 必須是四句七言或五言絕句。",
  'zh-CN': "请随机为我抽一支灵签。使用简体中文生成结果。Title 格式如 '第八签 上上'。Poem 必须是四句七言或五言绝句。",
  'en': "Randomly draw a Chinese fortune stick for me. Generate the result in English. Title format should be 'Sign No. X - [Luck Level]'. The poem should be translated poetically.",
  'ja': "私のためにおみくじを引いてください。結果を日本語で生成してください。Titleは「第八番 大吉」のような形式にしてください。Poemは漢詩、または詩的な表現にしてください。"
};

export const generateFortune = async (language: Language): Promise<FortuneData> => {
  try {
    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: MODEL_NAME,
      contents: PROMPT_BY_LANG[language],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: FORTUNE_SCHEMA,
        temperature: 1.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    
    return JSON.parse(text) as FortuneData;
  } catch (error) {
    console.error("Fortune generation failed:", error);
    // Fallback fortune based on language
    return getFallbackFortune(language);
  }
};

const getFallbackFortune = (lang: Language): FortuneData => {
  if (lang === 'en') {
    return {
      title: "Connection Error",
      poem: ["Clouds obscure the mountain peak,", "The path ahead is hard to seek.", "Wait for the mist to clear away,", "The sun will shine another day."],
      meaning: "Patience is required.",
      interpretation: "The connection to the spirits (API) is currently weak. Please check your network and try again."
    };
  } else if (lang === 'ja') {
    return {
      title: "通信エラー",
      poem: ["雲深くして処を知らず", "静かに天の時を待つ", "網の道に障りありとも", "心誠なれば運は開く"],
      meaning: "焦ってはいけません",
      interpretation: "神霊との接続（API）が不安定です。ネットワークを確認して、もう一度お試しください。"
    };
  }
  
  // Default Chinese
  return {
    title: "靈簽 (網絡延遲)",
    poem: ["雲深不知處", "靜心待天時", "網絡雖有礙", "心誠運自開"],
    meaning: "稍安勿躁",
    interpretation: "與神靈的連接似乎有些波動 (API Error)。請檢查網絡連接後重試。"
  };
};

