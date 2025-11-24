import React, { useState, useEffect } from 'react';
import { Camera } from './Camera';
import { DraggablePhoto } from './DraggablePhoto';
import { Photo } from '../types';
import { Home } from 'lucide-react';

interface CameraAppProps {
  onBackHome: () => void;
}

export const CameraApp: React.FC<CameraAppProps> = ({ onBackHome }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [topZIndex, setTopZIndex] = useState(10);

  // Load from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('retrolens_instant_photos');
    if (saved) {
      try {
        setPhotos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load photos", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('retrolens_instant_photos', JSON.stringify(photos));
  }, [photos]);

  const handleCapture = (photo: Photo) => {
    setPhotos(prev => [...prev, photo]);
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
    <div className="relative w-full h-full overflow-hidden">
      {/* Back Home Button */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={onBackHome}
          className="p-2 rounded-full bg-white/80 hover:bg-white border-2 border-[#8b4513] backdrop-blur-sm transition-all text-[#8b4513] hover:text-[#5c4033] flex items-center gap-2 px-4 shadow-lg"
        >
          <Home size={18} />
          <span className="text-sm font-marker">返回首頁</span>
        </button>
      </div>
      
      {/* Drop Zone Hint */}
      {photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
           <h1 className="font-marker text-6xl text-[#8b4513] rotate-[-5deg]">My Photo Wall</h1>
        </div>
      )}

      {/* Photo Wall */}
      {photos.map((photo, index) => (
        <DraggablePhoto 
          key={photo.id}
          photo={photo}
          zIndex={index + 10}
          onUpdatePosition={handleUpdatePosition}
          onDelete={handleDelete}
          onFocus={() => handleFocus(photo.id)}
        />
      ))}

      {/* Camera Unit */}
      <Camera onCapture={handleCapture} />
      
      {/* Instructions */}
      <div className="fixed bottom-4 right-4 text-[#8b4513] opacity-60 text-sm font-marker text-right">
        <p>Click Red Button to Snap</p>
        <p>Drag photos to arrange</p>
      </div>
    </div>
  );
};

