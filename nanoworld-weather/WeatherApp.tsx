import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import { WeatherData, GeneratedImage, AppState, WeatherStyle } from './types';
import { fetchWeatherAndContext, generateDioramaImage } from './services/geminiService';
import { getCachedWeather, setCachedWeather } from './utils/cache';

interface WeatherAppProps {
  onBackHome: () => void;
}

const WeatherApp: React.FC<WeatherAppProps> = ({ onBackHome }) => {
  const t = useTranslations();
  const [state, setState] = useState<AppState>({
    status: 'idle',
    weather: null,
    image: null,
    error: null,
    style: 'diorama',
  });

  // Function to execute the workflow
  const executeSearch = async (city: string, useCache: boolean = true) => {
    // 检查缓存
    if (useCache) {
      const cached = getCachedWeather(city, state.style);
      if (cached) {
        console.log(`Using cached data for ${city} with ${state.style} style`);
        setState({
          status: 'success',
          weather: cached.weather,
          image: cached.image,
          error: null,
          style: state.style,
        });
        return;
      }
    }

    setState(prev => ({ ...prev, status: 'loading_weather', error: null }));

    try {
      // 1. Fetch Weather
      const weatherData = await fetchWeatherAndContext(city, state.style);

      setState(prev => ({
        ...prev,
        weather: weatherData,
        status: 'generating_image'
      }));

      // 2. Generate Image
      const imageUrl = await generateDioramaImage(weatherData, state.style);
      const image: GeneratedImage = { url: imageUrl, alt: `${state.style === 'cake' ? 'Cake-style' : 'Miniature diorama'} of ${city}` };

      // 保存到缓存
      setCachedWeather(city, weatherData, image, state.style);

      setState({
        status: 'success',
        weather: weatherData,
        image: image,
        error: null,
        style: state.style,
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

  // Enhanced download function with weather info overlay
  const handleDownload = async () => {
    if (!state.image || !state.weather || state.status !== 'success') return;

    try {
      // Create an image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = state.image!.url;
      });

      // Create canvas with higher resolution
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Set canvas size to match loaded image (usually 4K if generation succeeded)
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Calculate responsive font sizes based on canvas width
      const baseFontSize = canvas.width / 25; // Dynamic sizing
      const cityFontSize = baseFontSize * 1.5;
      const tempFontSize = baseFontSize * 1.2;
      const conditionFontSize = baseFontSize * 0.9;
      const padding = canvas.width * 0.04;
      const lineHeight = baseFontSize * 1.3;

      // Create gradient background for text
      const gradientHeight = canvas.height * 0.25;
      const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

      // Set text styling
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = padding / 2;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let yPosition = canvas.height - padding;

      // Draw temperature and condition
      ctx.font = `bold ${tempFontSize}px Inter, system-ui, sans-serif`;
      const tempText = `${Math.round(state.weather.temperature)}°C`;
      ctx.fillText(tempText, padding, yPosition);
      
      // Measure temperature text width to position condition next to it
      const tempWidth = ctx.measureText(tempText).width;
      
      ctx.font = `${conditionFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(` • ${state.weather.condition}`, padding + tempWidth + padding / 2, yPosition);

      // Draw city and country
      yPosition -= lineHeight * 1.3;
      ctx.font = `bold ${cityFontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${state.weather.city}, ${state.weather.country}`, padding, yPosition);

      // Convert canvas to blob and download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Failed to create blob');
            return;
          }
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${state.weather?.city || 'weather'}-${state.weather?.temperature}C-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        'image/png',
        1.0 // Maximum quality
      );

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  // 不再自动加载，等待用户主动输入

  // Handle style change
  const handleStyleChange = (newStyle: WeatherStyle) => {
    setState(prev => ({ ...prev, style: newStyle, status: 'idle', weather: null, image: null, error: null }));
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-gray-900 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={onBackHome}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/80 hover:bg-white border-2 border-blue-500 backdrop-blur-sm transition-all text-blue-500 hover:text-blue-600 shadow-lg"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Style Selector - Fixed at top right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border-2 border-blue-100">
          <p className="text-xs font-bold text-gray-600 mb-2 text-center">{t('weather.styleSelector.title')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleStyleChange('diorama')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                state.style === 'diorama'
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={state.status === 'loading_weather' || state.status === 'generating_image'}
            >
              <div className="text-center">
                <div className="text-base mb-1">🏰</div>
                <div>{t('weather.styleSelector.diorama')}</div>
              </div>
            </button>
            <button
              onClick={() => handleStyleChange('cake')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                state.style === 'cake'
                  ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={state.status === 'loading_weather' || state.status === 'generating_image'}
            >
              <div className="text-center">
                <div className="text-base mb-1">🍰</div>
                <div>{t('weather.styleSelector.cake')}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

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
          onDownload={handleDownload}
          t={t}
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
