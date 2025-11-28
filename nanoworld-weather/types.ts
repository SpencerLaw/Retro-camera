export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  condition: string; // e.g., "Partly Cloudy"
  description: string; // The poetic short quote
  visual_prompt_part: string; // The specific string mapped from the condition for the image prompt
}

export interface GeneratedImage {
  url: string;
  alt: string;
}

export interface AppState {
  status: 'idle' | 'loading_weather' | 'generating_image' | 'success' | 'error';
  weather: WeatherData | null;
  image: GeneratedImage | null;
  error: string | null;
}