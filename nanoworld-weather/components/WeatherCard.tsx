import React from 'react';
import { WeatherData, GeneratedImage } from '../types';
import { CloudIcon } from './Icons';

interface WeatherCardProps {
  status: 'idle' | 'loading_weather' | 'generating_image' | 'success' | 'error';
  weather: WeatherData | null;
  image: GeneratedImage | null;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ status, weather, image }) => {
  
  const isLoading = status === 'loading_weather' || status === 'generating_image';
  
  // Loading Text logic
  const loadingText = status === 'loading_weather' 
    ? "Checking the forecast..." 
    : "Crafting miniature world...";

  return (
    <div className="w-full max-w-[420px] bg-white rounded-[48px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] p-6 flex flex-col items-center text-center transition-all duration-500 ease-out transform hover:shadow-[0_25px_70px_-10px_rgba(0,0,0,0.12)]">
      
      {/* Image Container */}
      <div className="w-full aspect-square relative rounded-[32px] overflow-hidden bg-gray-50 mb-6 group">
        
        {/* State: Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50">
             <div className="relative">
                <CloudIcon className="w-24 h-24 text-blue-200 animate-pulse" />
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-200 rounded-full opacity-60 animate-bounce" style={{ animationDuration: '2s' }}></div>
             </div>
             <p className="mt-4 text-gray-400 font-medium animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* State: Success Image */}
        {status === 'success' && image && (
          <img 
            src={image.url} 
            alt={image.alt} 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        )}

        {/* State: Initial/Fallback */}
        {status === 'idle' && (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <span className="text-sm">Search to create a world</span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="w-full px-2 flex flex-col items-center">
        {weather ? (
            <>
                <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                {weather.city}, {weather.country}
                </h2>
                <div className="mt-2 flex items-center justify-center space-x-2 text-gray-500 font-medium text-base">
                    <span>{Math.round(weather.temperature)}°C</span>
                    <span>•</span>
                    <span className="capitalize">{weather.condition}</span>
                </div>
                <p className="mt-4 text-gray-400 text-sm italic font-medium leading-relaxed max-w-[80%]">
                    "{weather.description}"
                </p>
            </>
        ) : (
            <>
                <div className={`h-8 w-48 bg-gray-100 rounded-lg mb-3 ${isLoading ? 'shimmer' : ''}`}></div>
                <div className={`h-5 w-32 bg-gray-100 rounded-lg mb-5 ${isLoading ? 'shimmer' : ''}`}></div>
                <div className={`h-4 w-56 bg-gray-100 rounded-lg ${isLoading ? 'shimmer' : ''}`}></div>
            </>
        )}
      </div>
    </div>
  );
};

export default WeatherCard;