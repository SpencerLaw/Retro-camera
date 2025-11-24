import { GoogleGenAI, Modality } from "@google/genai";
import { GEMINI_MODEL_REMIX } from "../constants";

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

/**
 * Remixes an image using Gemini's image editing/generation capabilities.
 * @param base64Image The source image in base64 format (without data URI prefix preferably, but helper handles it)
 * @param prompt The text prompt describing the desired transformation
 * @returns The base64 data of the generated image
 */
export const remixImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const aiInstance = getAI();
    // Clean base64 string if it contains metadata
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const response = await aiInstance.models.generateContent({
      model: GEMINI_MODEL_REMIX,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    } else {
      throw new Error("No image data received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini Remix Error:", error);
    throw error;
  }
};