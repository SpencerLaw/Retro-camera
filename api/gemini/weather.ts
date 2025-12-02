import { GoogleGenAI, Modality, Type } from "@google/genai";

// Constants (copied to avoid import issues in serverless function)
const DIORAMA_WEATHER_MAPPING = `
Strictly map the current weather condition to these visual descriptions:
- Clear / Sunny -> "cute smiling sun + thin cotton clouds"
- Partly cloudy -> "half sun half fluffy white clouds"
- Cloudy / Overcast -> "thick grey-white marshmallow clouds"
- Rain -> "soft cute raindrops falling from cotton clouds"
- Snow -> "soft fluffy snowflakes + snowman elements"
- Thunderstorm -> "tiny lightning bolts + dark cotton clouds"
- Fog / Mist -> "hazy cream-colored mist"
`;

const CAKE_WEATHER_MAPPING = `
Strictly map the current weather condition to these visual descriptions for cake style:
- Clear / Sunny -> "sunlight makes the cream slightly melt and creates soft highlights, golden glaze dripping"
- Partly cloudy -> "half sunshine with fluffy whipped cream clouds, caramel glaze"
- Cloudy / Overcast -> "thick layers of whipped cream and meringue clouds covering the scene"
- Rain -> "rain like syrup and sugar pearls, forming glossy flowing textures, chocolate drizzle"
- Snow -> "snow like frosting and powdered sugar covering rooftops and cake surfaces, vanilla glaze"
- Thunderstorm -> "dark chocolate ganache clouds with silver sugar lightning bolts"
- Fog / Mist -> "misty sugar veil, translucent icing fog effect"
`;

const DIORAMA_PROMPT_TEMPLATE = (location: string, weatherVisual: string) =>
  `Cute dreamy 3D tilt-shift miniature diorama of ${location} landmark, ultra-detailed banana-style soft pastel rendering, dreamy studio ghibli x pixar style, fluffy volumetric clouds, ${weatherVisual} made of cotton floating above, soft golden rim lighting, large white empty space around the island, floating in the sky, high quality, 8k, cinematic, masterpiece --stylize 750 --v 6`;

const CAKE_PROMPT_TEMPLATE = (location: string, weatherVisual: string) =>
  `Adorable 3D isometric cake-style miniature of ${location} iconic landmarks, made entirely of delicious pastry and dessert elements. ${weatherVisual}. Buildings are crafted from layered cakes, cookies, and wafers with realistic PBR materials. Use soft, delicate textures with gentle realistic lighting and shadow effects, creating a sweet dreamy atmosphere. At the top center of the image, place a large bold English title "[CITYNAME]", below it a clear weather icon, then date (small text) and temperature (medium text). All text should be center-aligned with consistent spacing, may slightly overlap with landmarks but should not obscure main outlines. Clean, minimalist composition with soft solid color or subtle gradient background. Square format 1080x1080, high resolution, ultra-detailed, soft lighting, global illumination, cinematic --stylize 750 --v 6`.replace('[CITYNAME]', location.split(',')[0].trim());

interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
}

const WEATHER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    city: { type: Type.STRING },
    country: { type: Type.STRING },
    temperature: { type: Type.NUMBER },
    condition: { type: Type.STRING },
    description: { type: Type.STRING },
    visual_prompt_part: { type: Type.STRING },
  },
  required: ["city", "country", "temperature", "condition", "description", "visual_prompt_part"],
};

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
    const { action, city, weatherData, style = 'diorama' } = req.body;

    if (action === 'fetchWeather') {
      // 获取天气数据
      const ai = new GoogleGenAI({ apiKey });

      // 根据风格选择映射规则
      const weatherMappingRules = style === 'cake' ? CAKE_WEATHER_MAPPING : DIORAMA_WEATHER_MAPPING;

      const prompt = `
        Generate weather data for ${city}.

        You are a weather data API that generates realistic and typical weather for the given city.
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

        ${weatherMappingRules}

        Based on typical weather patterns for this location, select the ONE best matching visual description from the list above for 'visual_prompt_part'.
        Make the weather realistic and appropriate for the current season and location.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: WEATHER_RESPONSE_SCHEMA,
          temperature: 0.8,
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No data received from weather service.");
      }

      const weatherData = JSON.parse(text);
      return res.status(200).json({ data: weatherData });
    }

    if (action === 'generateImage') {
      // 生成图片
      const ai = new GoogleGenAI({ apiKey });

      // 根据风格选择提示词模板
      const promptTemplate = style === 'cake' ? CAKE_PROMPT_TEMPLATE : DIORAMA_PROMPT_TEMPLATE;
      const finalPrompt = promptTemplate(
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
            responseModalities: [Modality.IMAGE],
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
              responseModalities: [Modality.IMAGE],
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
    console.error("API Error Details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack
    });
    
    // Check for location/region errors
    if (error?.message?.includes('location is not supported') || 
        error?.message?.includes('FAILED_PRECONDITION') ||
        error?.message?.includes('User location is not supported') ||
        error?.status === 'FAILED_PRECONDITION') {
      return res.status(200).json({ 
        error: 'location_restricted',
        message: 'Service unavailable in your region'
      });
    }
    
    return res.status(500).json({
      error: error.message || 'API call failed',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
}

