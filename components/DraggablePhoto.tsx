import React, { useState, useRef } from 'react';
import { Photo } from '../types';
import { X, Download } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';

interface DraggablePhotoProps {
  photo: Photo;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  zIndex: number;
  onFocus: () => void;
}

export const DraggablePhoto: React.FC<DraggablePhotoProps> = ({ 
  photo, 
  onUpdatePosition, 
  onDelete,
  zIndex,
  onFocus
}) => {
  const t = useTranslations();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const photoRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus();
    setIsDragging(true);
    
    const rect = photoRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    } else {
      setDragOffset({
        x: e.clientX - photo.x,
        y: e.clientY - photo.y
      });
    }
    
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Ensure photo stays within viewport bounds
    const photoWidth = 220;
    const photoHeight = 300;
    const safeX = Math.max(0, Math.min(window.innerWidth - photoWidth, newX));
    const safeY = Math.max(0, Math.min(window.innerHeight - photoHeight, newY));
    
    onUpdatePosition(photo.id, safeX, safeY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `instant-photo-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      ref={photoRef}
      className="fixed touch-none select-none transition-transform duration-200 ease-out"
      style={{ 
        left: `${photo.x}px`, 
        top: `${photo.y}px`, 
        transform: `rotate(${photo.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
        zIndex: zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'auto'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="bg-white p-3 pb-12 shadow-lg w-[220px] flex flex-col relative group transition-shadow duration-300 hover:shadow-2xl">
        
        {/* Image Area */}
        <div className="w-full aspect-square bg-[#1a1a1a] overflow-hidden relative border border-gray-100">
           <img 
              src={photo.dataUrl} 
              className={`w-full h-full object-cover pointer-events-none ${photo.isDeveloping ? 'developing-photo' : ''}`}
              alt="Instant Photo"
           />
           {/* Glossy Overlay */}
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20 pointer-events-none"></div>
        </div>

        {/* Handwriting / Delete Button */}
        <div className="absolute bottom-2 left-0 right-0 text-center">
           <span className="font-marker text-gray-600 text-sm opacity-80 pointer-events-none">
              {new Date(photo.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
           </span>
        </div>

        {/* Action Buttons (Visible on hover) */}
        <div className="absolute -top-3 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
          
          {/* Download Button */}
          <button 
            onClick={handleDownload}
            title={t('camera.download')}
            className="bg-blue-500 text-white rounded-full p-2 shadow-md hover:bg-blue-600 transform hover:scale-110 transition-all"
          >
            <Download size={14} />
          </button>

          {/* Delete Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
            title={t('camera.delete')}
            className="bg-red-500 text-white rounded-full p-2 shadow-md hover:bg-red-600 transform hover:scale-110 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};