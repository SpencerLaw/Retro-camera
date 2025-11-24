import React, { useState, useEffect } from 'react';
import { Camera } from './Camera';
import { DraggablePhoto } from './DraggablePhoto';
import { Photo } from '../types';
import { Home, Trash2 } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

interface CameraAppProps {
  onBackHome: () => void;
}

export const CameraApp: React.FC<CameraAppProps> = ({ onBackHome }) => {
  const t = useTranslations();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [topZIndex, setTopZIndex] = useState(1000); // Start with high z-index

  // Load from localstorage - Only keep last 10 photos, delete all history
  useEffect(() => {
    const saved = localStorage.getItem('retrolens_instant_photos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only keep last 10 photos, delete all history
        const loadedPhotos = Array.isArray(parsed) ? parsed.slice(-10) : [];
        setPhotos(loadedPhotos);
        
        // Immediately clean up localStorage - only keep last 10
        if (Array.isArray(parsed) && parsed.length > 10) {
          localStorage.setItem('retrolens_instant_photos', JSON.stringify(loadedPhotos));
          console.log('🧹 Cleaned up old photos. Kept only last 10 photos.');
        }
        
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
      // Only keep last 10 photos - delete all history
      const photosToStore = photos.slice(-10);
      localStorage.setItem('retrolens_instant_photos', JSON.stringify(photosToStore));
      
      // If we had more than 10 photos, update state to only keep 10
      if (photos.length > 10) {
        setPhotos(photosToStore);
        console.log('🧹 Removed old photos. Now keeping only last 10 photos.');
      }
      
      console.log('💾 Saved photos to localStorage:', photosToStore.length);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage quota exceeded. Clearing all photos...');
        // Clear all photos if quota exceeded
        try {
          localStorage.removeItem('retrolens_instant_photos');
          setPhotos([]);
        } catch (e2) {
          console.error('❌ Failed to clear photos:', e2);
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
      // Only keep last 10 photos - delete oldest ones immediately
      const limited = newPhotos.slice(-10);
      
      if (newPhotos.length > 10) {
        console.log(`🧹 Removed ${newPhotos.length - 10} old photos. Keeping only last 10.`);
      }
      
      console.log('📸 New photos array length:', limited.length);
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

  const handleClearAll = () => {
    if (photos.length === 0) return;
    
    if (window.confirm(t('camera.clearConfirm'))) {
      setPhotos([]);
      try {
        localStorage.removeItem('retrolens_instant_photos');
        console.log('🧹 All photos cleared');
      } catch (e) {
        console.error('❌ Failed to clear photos from localStorage:', e);
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-visible" style={{ position: 'fixed', top: 0, left: 0 }}>
      {/* Back Home Button and Clear All Button */}
      <div className="fixed top-4 left-4 z-[2000] flex gap-2">
        <button 
          onClick={onBackHome}
          className="p-2 rounded-full bg-white/80 hover:bg-white border-2 border-[#8b4513] backdrop-blur-sm transition-all text-[#8b4513] hover:text-[#5c4033] flex items-center gap-2 px-4 shadow-lg"
        >
          <Home size={18} />
          <span className="text-sm font-marker">{t('camera.backHome')}</span>
        </button>
        
        {photos.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 border-2 border-red-600 backdrop-blur-sm transition-all text-white hover:text-white flex items-center gap-2 px-4 shadow-lg"
          >
            <Trash2 size={18} />
            <span className="text-sm font-marker">{t('camera.clearAll')}</span>
          </button>
        )}
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

