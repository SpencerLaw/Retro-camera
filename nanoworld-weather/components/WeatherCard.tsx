import React from 'react';
import { Download } from 'lucide-react';
import { WeatherData, GeneratedImage } from '../types';
import { CloudIcon } from './Icons';

interface WeatherCardProps {
  status: 'idle' | 'loading_weather' | 'generating_image' | 'success' | 'error';
  weather: WeatherData | null;
  image: GeneratedImage | null;
  onDownload: () => void;
  t: (key: string) => string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ status, weather, image, onDownload, t }) => {

  const isLoading = status === 'loading_weather' || status === 'generating_image';

  const loadingText = status === 'loading_weather'
    ? t('weather.loadingWeather')
    : t('weather.generatingImage');

  const canDownload = status === 'success' && image;

  return (
    <div className="w-full max-w-4xl bg-white rounded-[64px] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] p-10 flex flex-col items-center text-center transition-all duration-500 ease-out transform hover:shadow-[0_35px_90px_-15px_rgba(0,0,0,0.18)]">

      <div className="w-full aspect-square relative rounded-[48px] overflow-hidden bg-gray-50 mb-8 group">

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50">
             <div className="relative">
                <CloudIcon className="w-40 h-40 text-blue-200 animate-pulse" />
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-200 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2s' }}></div>
             </div>
             <p className="mt-8 text-gray-400 font-medium text-2xl animate-pulse">{loadingText}</p>
          </div>
        )}

        {status === 'success' && image && (
          <img
            src={image.url}
            alt={image.alt}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        )}

        {status === 'idle' && (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-xl">{t('weather.searchPlaceholder')}</span>
          </div>
        )}
      </div>

      <div className="w-full px-4 flex flex-col items-center">
        {weather ? (
            <>
                <h2 className="text-5xl font-bold text-gray-800 tracking-tight mb-4">
                {weather.city}, {weather.country}
                </h2>
                <div className="flex items-center justify-center space-x-4 text-gray-500 font-medium text-2xl">
                    <span>{Math.round(weather.temperature)}°C</span>
                    <span>•</span>
                    <span className="capitalize">{weather.condition}</span>
                </div>
            </>
        ) : (
            <>
                <div className={"h-14 w-96 bg-gray-100 rounded-lg mb-6 " + (isLoading ? 'shimmer' : '')}></div>
                <div className={"h-10 w-64 bg-gray-100 rounded-lg " + (isLoading ? 'shimmer' : '')}></div>
            </>
        )}
      </div>

      {canDownload && (
        <button
          onClick={onDownload}
          className="mt-8 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 transform hover:scale-105"
        >
          <Download size={24} />
          {t('weather.download')}
        </button>
      )}
    </div>
  );
};

export default WeatherCard;
