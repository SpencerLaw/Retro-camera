import { GoogleGenAI, Type } from "@google/genai";
import { WEATHER_MAPPING_RULES, IMAGE_PROMPT_TEMPLATE } from "../constants";
import { WeatherData } from "../types";

// Initialize the API client
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fallback images (Tilt-shift / Miniature style) to use if AI generation fails
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1515266591878-5a146e04958c?q=80&w=1000&auto=format&fit=crop", // Miniature City
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1000&auto=format&fit=crop", // City Skyline
  "https://images.unsplash.com/photo-1504198266287-16594a556bd6?q=80&w=1000&auto=format&fit=crop"  // Morning light
];

const getFallbackImage = () => {
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
};

/**
 * Step 1: Get Weather Data & Visual Description
 */
export const fetchWeatherAndContext = async (city: string): Promise<WeatherData> => {
  const ai = getAI();

  const prompt = `
    Find the current weather for ${city}.
    
    You are a weather data API.
    You MUST return a valid JSON object with the following structure.
    Do NOT output markdown formatting (like \`\`\`json). Return ONLY the raw JSON string.

    JSON Structure:
    {
      "city": "City Name",
      "country": "Country Name",
      "temperature": 25, // number in Celsius
      "condition": "Partly Cloudy", // short text
      "description": "Poetic phrase...", // 5-8 word description
      "visual_prompt_part": "..." // The specific visual string mapped from the rules below
    }

    ${WEATHER_MAPPING_RULES}
    
    Based on the actual weather found via Google Search, select the ONE best matching visual description from the list above for 'visual_prompt_part'.
  `;

  try {
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
    
    return JSON.parse(text) as WeatherData;
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    throw new Error("Failed to fetch weather data. Please try again.");
  }
};

/**
 * Step 2: Generate the Image
 * Includes strict fallback logic.
 */
export const generateDioramaImage = async (weatherData: WeatherData): Promise<string> => {
  const ai = getAI();
  
  const finalPrompt = IMAGE_PROMPT_TEMPLATE(
    `${weatherData.city}, ${weatherData.country}`, 
    weatherData.visual_prompt_part
  );

  console.log("Generating image with prompt:", finalPrompt);

  const extractImage = (response: any) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  };

  try {
    // Attempt 1: High quality model (Gemini 3 Pro Image)
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
    if (img) return img;
    throw new Error("No image data in Pro response");

  } catch (error) {
    console.warn("Pro image generation failed, falling back to Flash Image model:", error);

    try {
      // Attempt 2: Standard model (Gemini 2.5 Flash Image)
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
      if (img) return img;
      
      throw new Error("No image data in Flash response");

    } catch (fallbackError) {
       console.error("CRITICAL: All AI image generation failed. Using static fallback.", fallbackError);
       // Return a nice placeholder so the app doesn't break
       return getFallbackImage();
    }
  }
};