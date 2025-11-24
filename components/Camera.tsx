import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useCamera } from '../hooks/useCamera';
import { Photo } from '../types';
import { FILTERS } from '../constants';

interface CameraProps {
  onCapture: (photo: Photo) => void;
}

export const Camera: React.FC<CameraProps> = ({ onCapture }) => {
  const { videoRef, isLoading, startCamera } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEjecting, setIsEjecting] = useState(false);
  const [filterIndex, setFilterIndex] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  
  const activeFilter = useMemo(() => FILTERS[filterIndex], [filterIndex]);

  // Initialize camera once mounted
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const cycleFilter = () => {
    // Play click sound
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);

    setFilterIndex((prev) => (prev + 1) % FILTERS.length);
  };

  const takePhoto = () => {
    if (isEjecting || !videoRef.current || !canvasRef.current) return;

    setIsEjecting(true);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 250); // Slightly longer flash
    
    // Play shutter sound
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // High pitch shutter
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);

    // Capture frame
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // USE FULL RESOLUTION
      // Get the actual video dimensions
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      
      // Determine the square crop size based on the smallest dimension
      const size = Math.min(videoW, videoH);
      
      // Set canvas to full resolution size
      canvas.width = size;
      canvas.height = size;
      
      const startX = (videoW - size) / 2;
      const startY = (videoH - size) / 2;
      
      // Apply Filter to Context
      ctx.filter = activeFilter.css;

      // Mirror image
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      
      // Draw high quality image
      ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
      
      // Reset filter
      ctx.filter = 'none';

      // Export with Maximum Quality (1.0) - No Compression
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      
      // Wait for ejection animation to finish before "releasing" the photo to the wall
      setTimeout(() => {
        // Calculate safe initial position - ensure photo is always visible
        const viewportHeight = window.innerHeight;
        const photoHeight = 300; // Approximate photo height
        const safeY = Math.max(50, Math.min(viewportHeight - photoHeight - 100, viewportHeight - 500));
        const photo: Photo = {
          id: Date.now().toString(),
          dataUrl: dataUrl,
          timestamp: Date.now(),
          x: Math.max(20, Math.min(window.innerWidth - 250, 60)), // Ensure photo is within viewport
          y: safeY,
          rotation: (Math.random() - 0.5) * 15,
          isDeveloping: true
        };
        onCapture(photo);
        setIsEjecting(false);
        
        // Play mechanical motor sound
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc2.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.5);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
        
      }, 1000); // 1s ejection time
    }
  };

  return (
    <>
      {/* Full Screen Flash Effect */}
      <div className={`fixed inset-0 bg-white z-[100] pointer-events-none transition-opacity duration-300 ease-out ${flashActive ? 'opacity-100' : 'opacity-0'}`}></div>

      <div className="fixed bottom-6 left-6 z-50 select-none">
        
        {/* The Ejecting Photo (Behind the front face, in front of back body) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[220px] bg-white transition-transform duration-1000 ease-out shadow-md flex flex-col p-2 z-0"
             style={{ 
               transform: isEjecting ? 'translateY(-200px)' : 'translateY(20px)',
               opacity: isEjecting ? 1 : 0 
             }}>
            <div className="w-full aspect-square bg-[#222] mb-8"></div> 
        </div>

        {/* Camera Body */}
        <div className="relative w-[300px] h-[260px] bg-[#f4f1ea] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center z-10 plastic-texture border-b-8 border-r-8 border-[#dcd8cf]">
          
          {/* Top Slot */}
          <div className="absolute -top-1 w-[220px] h-2 bg-[#1a1a1a] rounded-full"></div>

          {/* Rainbow Stripe */}
          <div className="w-full h-12 mt-8 rainbow-stripe relative shadow-inner"></div>

          {/* Sticker 1 */}
          <div className="absolute top-3 left-4 w-12 h-12 bg-yellow-400 rounded-full rotate-[-15deg] flex items-center justify-center shadow-md border-2 border-white z-20 hover:scale-110 transition-transform cursor-pointer">
             <span className="font-marker text-xs text-purple-700 font-bold">COOL!</span>
          </div>

          {/* Sticker 2 */}
          <div className="absolute top-24 right-2 w-10 h-10 bg-pink-400 rounded-lg rotate-[10deg] flex items-center justify-center shadow-md border border-white z-20 hover:scale-110 transition-transform cursor-pointer">
             <span className="text-lg">✨</span>
          </div>

          {/* Viewfinder Housing */}
          <div className="absolute top-6 w-[180px] h-[180px] bg-[#111] rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center justify-center border-4 border-[#333]">
              
              {/* Lens Glass Effect */}
              <div className="w-[160px] h-[160px] rounded-full overflow-hidden relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ filter: activeFilter.css }}
                  className="w-full h-full object-cover transform scale-x-[-1] transition-all duration-300"
                />
                {/* Lens Glare */}
                <div className="absolute top-4 right-4 w-8 h-4 bg-white/20 blur-md rounded-full rotate-45 pointer-events-none"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 bg-blue-500/10 blur-xl rounded-full pointer-events-none"></div>
              </div>

              {!videoRef.current && isLoading && (
                <div className="absolute text-white/50 font-mono text-xs animate-pulse">WARMING UP</div>
              )}
          </div>

          {/* Shutter Button */}
          <button 
            onClick={takePhoto}
            disabled={isEjecting || isLoading}
            className="absolute bottom-6 right-6 w-16 h-16 bg-[#ff3333] rounded-full shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),0_4px_0_#cc0000] active:translate-y-1 active:shadow-none transition-all border-4 border-[#dcd8cf] z-20 flex items-center justify-center hover:brightness-110"
          >
             <div className="w-12 h-12 rounded-full border border-white/20"></div>
          </button>

          {/* Flash / Sensor Area */}
          <div className="absolute top-8 left-6 w-8 h-8 bg-[#222] rounded shadow-inner border border-gray-600 overflow-hidden">
             <div className="w-full h-full bg-[radial-gradient(white,transparent)] opacity-50 animate-pulse"></div>
          </div>
          
          {/* LCD Display for Filters */}
          <div className="absolute bottom-10 left-6 flex flex-col items-center gap-1">
             <div className="w-16 h-8 bg-[#222] rounded border-2 border-gray-400 flex items-center justify-center shadow-inner overflow-hidden relative">
                {/* Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>
                {/* Text */}
                <span className="font-mono text-[#00ff00] text-lg font-bold drop-shadow-[0_0_4px_rgba(0,255,0,0.8)]">
                  {activeFilter.name}
                </span>
             </div>
             
             <button 
               onClick={cycleFilter}
               className="w-16 h-6 bg-gray-300 rounded border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition-all text-[10px] font-bold text-gray-600 tracking-wider shadow-sm hover:bg-gray-200"
             >
               MODE
             </button>
          </div>

          <div className="absolute bottom-4 left-8 text-gray-400 font-bold text-xs font-mono tracking-widest opacity-50">
            INSTANT 2000
          </div>

        </div>
        
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  );
};