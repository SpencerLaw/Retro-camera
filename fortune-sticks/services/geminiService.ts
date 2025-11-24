import { GoogleGenAI } from "@google/genai";
import { FortuneData, Language } from '../types';
import { MODEL_NAME, SYSTEM_INSTRUCTION, FORTUNE_SCHEMA } from '../constants';

// Lazy initialization to avoid errors when API key is not set
let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!ai) {
    // Vite automatically replaces import.meta.env.VITE_* at build time
    // @ts-ignore - Vite will replace this at build time
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
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
  } catch (error: any) {
    console.error("Fortune generation failed:", error);
    
    // Check for location/region errors
    if (error?.message?.includes('location is not supported') || 
        error?.message?.includes('FAILED_PRECONDITION') ||
        error?.status === 'FAILED_PRECONDITION') {
      return getLocationErrorFortune(language);
    }
    
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

const getLocationErrorFortune = (lang: Language): FortuneData => {
  if (lang === 'en') {
    return {
      title: "Regional Restriction",
      poem: ["The oracle's voice is distant,", "Geographic bounds restrict its call.", "Yet wisdom flows from other sources,", "Your fortune waits beyond this wall."],
      meaning: "Service unavailable in your region.",
      interpretation: "The Gemini API is not available in your current location. The spirits suggest using a VPN or trying again from a supported region. Alternatively, you can still enjoy the other apps in this studio!"
    };
  } else if (lang === 'ja') {
    return {
      title: "地域制限",
      poem: ["神の声は遠く", "地理的境界がその呼びかけを制限する", "しかし知恵は他の源から流れる", "あなたの運命はこの壁の向こうで待っている"],
      meaning: "お住まいの地域ではサービスをご利用いただけません",
      interpretation: "Gemini APIは現在の地域では利用できません。VPNを使用するか、サポートされている地域から再度お試しください。または、このスタジオの他のアプリをお楽しみください！"
    };
  }
  
  // Default Chinese
  return {
    title: "靈簽 (地區限制)",
    poem: ["神靈之聲遠", "地理界限阻", "智慧仍可尋", "運勢待他途"],
    meaning: "您的地區暫不支持此服務",
    interpretation: "Gemini API 在您當前的地區不可用。神靈建議：可以使用 VPN 或從支持的地區重試。不過，您仍然可以享受工作室中的其他應用！"
  };
};

