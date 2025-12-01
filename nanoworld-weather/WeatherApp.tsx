import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
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
  const [cityInput, setCityInput] = useState('');

  // Function to execute the workflow
  const executeSearch = async () => {
    if (!cityInput.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a city name' }));
      return;
    }

    const city = cityInput.trim();

    // 检查缓存
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
    <div className="min-h-screen bg-gradient-to-b from-[#E6F3FF] via-[#FFF0F5] to-[#FFE5EC] text-gray-900 flex flex-col items-center font-sans p-4 py-8 relative overflow-hidden">
      {/* Back Button */}
      <button
        onClick={onBackHome}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-white/90 hover:bg-white border-3 border-blue-500 backdrop-blur-sm transition-all text-blue-500 hover:text-blue-600 shadow-xl hover:scale-110"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Kawaii Background Decorations */}
      <div className="fixed inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-32 bg-blue-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-40 right-20 w-80 h-40 bg-pink-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-72 h-36 bg-yellow-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '3s' }}></div>
      </div>

      {/* Floating Stars */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <div className="text-xl opacity-50">✨</div>
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {/* City Input Section */}
        <div className="mt-8 mb-6">
          <h2 className="text-center text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t('home.weather.title')} 🌤️
          </h2>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative group">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && executeSearch()}
                placeholder={t('weather.searchPlaceholder')}
                disabled={state.status === 'loading_weather' || state.status === 'generating_image'}
                className="w-full h-16 px-8 rounded-3xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] border-3 border-blue-100 text-gray-800 text-xl font-medium placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-300 transition-all disabled:opacity-50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl pointer-events-none">
                🔍
              </div>
            </div>
          </div>
        </div>

        {/* Super Kawaii Style Selector */}
        <div className="mb-6">
          <h3 className="text-center text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '3s' }}>
            {t('weather.styleSelector.title')} 🎨
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Diorama Style Card */}
            <button
              onClick={() => handleStyleChange('diorama')}
              disabled={state.status === 'loading_weather' || state.status === 'generating_image'}
              className={`group relative rounded-[2.5rem] p-8 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                state.style === 'diorama'
                  ? 'bg-gradient-to-br from-[#BBDEFB] via-[#90CAF9] to-[#64B5F6] shadow-[0_20px_60px_rgba(100,181,246,0.6)] scale-105'
                  : 'bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] shadow-[0_12px_30px_rgba(100,181,246,0.3)] hover:shadow-[0_20px_50px_rgba(100,181,246,0.5)]'
              } border-[5px] border-white/90 ${state.status === 'loading_weather' || state.status === 'generating_image' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Kawaii Glow Effect */}
              <div className={`absolute -inset-3 bg-gradient-to-r from-[#64B5F6] to-[#90CAF9] rounded-[2.5rem] blur-2xl transition-opacity duration-500 ${state.style === 'diorama' ? 'opacity-70' : 'opacity-0 group-hover:opacity-60'}`}></div>

              {/* Floating decoration */}
              <div className={`absolute -top-4 -right-4 text-4xl animate-bounce transition-opacity ${state.style === 'diorama' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ animationDuration: '2s' }}>🏰</div>

              <div className="relative z-10">
                {/* Giant Icon */}
                <div className={`mx-auto w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${state.style === 'diorama' ? 'shadow-[0_20px_40px_rgba(100,181,246,0.5)] scale-110' : 'shadow-[0_12px_24px_rgba(100,181,246,0.3)] group-hover:scale-110 group-hover:rotate-12'}`}>
                  <div className="text-7xl md:text-8xl">🏰</div>
                </div>

                {/* Title */}
                <h4 className={`text-2xl md:text-3xl font-bold mb-3 transition-colors ${state.style === 'diorama' ? 'text-white' : 'text-[#0D47A1] group-hover:text-[#1565C0]'}`}>
                  {t('weather.styleSelector.diorama')}
                </h4>

                {/* Description */}
                <p className={`text-sm md:text-base leading-relaxed font-medium transition-colors ${state.style === 'diorama' ? 'text-white/90' : 'text-[#1565C0] group-hover:text-[#1976D2]'}`}>
                  {t('weather.styleSelector.dioramaDesc')}
                </p>

                {/* Selected Badge */}
                {state.style === 'diorama' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-full text-sm font-bold shadow-lg animate-pulse" style={{ animationDuration: '2s' }}>
                    <span>✓</span>
                    <span>Selected</span>
                  </div>
                )}
              </div>
            </button>

            {/* Cake Style Card */}
            <button
              onClick={() => handleStyleChange('cake')}
              disabled={state.status === 'loading_weather' || state.status === 'generating_image'}
              className={`group relative rounded-[2.5rem] p-8 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                state.style === 'cake'
                  ? 'bg-gradient-to-br from-[#FFD6E8] via-[#FFC1E3] to-[#FFB5E8] shadow-[0_20px_60px_rgba(255,105,180,0.6)] scale-105'
                  : 'bg-gradient-to-br from-[#FFE5F0] via-[#FFD6E8] to-[#FFC1E3] shadow-[0_12px_30px_rgba(255,105,180,0.3)] hover:shadow-[0_20px_50px_rgba(255,105,180,0.5)]'
              } border-[5px] border-white/90 ${state.status === 'loading_weather' || state.status === 'generating_image' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Kawaii Glow Effect */}
              <div className={`absolute -inset-3 bg-gradient-to-r from-[#FFB5E8] to-[#FFC6FF] rounded-[2.5rem] blur-2xl transition-opacity duration-500 ${state.style === 'cake' ? 'opacity-70' : 'opacity-0 group-hover:opacity-60'}`}></div>

              {/* Floating decoration */}
              <div className={`absolute -top-4 -right-4 text-4xl animate-bounce transition-opacity ${state.style === 'cake' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ animationDuration: '2s' }}>🍰</div>

              <div className="relative z-10">
                {/* Giant Icon */}
                <div className={`mx-auto w-32 h-32 md:w-40 md:h-40 bg-white rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${state.style === 'cake' ? 'shadow-[0_20px_40px_rgba(255,105,180,0.5)] scale-110' : 'shadow-[0_12px_24px_rgba(255,105,180,0.3)] group-hover:scale-110 group-hover:rotate-12'}`}>
                  <div className="text-7xl md:text-8xl">🍰</div>
                </div>

                {/* Title */}
                <h4 className={`text-2xl md:text-3xl font-bold mb-3 transition-colors ${state.style === 'cake' ? 'text-white' : 'text-[#D5006D] group-hover:text-[#B8005C]'}`}>
                  {t('weather.styleSelector.cake')}
                </h4>

                {/* Description */}
                <p className={`text-sm md:text-base leading-relaxed font-medium transition-colors ${state.style === 'cake' ? 'text-white/90' : 'text-[#B8005C] group-hover:text-[#A0004D]'}`}>
                  {t('weather.styleSelector.cakeDesc')}
                </p>

                {/* Selected Badge */}
                {state.style === 'cake' && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white text-pink-600 rounded-full text-sm font-bold shadow-lg animate-pulse" style={{ animationDuration: '2s' }}>
                    <span>✓</span>
                    <span>Selected</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Giant Generate Button */}
        <div className="max-w-2xl mx-auto mb-8">
          <button
            onClick={executeSearch}
            disabled={!cityInput.trim() || state.status === 'loading_weather' || state.status === 'generating_image'}
            className={`group relative w-full py-6 px-8 rounded-[2rem] font-bold text-2xl transition-all duration-500 ${
              !cityInput.trim() || state.status === 'loading_weather' || state.status === 'generating_image'
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : state.style === 'diorama'
                ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white shadow-[0_20px_50px_rgba(59,130,246,0.5)] hover:shadow-[0_25px_60px_rgba(59,130,246,0.6)] hover:scale-105 active:scale-95'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-[0_20px_50px_rgba(236,72,153,0.5)] hover:shadow-[0_25px_60px_rgba(236,72,153,0.6)] hover:scale-105 active:scale-95'
            }`}
          >
            {/* Glow Effect */}
            {cityInput.trim() && state.status === 'idle' && (
              <div className={`absolute -inset-2 rounded-[2rem] blur-xl opacity-50 transition-opacity ${
                state.style === 'diorama' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gradient-to-r from-pink-400 to-rose-400'
              }`}></div>
            )}

            <div className="relative z-10 flex items-center justify-center gap-3">
              {state.status === 'loading_weather' && (
                <>
                  <div className="animate-spin text-3xl">⏳</div>
                  <span>{t('weather.loadingWeather')}</span>
                </>
              )}
              {state.status === 'generating_image' && (
                <>
                  <div className="animate-spin text-3xl">🎨</div>
                  <span>{t('weather.generatingImage')}</span>
                </>
              )}
              {state.status !== 'loading_weather' && state.status !== 'generating_image' && (
                <>
                  <span>✨</span>
                  <span>{t('weather.generateButton')}</span>
                  <span>{state.style === 'diorama' ? '🏰' : '🍰'}</span>
                </>
              )}
            </div>
          </button>
        </div>

        <main className="w-full flex flex-col items-center justify-center">
          <WeatherCard
            status={state.status}
            weather={state.weather}
            image={state.image}
            onDownload={handleDownload}
            t={t}
          />

          {state.error && (
            <div className="mt-6 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-medium border border-red-100 max-w-md text-center shadow-lg">
              {state.error}
            </div>
          )}
        </main>

        {/* Footer Info */}
        <footer className="text-center mt-8 text-xs text-gray-400 font-medium">
          Powered by Gemini Pro Vision ✨
        </footer>
      </div>
    </div>
  );
};

export default WeatherApp;
