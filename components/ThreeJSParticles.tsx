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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentShape, setCurrentShape] = useState('heart');
  const [currentColor, setCurrentColor] = useState('#00f5ff');
  const [statusText, setStatusText] = useState(t('particles.waitingForCamera'));
  const [statusColor, setStatusColor] = useState('red');
  const sceneRef = useRef<any>(null);
  
  // 添加一个 ref 来存储内部状态，避免闭包问题
  const internalState = useRef({
    forceFastUpdate: false,
    forceUpdateFrameCount: 0
  });

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
    console.log('=== useEffect started ===');
    console.log('containerRef.current:', containerRef.current);
    
    if (!containerRef.current) {
      console.error('containerRef.current is null, useEffect will not continue');
      return;
    }

    // Defensive cleanup: Remove any existing children (stale canvases)
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    console.log('Three.js setup starting...');

    // Configuration
    const PARTICLE_COUNT = 25000; // Increased count for denser, richer look
    const PARTICLE_SIZE = 0.25; // Smaller size for finer, HD definition
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
      rotationSpeed: 0.001,
      // 旋转控制
      targetRotationY: 0,
      currentRotationY: 0,
      targetRotationX: 0,
      currentRotationX: 0,
      lastHandAngle: 0,
      lastHandsAngle: 0
    };

    // Helper: Generate a High-Definition soft glow texture
    const getTexture = () => {
      const size = 128; // 128x128 Resolution for sharp scaling
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      const center = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      // Multi-stop gradient for "Hot Core" effect
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');     // Pure white core
      gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.9)'); // High intensity zone
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');  // Soft falloff
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');            // Transparent edge
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter; // Smooth scaling down
      texture.magFilter = THREE.LinearFilter; // Smooth scaling up
      return texture;
    };

    // Three.js Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = CAMERA_Z_BASE;
    camera.position.x = 8; // Shift camera right to move scene left (away from panel)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0); // 透明背景，让星空透过
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Use full device pixel ratio for HD
    containerRef.current.appendChild(renderer.domElement);

    // Particle System
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3); // RGB colors for each particle
    const targetColors = new Float32Array(PARTICLE_COUNT * 3); // Target colors for smooth transitions

    // Initialize with random positions
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 50;
      targetPositions[i] = positions[i];
    }
    
    // Initialize colors (default to current color)
    const defaultColor = state.currentColor;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors[i * 3] = defaultColor.r;
      colors[i * 3 + 1] = defaultColor.g;
      colors[i * 3 + 2] = defaultColor.b;
      targetColors[i * 3] = defaultColor.r;
      targetColors[i * 3 + 1] = defaultColor.g;
      targetColors[i * 3 + 2] = defaultColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff, // Base color white, tinted by vertex colors
      map: getTexture(), // Use the soft glow texture
      size: PARTICLE_SIZE,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true 
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Shape Generators
    const Shapes: any = {
      heart: (i: number) => {
        // 实心爱心设计：使用分层填充
        const layer = Math.random();
        if (layer < 0.3) {
          // 外层轮廓（30%的粒子）
        const t = Math.random() * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          const z = (Math.random() - 0.5) * 2;
        return [x * 0.5, y * 0.5, z];
        } else if (layer < 0.6) {
          // 中层填充（30%的粒子）
          const t = Math.random() * Math.PI * 2;
          const scale = 0.6 + Math.random() * 0.2; // 0.6-0.8倍缩放
          const x = 16 * Math.pow(Math.sin(t), 3) * scale;
          const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
          const z = (Math.random() - 0.5) * 2;
          return [x * 0.5, y * 0.5, z];
        } else {
          // 内层核心（40%的粒子）- 实心填充
          const t = Math.random() * Math.PI * 2;
          const scale = 0.3 + Math.random() * 0.3; // 0.3-0.6倍缩放，形成实心核心
          const x = 16 * Math.pow(Math.sin(t), 3) * scale;
          const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
          const z = (Math.random() - 0.5) * 1.5;
          return [x * 0.5, y * 0.5, z];
        }
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
        // 炫酷螺旋圣诞树算法
        const section = Math.random();
        
        // 1. 顶部璀璨之星 (Top Star) - 5% 粒子
        if (section < 0.05) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = Math.pow(Math.random(), 3) * 1.5; // 核心密集，外部稀疏的光晕
          return [
            r * Math.sin(phi) * Math.cos(theta),
            9 + r * Math.sin(phi) * Math.sin(theta), // 高度在 y=9
            r * Math.cos(phi),
            2 // 亮金色/白色
          ];
        }
        
        // 2. 霓虹灯带 (Neon Lights) - 15% 粒子 - 螺旋分布
        else if (section < 0.20) {
          const t = Math.random(); // 0 to 1 position along spiral
          const height = 8 - t * 16; // y from 8 to -8
          const maxRadius = 6;
          const radius = 0.5 + (1 - height / 9) * 0.5 * maxRadius; // 锥形半径
          const spirals = 8; // 8圈螺旋
          const angle = t * Math.PI * 2 * spirals;
          
          return [
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius,
            Math.random() > 0.66 ? 3 : (Math.random() > 0.33 ? 4 : 5) // 随机 红/金/蓝
          ];
        }
        
        // 3. 树体 (Foliage) - 70% 粒子 - 体积螺旋
        else if (section < 0.90) {
          const t = Math.random();
          const height = 8 - t * 16; // y from 8 to -8
          const maxRadius = 5.5;
          const baseRadius = (1 - (height + 8) / 17) * maxRadius; // 线性锥体
          
          // 在基础圆锥上增加螺旋扰动和随机扩散
          const spirals = 6;
          const angleBase = t * Math.PI * 2 * spirals;
          const angleOffset = Math.random() * Math.PI * 2;
          const rOffset = Math.random() * 1.5; // 树枝厚度
          
          const finalRadius = baseRadius + (Math.random() - 0.5) * 2;
          
          return [
            Math.cos(angleBase + angleOffset * 0.2) * finalRadius,
            height + (Math.random() - 0.5),
            Math.sin(angleBase + angleOffset * 0.2) * finalRadius,
            0 // 霓虹绿
          ];
        }
        
        // 4. 树干 (Trunk) - 10% 粒子
        else {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * 1.2;
          const h = -8 - Math.random() * 3; // y from -8 to -11
          return [
            Math.cos(angle) * r,
            h,
            Math.sin(angle) * r,
            1 // 深色树干
          ];
        }
      }
    };

    // 圣诞树颜色定义 - 赛博朋克/霓虹风格
    const christmasColors = {
      0: new THREE.Color(0x00ff9d), // Cyber Green (青绿色)
      1: new THREE.Color(0x4a3b32), // Dark Wood
      2: new THREE.Color(0xffffff), // Pure White Star Core
      3: new THREE.Color(0xff0055), // Neon Red
      4: new THREE.Color(0xffcc00), // Neon Gold
      5: new THREE.Color(0x00f5ff)  // Neon Cyan (Blue)
    };

    const generateShape = (shapeName: string) => {
      console.log('=== generateShape function called ===');
      console.log('shapeName:', shapeName);
      console.log('Shapes[shapeName]:', Shapes[shapeName]);
      
      const generator = Shapes[shapeName] || Shapes.heart;
      const isChristmasTree = shapeName === 'christmasTree';
      
      // 采样几个粒子，检查生成的坐标
      const sampleIndices = [0, 100, 1000, 5000, 10000];
      const samples: any[] = [];
      
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const result = generator(i);
        // 处理返回值：可能是 [x, y, z] 或 [x, y, z, colorType]
        const x = result[0];
        const y = result[1];
        const z = result[2];
        targetPositions[i * 3] = x;
        targetPositions[i * 3 + 1] = y;
        targetPositions[i * 3 + 2] = z;
        
        // 采样
        if (sampleIndices.includes(i)) {
          samples.push({ i, x, y, z, result });
        }
        
        // 如果是圣诞树，根据颜色类型设置颜色
        if (isChristmasTree && result.length > 3) {
          const colorType = result[3];
          const color = christmasColors[colorType as keyof typeof christmasColors] || christmasColors[0];
          targetColors[i * 3] = color.r;
          targetColors[i * 3 + 1] = color.g;
          targetColors[i * 3 + 2] = color.b;
        } else {
          // 其他形状使用当前选择的颜色
          const color = state.currentColor;
          targetColors[i * 3] = color.r;
          targetColors[i * 3 + 1] = color.g;
          targetColors[i * 3 + 2] = color.b;
        }
      }
      
      // 输出采样结果
      console.log('Sample particles for shape', shapeName, ':', samples);
      console.log('targetPositions[0-5]:', [
        targetPositions[0], targetPositions[1], targetPositions[2],
        targetPositions[3], targetPositions[4], targetPositions[5]
      ]);
      console.log('=== generateShape function completed ===');
    };

    generateShape('heart');
    console.log('Initial shape generated');

    // MediaPipe Hands Setup
    const setupMediaPipe = async () => {
      try {
        console.log('Setting up MediaPipe...');
        const videoElement = videoRef.current;
        if (!videoElement) {
          console.error('videoElement is null');
          return;
        }

        // 检查 MediaPipe 是否已加载
        if (typeof window.Hands === 'undefined') {
          console.error('MediaPipe Hands is not loaded. Waiting...');
          // 等待 MediaPipe 加载
          let retries = 0;
          const checkMediaPipe = setInterval(() => {
            if (typeof window.Hands !== 'undefined') {
              clearInterval(checkMediaPipe);
              console.log('MediaPipe Hands loaded, initializing...');
              initializeHands();
            } else if (retries++ > 50) {
              clearInterval(checkMediaPipe);
              console.error('MediaPipe Hands failed to load after 5 seconds');
              setStatusText('MediaPipe加载失败，请刷新页面');
            }
          }, 100);
          return;
        }

        initializeHands();

        function initializeHands() {
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

          // 绘制手部关键点和连线
          const drawHands = (results: any) => {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

          const ctx = canvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: true 
          });
          if (!ctx) return;

          // 使用requestAnimationFrame确保绘制不会阻塞
          requestAnimationFrame(() => {
            // 清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 绘制视频帧（镜像）- 只在canvas内绘制，不影响其他图层
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              // 手部关键点连接关系（MediaPipe Hands的21个关键点）
              const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
                [0, 5], [5, 6], [6, 7], [7, 8], // 食指
                [0, 9], [9, 10], [10, 11], [11, 12], // 中指
                [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
                [0, 17], [17, 18], [18, 19], [19, 20], // 小指
                [5, 9], [9, 13], [13, 17] // 手掌连接
              ];

              results.multiHandLandmarks.forEach((handLandmarks: any, handIndex: number) => {
                // 绘制连线
                ctx.strokeStyle = handIndex === 0 ? '#00f5ff' : '#ff0080';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                connections.forEach(([start, end]) => {
                  const startPoint = handLandmarks[start];
                  const endPoint = handLandmarks[end];
                  if (startPoint && endPoint) {
                    const x1 = (1 - startPoint.x) * canvas.width; // 镜像翻转
                    const y1 = startPoint.y * canvas.height;
                    const x2 = (1 - endPoint.x) * canvas.width;
                    const y2 = endPoint.y * canvas.height;
                    
                    if (start === 0) {
                      ctx.moveTo(x1, y1);
                    }
                    ctx.lineTo(x2, y2);
                  }
                });
                ctx.stroke();

                // 绘制关键点
                handLandmarks.forEach((landmark: any, index: number) => {
                  const x = (1 - landmark.x) * canvas.width; // 镜像翻转
                  const y = landmark.y * canvas.height;
                  
                  ctx.fillStyle = handIndex === 0 ? '#00f5ff' : '#ff0080';
                  ctx.beginPath();
                  ctx.arc(x, y, 4, 0, Math.PI * 2);
                  ctx.fill();
                  
                  // 手腕和指尖用更大的点
                  if (index === 0 || [4, 8, 12, 16, 20].includes(index)) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                  }
                });
              });
            }
          });
          };

          hands.onResults((results: any) => {
          // 绘制手部关键点
          drawHands(results);

          state.handsDetected = 0;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            state.handsDetected = results.multiHandLandmarks.length;
            setStatusColor('green');
            setStatusText(t('particles.handsTracking').replace('{count}', state.handsDetected.toString()));

            if (results.multiHandLandmarks.length === 2) {
              // 双手模式：计算旋转和缩放
              const hand1 = results.multiHandLandmarks[0];
              const hand2 = results.multiHandLandmarks[1];
              
              // 计算双手中心点
              const hand1Center = hand1[0]; // 手腕
              const hand2Center = hand2[0]; // 手腕
              
              // 计算距离（缩放）
              const dx = hand1Center.x - hand2Center.x;
              const dy = hand1Center.y - hand2Center.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              state.handDistance = distance;
              const targetExp = Math.max(0.5, Math.min(3.5, distance * 4));
              state.expansion += (targetExp - state.expansion) * 0.3;

              // 计算旋转角度（基于双手连线方向）
              const angle = Math.atan2(dy, dx);
              // 将角度映射到Y轴旋转（增强敏感度，-π到π映射到-4π到4π）
              state.targetRotationY = angle * 4;
              // 更快的平滑过渡
              state.currentRotationY += (state.targetRotationY - state.currentRotationY) * 0.4;

              // 计算双手高度差（X轴旋转，增强敏感度）
              const heightDiff = hand1Center.y - hand2Center.y;
              state.targetRotationX = heightDiff * Math.PI * 2;
              state.currentRotationX += (state.targetRotationX - state.currentRotationX) * 0.4;

            } else if (results.multiHandLandmarks.length === 1) {
              // 单手模式：计算旋转和缩放
              const hand = results.multiHandLandmarks[0];
              const wrist = hand[0]; // 手腕
              const middleFinger = hand[9]; // 中指根部
              const middleFingerTip = hand[12]; // 中指指尖
              
              // 计算捏合距离（缩放）
              const thumb = hand[4];
              const index = hand[8];
              const dist = Math.sqrt(
                Math.pow(thumb.x - index.x, 2) +
                Math.pow(thumb.y - index.y, 2)
              );
              state.pinchStrength = dist;
              const targetExp = 0.8 + (dist * 5);
              state.expansion += (targetExp - state.expansion) * 0.3;

              // 计算手部方向向量（从手腕到中指根部）
              const dirX = middleFinger.x - wrist.x;
              const dirY = middleFinger.y - wrist.y;
              const angle = Math.atan2(dirY, dirX);
              
              // 将角度映射到Y轴旋转（增强敏感度）
              state.targetRotationY = angle * 4;
              // 更快的平滑过渡
              state.currentRotationY += (state.targetRotationY - state.currentRotationY) * 0.4;

              // 计算手部倾斜（基于中指方向，增强敏感度）
              const tipDirX = middleFingerTip.x - middleFinger.x;
              const tipDirY = middleFingerTip.y - middleFinger.y;
              const tipAngle = Math.atan2(tipDirY, tipDirX);
              // X轴旋转基于手指倾斜（增强敏感度）
              state.targetRotationX = (tipAngle - angle) * 2;
              state.currentRotationX += (state.targetRotationX - state.currentRotationX) * 0.4;
            }
          } else {
            setStatusColor('yellow');
            setStatusText(t('particles.lookingForHands'));
            state.expansion += (1.0 - state.expansion) * 0.15;
            // 没有检测到手时，逐渐回到默认旋转（更快的重置）
            state.targetRotationY = 0;
            state.targetRotationX = 0;
            state.currentRotationY += (state.targetRotationY - state.currentRotationY) * 0.3;
            state.currentRotationX += (state.targetRotationX - state.currentRotationX) * 0.3;
          }
          });

          // 设置canvas用于绘制手部关键点
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = 640;
            canvas.height = 480;
          }

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
        }
      } catch (error) {
        console.error('MediaPipe setup failed', error);
        setStatusText('MediaPipe初始化失败: ' + (error as Error).message);
      }
    };

    setupMediaPipe();

    // Animation Loop
    const clock = new THREE.Clock();
    let animationId: number;
    
    const animate = () => {
      animationId = requestAnimationFrame(animate);

            const time = clock.getElapsedTime();

      

            state.currentColor.lerp(state.targetColor, 0.15);

            // material.color = state.currentColor; // Removed to allow vertex colors to work with texture

      

            // 应用旋转控制
      if (state.handsDetected > 0) {
        // 检测到手时，使用手势控制的旋转
        particles.rotation.y = state.currentRotationY;
        particles.rotation.x = state.currentRotationX;
      } else {
        // 没有检测到手时，使用自动旋转（确保形状切换时能看到变化）
        // 同时平滑过渡到自动旋转，避免突然变化
        const autoRotationSpeed = 0.01;
        particles.rotation.y += autoRotationSpeed;
        // 平滑重置X轴旋转
        particles.rotation.x = state.currentRotationX;
      }

      let expansionFactor = state.expansion;
      if (state.currentShape === 'fireworks') {
        expansionFactor *= (1 + Math.sin(time * 2) * 0.3);
      } else if (state.currentShape === 'heart') {
        expansionFactor *= (1 + Math.sin(time * 8) * 0.05 * (1 - Math.min(1, state.pinchStrength * 2)));
      } else if (state.currentShape === 'christmasTree') {
        expansionFactor *= (1 + Math.sin(time * 1.5) * 0.08);
      }

      const posAttribute = geometry.attributes.position;
      const colorAttribute = geometry.attributes.color;
      const currentPositions = posAttribute.array as Float32Array;
      const currentColors = colorAttribute.array as Float32Array;

      // 如果 forceFastUpdate 为 true，跳过位置更新（因为已经在 generateShape 中直接更新了）
      if (!internalState.current.forceFastUpdate) {
        // 正常更新模式：平滑插值
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

          // 添加轻微抖动
          tx += Math.sin(time + i) * 0.02;
          ty += Math.cos(time + i * 0.5) * 0.02;

          // 平滑插值
          const lerpSpeed = 0.5;
          currentPositions[ix] += (tx - currentPositions[ix]) * lerpSpeed;
          currentPositions[iy] += (ty - currentPositions[iy]) * lerpSpeed;
          currentPositions[iz] += (tz - currentPositions[iz]) * lerpSpeed;
        }
      } else {
        // 强制更新模式：只应用 expansionFactor 的变化（位置已经在 generateShape 中设置）
        // 但需要根据当前的 expansionFactor 调整（因为 expansionFactor 可能会变化）
        const currentExpansion = state.expansion;
        let dynamicExpansion = currentExpansion;
        if (state.currentShape === 'fireworks') {
          dynamicExpansion *= (1 + Math.sin(time * 2) * 0.3);
        } else if (state.currentShape === 'heart') {
          dynamicExpansion *= (1 + Math.sin(time * 8) * 0.05 * (1 - Math.min(1, state.pinchStrength * 2)));
        } else if (state.currentShape === 'christmasTree') {
          dynamicExpansion *= (1 + Math.sin(time * 1.5) * 0.08);
        }
        
        // 如果 expansionFactor 变化了，需要重新计算位置
        if (Math.abs(dynamicExpansion - expansionFactor) > 0.01) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;
            // 基于 targetPositions 和新的 expansionFactor 更新
            currentPositions[ix] = targetPositions[ix] * dynamicExpansion;
            currentPositions[iy] = targetPositions[iy] * dynamicExpansion;
            currentPositions[iz] = targetPositions[iz] * dynamicExpansion;
          }
        }
      }
        
      // 颜色更新
      if (!internalState.current.forceFastUpdate) {
        // 正常模式：平滑插值颜色
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const ix = i * 3;
          const iy = i * 3 + 1;
          const iz = i * 3 + 2;
          const colorLerpSpeed = 0.4;
          currentColors[ix] += (targetColors[ix] - currentColors[ix]) * colorLerpSpeed;
          currentColors[iy] += (targetColors[iy] - currentColors[iy]) * colorLerpSpeed;
          currentColors[iz] += (targetColors[iz] - currentColors[iz]) * colorLerpSpeed;
        }
      }
      
      // 如果强制快速更新，几帧后恢复正常速度
      if (internalState.current.forceFastUpdate) {
        internalState.current.forceUpdateFrameCount++;
        if (internalState.current.forceUpdateFrameCount > 5) {
          internalState.current.forceFastUpdate = false;
          internalState.current.forceUpdateFrameCount = 0;
          console.log('Force update completed, returning to normal interpolation');
        }
      }
      // 强制更新标志，确保 Three.js 知道几何体已更改
      posAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;

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
        console.log('generateShape called:', shapeName, 'state:', state);
        state.currentShape = shapeName;
        generateShape(shapeName);
        
        // 直接更新 currentPositions，确保变化立即可见
        const posAttribute = geometry.attributes.position;
        const currentPositions = posAttribute.array as Float32Array;
        
        // 计算 expansionFactor（与动画循环中的计算保持一致）
        let expansionFactor = state.expansion;
        const time = clock.getElapsedTime();
        if (shapeName === 'fireworks') {
          expansionFactor *= (1 + Math.sin(time * 2) * 0.3);
        } else if (shapeName === 'heart') {
          expansionFactor *= (1 + Math.sin(time * 8) * 0.05 * (1 - Math.min(1, state.pinchStrength * 2)));
        } else if (shapeName === 'christmasTree') {
          expansionFactor *= (1 + Math.sin(time * 1.5) * 0.08);
        }
        
        console.log('Updating positions with expansionFactor:', expansionFactor, 'for shape:', shapeName);
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const ix = i * 3;
          const iy = i * 3 + 1;
          const iz = i * 3 + 2;
          // 直接设置位置，应用当前的 expansionFactor
          currentPositions[ix] = targetPositions[ix] * expansionFactor;
          currentPositions[iy] = targetPositions[iy] * expansionFactor;
          currentPositions[iz] = targetPositions[iz] * expansionFactor;
        }
        
        // 直接更新颜色
        const colorAttribute = geometry.attributes.color;
        const currentColors = colorAttribute.array as Float32Array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          currentColors[i * 3] = targetColors[i * 3];
          currentColors[i * 3 + 1] = targetColors[i * 3 + 1];
          currentColors[i * 3 + 2] = targetColors[i * 3 + 2];
        }
        
        // 强制快速更新
        internalState.current.forceFastUpdate = true;
        internalState.current.forceUpdateFrameCount = 0;
        
        // 强制更新几何体属性
        posAttribute.needsUpdate = true;
        colorAttribute.needsUpdate = true;
        console.log('Shape generated, positions and colors directly updated');
      },
      setColor: (color: string) => {
        console.log('setColor called:', color);
        state.targetColor.set(color);
        
        const colorAttribute = geometry.attributes.color;
        const currentColors = colorAttribute.array as Float32Array;

        // 立即更新所有粒子的目标颜色和当前颜色（非圣诞树形状）
        if (state.currentShape !== 'christmasTree') {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Update target
            targetColors[i * 3] = state.targetColor.r;
            targetColors[i * 3 + 1] = state.targetColor.g;
            targetColors[i * 3 + 2] = state.targetColor.b;
            
            // Update current immediately to avoid interpolation lag
            currentColors[i * 3] = state.targetColor.r;
            currentColors[i * 3 + 1] = state.targetColor.g;
            currentColors[i * 3 + 2] = state.targetColor.b;
          }
          colorAttribute.needsUpdate = true;
        }
        // 强制快速更新
        internalState.current.forceFastUpdate = true;
        internalState.current.forceUpdateFrameCount = 0;
        console.log('Color updated to:', color);
      }
    };
    console.log('sceneRef.current initialized:', sceneRef.current);
    console.log('=== useEffect completed ===');

    return () => {
      console.log('useEffect cleanup');
      cancelAnimationFrame(animationId);
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
    console.log('=== handleShapeChange called ===');
    console.log('Shape:', shape);
    console.log('sceneRef.current:', sceneRef.current);
    console.log('sceneRef.current?.generateShape:', sceneRef.current?.generateShape);
    setCurrentShape(shape);
    if (sceneRef.current) {
      if (sceneRef.current.generateShape) {
        console.log('Calling generateShape...');
        sceneRef.current.generateShape(shape);
        console.log('generateShape called successfully');
      } else {
        console.error('generateShape method not found on sceneRef.current');
      }
    } else {
      console.error('sceneRef.current is null!');
      // 尝试延迟执行
      setTimeout(() => {
        if (sceneRef.current && sceneRef.current.generateShape) {
          console.log('Retrying generateShape after delay...');
          sceneRef.current.generateShape(shape);
        }
      }, 100);
    }
  };

  const handleColorClick = (color: string) => {
    console.log('=== handleColorClick called ===');
    console.log('Color:', color);
    console.log('sceneRef.current:', sceneRef.current);
    console.log('sceneRef.current?.setColor:', sceneRef.current?.setColor);
    setCurrentColor(color);
    if (sceneRef.current) {
      if (sceneRef.current.setColor) {
        console.log('Calling setColor...');
        sceneRef.current.setColor(color);
        console.log('setColor called successfully');
      } else {
        console.error('setColor method not found on sceneRef.current');
      }
    } else {
      console.error('sceneRef.current is null!');
      // 尝试延迟执行
      setTimeout(() => {
        if (sceneRef.current && sceneRef.current.setColor) {
          console.log('Retrying setColor after delay...');
          sceneRef.current.setColor(color);
        }
      }, 100);
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

      {/* Video Element for MediaPipe (Completely Hidden) */}
      <video
        ref={videoRef}
        style={{ 
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          visibility: 'hidden'
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Camera Preview Window with Hand Tracking Overlay */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1.5rem',
        width: '224px',
        height: '168px',
        zIndex: 150,
        pointerEvents: 'auto',
        background: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '0.75rem',
        border: '2px solid rgba(0, 245, 255, 0.5)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 245, 255, 0.3)',
        isolation: 'isolate' // 创建新的层叠上下文，防止影响其他图层
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'auto',
            objectFit: 'contain'
          }}
        />
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#00f5ff',
          padding: '0.25rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.7rem',
          fontWeight: '600'
        }}>
          🎥 手势追踪
        </div>
      </div>

      {/* Three.js Container */}
      <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }} />

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
            width: '22.4rem',
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