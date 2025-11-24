import React, { useState, useEffect } from 'react';
import { Camera } from './Camera';
import { DraggablePhoto } from './DraggablePhoto';
import { Photo } from '../types';
import { Home } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

interface CameraAppProps {
  onBackHome: () => void;
}

export const CameraApp: React.FC<CameraAppProps> = ({ onBackHome }) => {
  const t = useTranslations();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [topZIndex, setTopZIndex] = useState(10);

  // Load from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('retrolens_instant_photos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Limit to last 20 photos to prevent storage overflow
        setPhotos(parsed.slice(-20));
      } catch (e) {
        console.error("Failed to load photos", e);
        // Clear corrupted data
        try {
          localStorage.removeItem('retrolens_instant_photos');
        } catch (clearError) {
          console.error("Failed to clear corrupted data", clearError);
        }
      }
    }
  }, []);

  useEffect(() => {
    try {
      // Limit stored photos to last 20 to prevent localStorage quota exceeded
      const photosToStore = photos.slice(-20);
      localStorage.setItem('retrolens_instant_photos', JSON.stringify(photosToStore));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded. Clearing old photos...');
        // If still too large, keep only last 10 photos
        try {
          const photosToStore = photos.slice(-10);
          localStorage.setItem('retrolens_instant_photos', JSON.stringify(photosToStore));
          setPhotos(photosToStore);
        } catch (e2) {
          console.error('Failed to save photos even after clearing:', e2);
          // Clear all photos if still failing
          localStorage.removeItem('retrolens_instant_photos');
          setPhotos([]);
        }
      } else {
        console.error("Failed to save photos", e);
      }
    }
  }, [photos]);

  const handleCapture = (photo: Photo) => {
    setPhotos(prev => {
      const newPhotos = [...prev, photo];
      // Only limit if we have more than 30 photos to prevent performance issues
      // But always keep the new photo
      return newPhotos.length > 30 ? newPhotos.slice(-30) : newPhotos;
    });
    setTopZIndex(prev => prev + 1);
    
    // Clear isDeveloping after animation completes (6 seconds)
    setTimeout(() => {
      setPhotos(prev => prev.map(p => 
        p.id === photo.id ? { ...p, isDeveloping: false } : p
      ));
    }, 6000);
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, x, y } : p
    ));
  };

  const handleFocus = (id: string) => {
    setTopZIndex(prev => prev + 1);
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (!photo) return prev;
      return [...prev.filter(p => p.id !== id), photo];
    });
  };

  const handleDelete = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="relative w-full h-full overflow-visible">
      {/* Back Home Button */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={onBackHome}
          className="p-2 rounded-full bg-white/80 hover:bg-white border-2 border-[#8b4513] backdrop-blur-sm transition-all text-[#8b4513] hover:text-[#5c4033] flex items-center gap-2 px-4 shadow-lg"
        >
          <Home size={18} />
          <span className="text-sm font-marker">{t('camera.backHome')}</span>
        </button>
      </div>
      
      {/* Drop Zone Hint */}
      {photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <h1 className="font-marker text-6xl text-[#8b4513] rotate-[-5deg]">{t('camera.photoWall')}</h1>
        </div>
      )}

      {/* Photo Wall */}
      {photos.map((photo, index) => (
        <DraggablePhoto 
          key={photo.id}
          photo={photo}
          zIndex={index + 100} // Increased z-index to ensure photos are above camera
          onUpdatePosition={handleUpdatePosition}
          onDelete={handleDelete}
          onFocus={() => handleFocus(photo.id)}
        />
      ))}

      {/* Camera Unit */}
      <Camera onCapture={handleCapture} />
      
      {/* Instructions */}
      <div className="fixed bottom-4 right-4 text-[#8b4513] opacity-60 text-sm font-marker text-right">
        <p>{t('camera.instructions.snap')}</p>
        <p>{t('camera.instructions.drag')}</p>
      </div>
    </div>
  );
};

