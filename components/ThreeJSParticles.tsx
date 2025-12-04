import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import * as THREE from 'three';

// Preset colors with gradient themes
const PRESET_COLORS = [
  { color: '#00f5ff', name: 'Neon Cyan', gradient: 'linear-gradient(135deg, #00f5ff 0%, #0080ff 100%)' },
  { color: '#ff0080', name: 'Neon Pink', gradient: 'linear-gradient(135deg, #ff0080 0%, #ff6b9d 100%)' },
  { color: '#00ff88', name: 'Neon Green', gradient: 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)' },
  { color: '#ffd700', name: 'Golden', gradient: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)' },
  { color: '#b388ff', name: 'Cosmic Purple', gradient: 'linear-gradient(135deg, #b388ff 0%, #7c4dff 100%)' },
  { color: '#ff69b4', name: 'Hot Pink', gradient: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 100%)' },
  { color: '#ff6b35', name: 'Cyber Orange', gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' },
  { color: '#42a5f5', name: 'Sky Blue', gradient: 'linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%)' }
];

const ThreeJSParticles: React.FC = () => {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentShape, setCurrentShape] = useState('heart');
  const [currentColor, setCurrentColor] = useState('#00f5ff');
  const [statusText, setStatusText] = useState(t('particles.waitingForCamera'));
  const [statusColor, setStatusColor] = useState('red');
  const sceneRef = useRef<any>(null);

  // Generate star positions once and memoize them to prevent jumping
  const starsData = useMemo(() => {
    const brightStars = Array.from({ length: 50 }, () => ({
      size: Math.random() * 3 + 1.5,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    }));

    const mediumStars = Array.from({ length: 150 }, () => ({
      size: Math.random() * 1.5 + 0.5,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: Math.random() * 4 + 3,
    }));

    const smallStars = Array.from({ length: 200 }, () => ({
      size: Math.random() * 0.8 + 0.2,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: Math.random() * 5 + 4,
      opacity: Math.random() * 0.4 + 0.2,
    }));

    return { brightStars, mediumStars, smallStars };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuration
    const PARTICLE_COUNT = 15000;
    const PARTICLE_SIZE = 0.15;
    const CAMERA_Z_BASE = 30;

    // State
    const state = {
      currentShape: 'heart',
      targetColor: new THREE.Color(0x00f5ff),
      currentColor: new THREE.Color(0x00f5ff),
      handDistance: 0,
      pinchStrength: 0,
      handsDetected: 0,
      expansion: 1.0,
      rotationSpeed: 0.001
    };

    // Three.js Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = CAMERA_Z_BASE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // 透明背景，让星空透过
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Particle System
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize with random positions
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 50;
      targetPositions[i] = positions[i];
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: state.currentColor,
      size: PARTICLE_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Shape Generators
    const Shapes: any = {
      heart: (i: number) => {
        const t = Math.random() * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const z = (Math.random() - 0.5) * 5;
        return [x * 0.5, y * 0.5, z];
      },
      flower: (i: number) => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 5 * Math.sin(4 * theta) + 8;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi) * 0.5;
        return [x, y, z];
      },
      saturn: (i: number) => {
        const isRing = Math.random() > 0.4;
        if (isRing) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 12 + Math.random() * 6;
          return [Math.cos(angle) * radius, (Math.random() - 0.5), Math.sin(angle) * radius];
        } else {
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 8;
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta);
          const z = r * Math.cos(phi);
          return [x, y, z];
        }
      },
      buddha: (i: number) => {
        const section = Math.random();
        if (section < 0.15) {
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          const r = 2.5;
          return [r * Math.sin(phi) * Math.cos(theta), 6 + r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
        } else if (section < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const h = (Math.random() - 0.5) * 8;
          const w = 4.5 * (1 - Math.abs(h) / 5);
          return [Math.cos(angle) * w, h + 1, Math.sin(angle) * w];
        } else {
          const u = Math.random() * Math.PI * 2;
          const v = Math.random() * Math.PI * 2;
          const R = 5;
          const r = 2.5;
          const x = (R + r * Math.cos(v)) * Math.cos(u);
          const y = -4 + r * Math.sin(v) * 0.5;
          const z = (R + r * Math.cos(v)) * Math.sin(u);
          return [x, y, z];
        }
      },
      fireworks: (i: number) => {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = Math.random() * 25;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        return [x, y, z];
      },
      christmasTree: (i: number) => {
        const section = Math.random();
        if (section < 0.05) {
          const starAngle = Math.random() * Math.PI * 2;
          const starDist = Math.random() * 1.5;
          return [
            Math.cos(starAngle) * starDist,
            14 + Math.sin(starAngle * 5) * 0.5,
            Math.sin(starAngle) * starDist
          ];
        } else if (section < 0.80) {
          const layerIndex = Math.floor(Math.random() * 5);
          const layerHeight = 12 - layerIndex * 2.5;
          const maxRadius = 1.5 + layerIndex * 1.2;
          const angle = Math.random() * Math.PI * 2;
          const radiusRatio = Math.pow(Math.random(), 0.7);
          const radius = radiusRatio * maxRadius;
          const yVariation = (Math.random() - 0.5) * 1.8;
          return [
            Math.cos(angle) * radius,
            layerHeight + yVariation,
            Math.sin(angle) * radius
          ];
        } else if (section < 0.95) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 1.2;
          const height = -2 + Math.random() * 3;
          return [
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
          ];
        } else {
          const ornamentLayer = Math.floor(Math.random() * 4) + 1;
          const ornamentHeight = 11 - ornamentLayer * 2.5;
          const ornamentRadius = 1.8 + ornamentLayer * 1.0;
          const angle = (Math.random() * Math.PI * 2);
          return [
            Math.cos(angle) * ornamentRadius,
            ornamentHeight,
            Math.sin(angle) * ornamentRadius
          ];
        }
      }
    };

    const generateShape = (shapeName: string) => {
      const generator = Shapes[shapeName] || Shapes.heart;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const [x, y, z] = generator(i);
        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
      }
    };

    generateShape('heart');

    // MediaPipe Hands Setup
    const setupMediaPipe = async () => {
      try {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // @ts-ignore
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: any) => {
          state.handsDetected = 0;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            state.handsDetected = results.multiHandLandmarks.length;
            setStatusColor('green');
            setStatusText(t('particles.handsTracking').replace('{count}', state.handsDetected.toString()));

            if (results.multiHandLandmarks.length === 2) {
              const hand1 = results.multiHandLandmarks[0][0];
              const hand2 = results.multiHandLandmarks[1][0];
              const dx = hand1.x - hand2.x;
              const dy = hand1.y - hand2.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              state.handDistance = distance;
              const targetExp = Math.max(0.5, Math.min(3.5, distance * 4));
              state.expansion += (targetExp - state.expansion) * 0.3;
            } else if (results.multiHandLandmarks.length === 1) {
              const hand = results.multiHandLandmarks[0];
              const thumb = hand[4];
              const index = hand[8];
              const dist = Math.sqrt(
                Math.pow(thumb.x - index.x, 2) +
                Math.pow(thumb.y - index.y, 2)
              );
              state.pinchStrength = dist;
              const targetExp = 0.8 + (dist * 5);
              state.expansion += (targetExp - state.expansion) * 0.3;
            }
          } else {
            setStatusColor('yellow');
            setStatusText(t('particles.lookingForHands'));
            state.expansion += (1.0 - state.expansion) * 0.15;
          }
        });

        // @ts-ignore
        const cameraUtils = new window.Camera(videoElement, {
          onFrame: async () => {
            await hands.send({ image: videoElement });
          },
          width: 640,
          height: 480
        });

        cameraUtils.start().catch((e: any) => {
          console.error('Camera failed', e);
          setStatusText(t('particles.cameraError'));
        });
      } catch (error) {
        console.error('MediaPipe setup failed', error);
      }
    };

    setupMediaPipe();

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      state.currentColor.lerp(state.targetColor, 0.15);
      material.color = state.currentColor;

      particles.rotation.y += state.rotationSpeed + (state.expansion * 0.001);

      let expansionFactor = state.expansion;
      if (state.currentShape === 'fireworks') {
        expansionFactor *= (1 + Math.sin(time * 2) * 0.3);
      } else if (state.currentShape === 'heart') {
        expansionFactor *= (1 + Math.sin(time * 8) * 0.05 * (1 - Math.min(1, state.pinchStrength * 2)));
      } else if (state.currentShape === 'christmasTree') {
        expansionFactor *= (1 + Math.sin(time * 1.5) * 0.08);
      }

      const posAttribute = geometry.attributes.position;
      const currentPositions = posAttribute.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        let tx = targetPositions[ix];
        let ty = targetPositions[iy];
        let tz = targetPositions[iz];

        tx *= expansionFactor;
        ty *= expansionFactor;
        tz *= expansionFactor;

        tx += Math.sin(time + i) * 0.05;
        ty += Math.cos(time + i * 0.5) * 0.05;

        currentPositions[ix] += (tx - currentPositions[ix]) * 0.25;
        currentPositions[iy] += (ty - currentPositions[iy]) * 0.25;
        currentPositions[iz] += (tz - currentPositions[iz]) * 0.25;
      }
      posAttribute.needsUpdate = true;

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    sceneRef.current = {
      generateShape: (shapeName: string) => {
        state.currentShape = shapeName;
        generateShape(shapeName);
      },
      setColor: (color: string) => {
        state.targetColor.set(color);
      }
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const handleShapeChange = (shape: string) => {
    setCurrentShape(shape);
    if (sceneRef.current) {
      sceneRef.current.generateShape(shape);
    }
  };

  const handleColorClick = (color: string) => {
    setCurrentColor(color);
    if (sceneRef.current) {
      sceneRef.current.setColor(color);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div style={{
      margin: 0,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1e 50%, #000000 100%)',
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      {/* Deep Space Background Layers */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(138, 43, 226, 0.25) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(30, 144, 255, 0.2) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(75, 0, 130, 0.15) 0%, transparent 70%),
          radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1e 40%, #000000 100%)
        `
      }} />
      
      {/* Animated Stars Background - Enhanced */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        {/* Large bright stars */}
        {starsData.brightStars.map((star, i) => (
          <div
            key={`bright-${i}`}
            style={{
              position: 'absolute',
              width: star.size + 'px',
              height: star.size + 'px',
              background: `radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)`,
              borderRadius: '50%',
              top: star.top + '%',
              left: star.left + '%',
              boxShadow: `0 0 ${star.size * 3}px rgba(255, 255, 255, 0.9), 0 0 ${star.size * 6}px rgba(255, 255, 255, 0.5)`,
              animation: `twinkle ${star.duration}s ${star.delay}s infinite ease-in-out`,
              willChange: 'opacity, transform',
            }}
          />
        ))}
        
        {/* Medium stars */}
        {starsData.mediumStars.map((star, i) => (
          <div
            key={`medium-${i}`}
            style={{
              position: 'absolute',
              width: star.size + 'px',
              height: star.size + 'px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '50%',
              top: star.top + '%',
              left: star.left + '%',
              boxShadow: `0 0 ${star.size * 4}px rgba(255, 255, 255, 0.7)`,
              animation: `twinkle ${star.duration}s ${star.delay}s infinite ease-in-out`,
              willChange: 'opacity',
            }}
          />
        ))}
        
        {/* Small distant stars */}
        {starsData.smallStars.map((star, i) => (
          <div
            key={`small-${i}`}
            style={{
              position: 'absolute',
              width: star.size + 'px',
              height: star.size + 'px',
              backgroundColor: `rgba(255, 255, 255, ${star.opacity})`,
              borderRadius: '50%',
              top: star.top + '%',
              left: star.left + '%',
              animation: `twinkle ${star.duration}s ${star.delay}s infinite ease-in-out`,
              willChange: 'opacity',
            }}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes twinkle {
            0%, 100% { 
              opacity: 0.3; 
              transform: scale(1);
            }
            25% {
              opacity: 0.8;
              transform: scale(1.1);
            }
            50% { 
              opacity: 1; 
              transform: scale(1.2);
            }
            75% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px currentColor, 0 0 10px currentColor; }
            50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
          }
          @keyframes borderGlow {
            0%, 100% { border-color: rgba(66, 165, 245, 0.3); }
            50% { border-color: rgba(66, 165, 245, 0.8); }
          }
        `}
      </style>

      {/* Video Element for MediaPipe (Hidden) */}
      <video
        ref={videoRef}
        style={{ transform: 'scaleX(-1)', display: 'none' }}
      />

      {/* Three.js Container */}
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }} />

      {/* Main UI Container */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
        {/* Header / Status */}
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Back Home Button */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(124, 77, 255, 0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 245, 255, 0.3)',
              borderRadius: '3rem',
              color: '#00f5ff',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0, 245, 255, 0.2)',
              animation: 'borderGlow 3s infinite ease-in-out',
              width: 'fit-content'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(124, 77, 255, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 245, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(124, 77, 255, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 245, 255, 0.2)';
            }}
          >
            <Home size={20} />
            {t('home.backHome')}
          </Link>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.2rem',
            color: '#a0aec0',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '2rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div
              style={{
                width: '0.6rem',
                height: '0.6rem',
                borderRadius: '50%',
                backgroundColor: statusColor === 'red' ? '#EF4444' : statusColor === 'green' ? '#10B981' : '#FBBF24',
                boxShadow: `0 0 10px ${statusColor === 'red' ? '#EF4444' : statusColor === 'green' ? '#10B981' : '#FBBF24'}`,
                animation: 'glow 1.5s infinite ease-in-out'
              }}
            />
            <span style={{ fontWeight: '500' }}>{statusText}</span>
          </div>
        </div>

        {/* Control Panel - Futuristic Design */}
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            width: '32rem',
            maxHeight: 'calc(100vh - 3rem)',
            overflowY: 'auto',
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(30, 30, 60, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid transparent',
            backgroundImage: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(30, 30, 60, 0.85) 100%), linear-gradient(135deg, #00f5ff, #7c4dff, #ff0080)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            pointerEvents: 'auto',
            zIndex: 200,
            boxShadow: '0 8px 32px rgba(0, 245, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <h2 style={{
            color: 'transparent',
            background: 'linear-gradient(90deg, #00f5ff 0%, #7c4dff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '1rem',
            fontWeight: '800',
            letterSpacing: '0.15em',
            marginBottom: '1.5rem',
            borderBottom: '2px solid rgba(0, 245, 255, 0.3)',
            paddingBottom: '0.75rem',
            textTransform: 'uppercase'
          }}>
            ⚡ {t('particles.controls')}
          </h2>

          {/* Shape Selection - Redesigned */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              color: '#a0aec0',
              fontSize: '0.75rem',
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              🌀 {t('particles.shapeMode')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { shape: 'heart', emoji: '❤️' },
                { shape: 'flower', emoji: '🌸' },
                { shape: 'saturn', emoji: '🪐' },
                { shape: 'buddha', emoji: '🧘' }
              ].map(({ shape, emoji }) => (
                <button
                  key={shape}
                  onClick={() => handleShapeChange(shape)}
                  style={{
                    background: currentShape === shape
                      ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)'
                      : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: currentShape === shape
                      ? '2px solid rgba(59, 130, 246, 0.8)'
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: currentShape === shape
                      ? '0 4px 15px rgba(37, 99, 235, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transform: currentShape === shape ? 'translateY(-2px)' : 'translateY(0)',
                    position: 'relative',
                    zIndex: 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentShape !== shape) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentShape !== shape) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }
                  }}
                >
                  {emoji} {t(`particles.shapes.${shape}`)}
                </button>
              ))}
              <button
                onClick={() => handleShapeChange('fireworks')}
                style={{
                  background: currentShape === 'fireworks'
                    ? 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: currentShape === 'fireworks'
                    ? '2px solid rgba(139, 92, 246, 0.8)'
                    : '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: currentShape === 'fireworks'
                    ? '0 4px 15px rgba(124, 58, 237, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  transform: currentShape === 'fireworks' ? 'translateY(-2px)' : 'translateY(0)',
                  position: 'relative',
                  zIndex: 1
                }}
                onMouseEnter={(e) => {
                  if (currentShape !== 'fireworks') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentShape !== 'fireworks') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }
                }}
              >
                🎆 {t('particles.shapes.fireworks')}
              </button>
              <button
                onClick={() => handleShapeChange('christmasTree')}
                style={{
                  gridColumn: 'span 2',
                  background: currentShape === 'christmasTree'
                    ? 'linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: currentShape === 'christmasTree'
                    ? '2px solid rgba(52, 211, 153, 0.8)'
                    : '1px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: currentShape === 'christmasTree'
                    ? '0 4px 15px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  transform: currentShape === 'christmasTree' ? 'translateY(-2px)' : 'translateY(0)',
                  position: 'relative',
                  zIndex: 1
                }}
                onMouseEnter={(e) => {
                  if (currentShape !== 'christmasTree') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentShape !== 'christmasTree') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }
                }}
              >
                {t('particles.shapes.christmasTree')}
              </button>
            </div>
          </div>

          {/* Preset Colors - Cosmic Theme */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              color: '#a0aec0',
              fontSize: '0.75rem',
              display: 'block',
              marginBottom: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              🎨 {t('particles.particleColor')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.color}
                  onClick={() => handleColorClick(preset.color)}
                  title={preset.name}
                  style={{
                    width: '100%',
                    height: '3rem',
                    background: preset.gradient,
                    border: currentColor === preset.color
                      ? '3px solid white'
                      : '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: currentColor === preset.color
                      ? `0 0 20px ${preset.color}, 0 4px 15px ${preset.color}`
                      : '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transform: currentColor === preset.color ? 'scale(1.15)' : 'scale(1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (currentColor !== preset.color) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = `0 0 15px ${preset.color}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentColor !== preset.color) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: '#a0aec0',
            lineHeight: '1.6',
            padding: '1rem',
            background: 'rgba(0, 245, 255, 0.05)',
            borderRadius: '0.75rem',
            border: '1px solid rgba(0, 245, 255, 0.1)'
          }}>
            <p style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🖐️</span>
              <strong style={{ color: '#00f5ff', fontWeight: '600' }}>{t('particles.oneHand')}</strong>
              <span>{t('particles.pinchToPulse')}</span>
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🙌</span>
              <strong style={{ color: '#00f5ff', fontWeight: '600' }}>{t('particles.twoHands')}</strong>
              <span>{t('particles.expandAndZoom')}</span>
            </p>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(124, 77, 255, 0.2) 100%)',
              color: '#00f5ff',
              fontSize: '0.85rem',
              fontWeight: '600',
              padding: '0.875rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(0, 245, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 15px rgba(0, 245, 255, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 245, 255, 0.3) 0%, rgba(124, 77, 255, 0.3) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 245, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 245, 255, 0.2) 0%, rgba(124, 77, 255, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 245, 255, 0.15)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            {t('particles.toggleFullscreen')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreeJSParticles;