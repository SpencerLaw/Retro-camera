import { WeatherData, GeneratedImage, WeatherStyle } from '../types';

interface CachedWeatherData {
  weather: WeatherData;
  image: GeneratedImage;
  timestamp: number;
  city: string;
  style: WeatherStyle;
}

const CACHE_PREFIX = 'weather_cache_';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 分钟

/**
 * 获取缓存键
 */
const getCacheKey = (city: string, style: WeatherStyle): string => {
  return `${CACHE_PREFIX}${style}_${city.toLowerCase().trim()}`;
};

/**
 * 检查缓存是否有效
 */
const isCacheValid = (cached: CachedWeatherData): boolean => {
  const now = Date.now();
  const age = now - cached.timestamp;
  return age < CACHE_EXPIRY_MS;
};

/**
 * 获取缓存的天气数据
 */
export const getCachedWeather = (city: string, style: WeatherStyle): { weather: WeatherData; image: GeneratedImage } | null => {
  try {
    const cacheKey = getCacheKey(city, style);
    const cachedStr = localStorage.getItem(cacheKey);

    if (!cachedStr) return null;

    const cached: CachedWeatherData = JSON.parse(cachedStr);

    // 检查缓存是否有效
    if (!isCacheValid(cached)) {
      // 缓存已过期，删除它
      localStorage.removeItem(cacheKey);
      return null;
    }

    // 验证缓存数据完整性和风格匹配
    if (!cached.weather || !cached.image || cached.style !== style) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return {
      weather: cached.weather,
      image: cached.image
    };
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * 保存天气数据到缓存
 */
export const setCachedWeather = (
  city: string,
  weather: WeatherData,
  image: GeneratedImage,
  style: WeatherStyle
): void => {
  try {
    const cacheKey = getCacheKey(city, style);
    const cached: CachedWeatherData = {
      weather,
      image,
      timestamp: Date.now(),
      city: city.toLowerCase().trim(),
      style
    };

    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.error('Error saving cache:', error);
    // 如果存储空间不足，尝试清理旧缓存
    try {
      clearExpiredCache();
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (retryError) {
      console.error('Failed to save cache after cleanup:', retryError);
    }
  }
};

/**
 * 清理过期的缓存
 */
export const clearExpiredCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cachedStr = localStorage.getItem(key);
          if (cachedStr) {
            const cached: CachedWeatherData = JSON.parse(cachedStr);
            if (!isCacheValid(cached)) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // 无效的缓存数据，也删除
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};

/**
 * 清除所有天气缓存
 */
export const clearAllWeatherCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

