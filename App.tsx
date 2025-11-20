import React, { useState, useEffect } from 'react';
import { Camera } from './components/Camera';
import { DraggablePhoto } from './components/DraggablePhoto';
import { Photo } from './types';

const App: React.FC = () => {
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
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, x, y } : p
    ));
  };

  const handleFocus = (id: string) => {
    setTopZIndex(prev => prev + 1);
    // Note: We don't strictly need to update the photo object's z-index here 
    // if we pass the new topZIndex to the component, but updating state is cleaner 
    // if we want persistence. For now, we just handle visual stacking order via prop 
    // or simple reordering if needed.
    // Actually, moving it to the end of array is a simple way to handle z-index in React lists
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
          zIndex={index + 10} // Basic z-index based on array order
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

export default App;