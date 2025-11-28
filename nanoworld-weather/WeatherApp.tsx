import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import { WeatherData, GeneratedImage, AppState } from './types';
import { fetchWeatherAndContext, generateDioramaImage } from './services/geminiService';
import { DEFAULT_CITY } from './constants';

interface WeatherAppProps {
  onBackHome: () => void;
}

const WeatherApp: React.FC<WeatherAppProps> = ({ onBackHome }) => {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    weather: null,
    image: null,
    error: null,
  });

  // Function to execute the workflow
  const executeSearch = async (city: string) => {
    setState(prev => ({ ...prev, status: 'loading_weather', error: null }));

    try {
      // 1. Fetch Weather
      const weatherData = await fetchWeatherAndContext(city);

      setState(prev => ({
        ...prev,
        weather: weatherData,
        status: 'generating_image'
      }));

      // 2. Generate Image
      const imageUrl = await generateDioramaImage(weatherData);

      setState({
        status: 'success',
        weather: weatherData,
        image: { url: imageUrl, alt: `Miniature diorama of ${city}` },
        error: null,
      });

    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || "Something went wrong. Please try again."
      }));
    }
  };

  // Initial load
  useEffect(() => {
    executeSearch(DEFAULT_CITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-gray-900 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={onBackHome}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/80 hover:bg-white border-2 border-blue-500 backdrop-blur-sm transition-all text-blue-500 hover:text-blue-600 shadow-lg"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Background decoration (optional subtle shapes) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-50 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>

      <SearchBar
        onSearch={executeSearch}
        isLoading={state.status === 'loading_weather' || state.status === 'generating_image'}
      />

      <main className="z-10 w-full flex flex-col items-center justify-center mt-12 md:mt-0">
        <WeatherCard
          status={state.status}
          weather={state.weather}
          image={state.image}
        />

        {state.error && (
          <div className="mt-6 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-medium border border-red-100 max-w-md text-center">
            {state.error}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="absolute bottom-4 text-xs text-gray-400 font-medium">
         Powered by Gemini Pro Vision
      </footer>
    </div>
  );
};

export default WeatherApp;
