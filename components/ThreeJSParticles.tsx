import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import * as THREE from 'three';

const ThreeJSParticles: React.FC = () => {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentShape, setCurrentShape] = useState('heart');
  const [currentColor, setCurrentColor] = useState('#00ffff');
  const [statusText, setStatusText] = useState('Waiting for camera...');
  const [statusColor, setStatusColor] = useState('red');
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuration
    const PARTICLE_COUNT = 15000;
    const PARTICLE_SIZE = 0.15;
    const CAMERA_Z_BASE = 30;

    // State
    const state = {
      currentShape: 'heart',
      targetColor: new THREE.Color(0x00ffff),
      currentColor: new THREE.Color(0x00ffff),
      handDistance: 0,
      pinchStrength: 0,
      handsDetected: 0,
      expansion: 1.0,
      rotationSpeed: 0.001
    };

    // Three.js Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.02);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = CAMERA_Z_BASE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
            setStatusText(`${state.handsDetected} Hand(s) Tracking`);

            if (results.multiHandLandmarks.length === 2) {
              const hand1 = results.multiHandLandmarks[0][0];
              const hand2 = results.multiHandLandmarks[1][0];
              const dx = hand1.x - hand2.x;
              const dy = hand1.y - hand2.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              state.handDistance = distance;
              const targetExp = Math.max(0.5, Math.min(3.5, distance * 4));
              state.expansion += (targetExp - state.expansion) * 0.1;
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
              state.expansion += (targetExp - state.expansion) * 0.1;
            }
          } else {
            setStatusColor('yellow');
            setStatusText('Looking for hands...');
            state.expansion += (1.0 - state.expansion) * 0.05;
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
          setStatusText('Camera access denied/error');
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

      state.currentColor.lerp(state.targetColor, 0.05);
      material.color = state.currentColor;

      particles.rotation.y += state.rotationSpeed + (state.expansion * 0.001);

      let expansionFactor = state.expansion;
      if (state.currentShape === 'fireworks') {
        expansionFactor *= (1 + Math.sin(time * 2) * 0.3);
      } else if (state.currentShape === 'heart') {
        expansionFactor *= (1 + Math.sin(time * 8) * 0.05 * (1 - Math.min(1, state.pinchStrength * 2)));
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

        currentPositions[ix] += (tx - currentPositions[ix]) * 0.08;
        currentPositions[iy] += (ty - currentPositions[iy]) * 0.08;
        currentPositions[iz] += (tz - currentPositions[iz]) * 0.08;
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

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
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
    <div style={{ margin: 0, overflow: 'hidden', backgroundColor: '#050505', fontFamily: 'Inter, sans-serif' }}>
      {/* Video Element for MediaPipe (Hidden) */}
      <video
        ref={videoRef}
        style={{ transform: 'scaleX(-1)', display: 'none' }}
      />

      {/* Three.js Container */}
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }} />

      {/* Main UI Container */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
        {/* Header / Status */}
        <div style={{ position: 'absolute', top: '1rem', left: '1.5rem', pointerEvents: 'auto' }}>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '300', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            PARTICLE<span style={{ fontWeight: 'bold', color: '#42A5F5' }}>FLOW</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
            <div
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '9999px',
                backgroundColor: statusColor === 'red' ? '#EF4444' : statusColor === 'green' ? '#10B981' : '#FBBF24'
              }}
            />
            <span>{statusText}</span>
          </div>
        </div>

        {/* Back Home Button */}
        <Link
          to="/"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '20rem',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(20, 20, 20, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            color: 'white',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(66, 165, 245, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(20, 20, 20, 0.6)';
          }}
        >
          <Home size={20} />
          {t('home.backHome')}
        </Link>

        {/* Control Panel */}
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '16rem',
            background: 'rgba(20, 20, 20, 0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            pointerEvents: 'auto',
            transition: 'all 0.3s'
          }}
        >
          <h2 style={{ color: 'white', fontSize: '0.875rem', fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>
            CONTROLS
          </h2>

          {/* Shape Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ color: '#9CA3AF', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>SHAPE MODE</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['heart', 'flower', 'saturn', 'buddha'].map((shape) => (
                <button
                  key={shape}
                  onClick={() => handleShapeChange(shape)}
                  style={{
                    backgroundColor: currentShape === shape ? '#2563EB' : '#1F2937',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: `1px solid ${currentShape === shape ? '#3B82F6' : '#374151'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {shape.charAt(0).toUpperCase() + shape.slice(1)}
                </button>
              ))}
              <button
                onClick={() => handleShapeChange('fireworks')}
                style={{
                  gridColumn: 'span 2',
                  backgroundColor: currentShape === 'fireworks' ? '#7C3AED' : '#1F2937',
                  color: 'white',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  border: `1px solid ${currentShape === 'fireworks' ? '#8B5CF6' : '#374151'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Fireworks
              </button>
            </div>
          </div>

          {/* Color Picker */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ color: '#9CA3AF', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>PARTICLE COLOR</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="color"
                value={currentColor}
                onChange={handleColorChange}
                style={{ width: '2rem', height: '2rem', padding: 0, border: 0, borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: 'transparent' }}
              />
              <span style={{ color: '#D1D5DB', fontSize: '0.75rem', fontFamily: 'monospace' }}>{currentColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Info */}
          <div style={{ marginBottom: '1.25rem', fontSize: '0.75rem', color: '#6B7280', lineHeight: '1.5' }}>
            <p style={{ marginBottom: '0.25rem' }}>
              <strong style={{ color: '#D1D5DB' }}>One Hand:</strong> Pinch to pulse.
            </p>
            <p>
              <strong style={{ color: '#D1D5DB' }}>Two Hands:</strong> Move apart to expand & zoom.
            </p>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              width: '100%',
              backgroundColor: '#374151',
              color: 'white',
              fontSize: '0.75rem',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              border: 0,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Toggle Fullscreen
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreeJSParticles;
