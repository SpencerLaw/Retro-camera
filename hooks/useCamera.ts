import { useState, useEffect, useCallback, useRef } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  // We need a state to force re-renders when stream changes, even if we use ref for logic
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
      setActiveStreamId(null);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Stop existing stream before starting new one
    if (streamRef.current) {
      stopCamera();
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      streamRef.current = mediaStream;
      setActiveStreamId(mediaStream.id);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Explicitly play to ensure it starts on mobile
        try {
            await videoRef.current.play();
        } catch (e) {
            console.warn("Autoplay prevented:", e);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Check permissions.");
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Initial start and restart on facing mode change
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Ensure video element gets stream if ref attaches after stream is ready
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [activeStreamId]);

  return { 
    videoRef, 
    stream: streamRef.current, 
    error, 
    isLoading, 
    startCamera, 
    switchCamera 
  };
};