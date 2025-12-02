import { WeatherData, WeatherStyle } from "../types";

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
export const fetchWeatherAndContext = async (city: string, style: WeatherStyle = 'diorama'): Promise<WeatherData> => {
  try {
    const response = await fetch('/api/gemini/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fetchWeather', city, style })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }

    const result = await response.json();
    
    // Check for location restriction error
    if (result.error === 'location_restricted') {
      throw new Error('LOCATION_RESTRICTED');
    }
    
    return result.data as WeatherData;
  } catch (error: any) {
    console.error("Weather Fetch Error:", error);
    
    // Re-throw location error as-is for special handling
    if (error.message === 'LOCATION_RESTRICTED') {
      throw error;
    }
    
    throw new Error("Failed to fetch weather data. Please try again.");
  }
};

/**
 * Step 2: Generate the Image
 * Includes strict fallback logic.
 */
export const generateDioramaImage = async (weatherData: WeatherData, style: WeatherStyle = 'diorama'): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateImage',
        weatherData,
        style
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const result = await response.json();
    return result.imageUrl;
  } catch (error) {
    console.error("Image Generation Error:", error);
    // Return fallback image on error
    return getFallbackImage();
  }
};