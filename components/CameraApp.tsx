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
  const [topZIndex, setTopZIndex] = useState(1000); // Start with high z-index

  // Load from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('retrolens_instant_photos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Limit to last 20 photos to prevent storage overflow
        const loadedPhotos = Array.isArray(parsed) ? parsed.slice(-20) : [];
        setPhotos(loadedPhotos);
        console.log('✅ Loaded photos from localStorage:', loadedPhotos.length);
      } catch (e) {
        console.error("❌ Failed to load photos", e);
        // Clear corrupted data
        try {
          localStorage.removeItem('retrolens_instant_photos');
        } catch (clearError) {
          console.error("❌ Failed to clear corrupted data", clearError);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (photos.length === 0) return;
    
    try {
      // Limit stored photos to last 20 to prevent localStorage quota exceeded
      const photosToStore = photos.slice(-20);
      localStorage.setItem('retrolens_instant_photos', JSON.stringify(photosToStore));
      console.log('💾 Saved photos to localStorage:', photosToStore.length);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage quota exceeded. Clearing old photos...');
        // If still too large, keep only last 10 photos
        try {
          const photosToStore = photos.slice(-10);
          localStorage.setItem('retrolens_instant_photos', JSON.stringify(photosToStore));
          setPhotos(photosToStore);
        } catch (e2) {
          console.error('❌ Failed to save photos even after clearing:', e2);
          // Clear all photos if still failing
          localStorage.removeItem('retrolens_instant_photos');
          setPhotos([]);
        }
      } else {
        console.error("❌ Failed to save photos", e);
      }
    }
  }, [photos]);

  const handleCapture = (photo: Photo) => {
    console.log('📸 handleCapture called with photo:', {
      id: photo.id,
      x: photo.x,
      y: photo.y,
      hasDataUrl: !!photo.dataUrl,
      dataUrlLength: photo.dataUrl?.length
    });
    
    setPhotos(prev => {
      const newPhotos = [...prev, photo];
      // Only limit if we have more than 30 photos to prevent performance issues
      // But always keep the new photo
      const limited = newPhotos.length > 30 ? newPhotos.slice(-30) : newPhotos;
      console.log('📸 New photos array length:', limited.length);
      console.log('📸 All photo positions:', limited.map(p => ({ id: p.id, x: p.x, y: p.y })));
      return limited;
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
    <div className="relative w-screen h-screen overflow-visible" style={{ position: 'fixed', top: 0, left: 0 }}>
      {/* Back Home Button */}
      <div className="fixed top-4 left-4 z-[2000]">
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 z-10">
           <h1 className="font-marker text-6xl text-[#8b4513] rotate-[-5deg]">{t('camera.photoWall')}</h1>
        </div>
      )}

      {/* Photo Wall - All photos rendered here with high z-index */}
      {photos.map((photo, index) => {
        const photoZIndex = topZIndex + index;
        console.log(`🖼️ Rendering photo ${photo.id} at position (${photo.x}, ${photo.y}) with zIndex ${photoZIndex}`);
        return (
          <DraggablePhoto 
            key={photo.id}
            photo={photo}
            zIndex={photoZIndex}
            onUpdatePosition={handleUpdatePosition}
            onDelete={handleDelete}
            onFocus={() => handleFocus(photo.id)}
          />
        );
      })}

      {/* Camera Unit - Fixed at bottom left with lower z-index */}
      <Camera onCapture={handleCapture} />
      
      {/* Instructions */}
      <div className="fixed bottom-4 right-4 text-[#8b4513] opacity-60 text-sm font-marker text-right z-[1500]">
        <p>{t('camera.instructions.snap')}</p>
        <p>{t('camera.instructions.drag')}</p>
      </div>
    </div>
  );
};

