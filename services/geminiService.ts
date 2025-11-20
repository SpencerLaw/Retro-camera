import { GoogleGenAI, Modality } from "@google/genai";
import { GEMINI_MODEL_REMIX } from "../constants";

// Initialize Gemini Client
// API Key must be set in environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Remixes an image using Gemini's image editing/generation capabilities.
 * @param base64Image The source image in base64 format (without data URI prefix preferably, but helper handles it)
 * @param prompt The text prompt describing the desired transformation
 * @returns The base64 data of the generated image
 */
export const remixImageWithGemini = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    // Clean base64 string if it contains metadata
    const cleanBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    const response = await ai.models.generateContent({
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