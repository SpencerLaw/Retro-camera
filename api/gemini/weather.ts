import { GoogleGenAI } from "@google/genai";

// Constants (copied to avoid import issues in serverless function)
const WEATHER_MAPPING_RULES = `
Strictly map the current weather condition to these visual descriptions:
- Clear / Sunny -> "cute smiling sun + thin cotton clouds"
- Partly cloudy -> "half sun half fluffy white clouds"
- Cloudy / Overcast -> "thick grey-white marshmallow clouds"
- Rain -> "soft cute raindrops falling from cotton clouds"
- Snow -> "soft fluffy snowflakes + snowman elements"
- Thunderstorm -> "tiny lightning bolts + dark cotton clouds"
- Fog / Mist -> "hazy cream-colored mist"
`;

const IMAGE_PROMPT_TEMPLATE = (location: string, weatherVisual: string) => 
  `Cute dreamy 3D tilt-shift miniature diorama of ${location} landmark, ultra-detailed banana-style soft pastel rendering, dreamy studio ghibli x pixar style, fluffy volumetric clouds, ${weatherVisual} made of cotton floating above, soft golden rim lighting, large white empty space around the island, floating in the sky, high quality, 8k, cinematic, masterpiece --stylize 750 --v 6`;

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1515266591878-5a146e04958c?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504198266287-16594a556bd6?q=80&w=1000&auto=format&fit=crop"
];

const getFallbackImage = () => {
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { action, city, weatherData } = req.body;

    if (action === 'fetchWeather') {
      // 获取天气数据
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        Find the current weather for ${city}.
        
        You are a weather data API.
        You MUST return a valid JSON object with the following structure.
        Do NOT output markdown formatting (like \`\`\`json). Return ONLY the raw JSON string.

        JSON Structure:
        {
          "city": "City Name",
          "country": "Country Name",
          "temperature": 25,
          "condition": "Partly Cloudy",
          "description": "Poetic phrase...",
          "visual_prompt_part": "..."
        }

        ${WEATHER_MAPPING_RULES}
        
        Based on the actual weather found via Google Search, select the ONE best matching visual description from the list above for 'visual_prompt_part'.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      let text = response.text;
      if (!text) throw new Error("No data received from weather service.");
      
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return res.status(200).json({ data: JSON.parse(text) });
    }

    if (action === 'generateImage') {
      // 生成图片
      const ai = new GoogleGenAI({ apiKey });
      
      const finalPrompt = IMAGE_PROMPT_TEMPLATE(
        `${weatherData.city}, ${weatherData.country}`, 
        weatherData.visual_prompt_part
      );

      const extractImage = (response: any) => {
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        return null;
      };

      try {
        // Attempt 1: High quality model
        const response = await ai.models.generateContent({
          model: "gemini-3-pro-image-preview",
          contents: {
            parts: [{ text: finalPrompt }]
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "4K"
            }
          }
        });

        const img = extractImage(response);
        if (img) {
          return res.status(200).json({ imageUrl: img });
        }
        throw new Error("No image data in Pro response");

      } catch (error) {
        console.warn("Pro image generation failed, falling back to Flash Image model:", error);

        try {
          // Attempt 2: Standard model
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: finalPrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: "1:1"
              }
            }
          });
          
          const img = extractImage(response);
          if (img) {
            return res.status(200).json({ imageUrl: img });
          }
          
          throw new Error("No image data in Flash response");

        } catch (fallbackError) {
          console.error("CRITICAL: All AI image generation failed. Using static fallback.", fallbackError);
          return res.status(200).json({ imageUrl: getFallbackImage() });
        }
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      error: error.message || 'API call failed' 
    });
  }
}

