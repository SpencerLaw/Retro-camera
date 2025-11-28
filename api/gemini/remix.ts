import { GoogleGenAI, Modality } from "@google/genai";

// Constants (copied to avoid import issues in serverless function)
const GEMINI_MODEL_REMIX = 'gemini-2.5-flash-image';

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { base64Image, prompt } = req.body;

    if (!base64Image || !prompt) {
      return res.status(400).json({ error: 'Missing base64Image or prompt' });
    }

    const ai = new GoogleGenAI({ apiKey });
    
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
      return res.status(200).json({ 
        imageUrl: `data:image/png;base64,${part.inlineData.data}` 
      });
    } else {
      throw new Error("No image data received from Gemini.");
    }
  } catch (error: any) {
    console.error("Gemini Remix Error:", error);
    return res.status(500).json({ 
      error: error.message || 'Image remix failed' 
    });
  }
}

