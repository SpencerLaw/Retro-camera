import { Filter } from './types';

export const FILTERS: Filter[] = [
  {
    id: 'normal',
    name: '原图',
    css: 'none',
    description: 'Standard'
  },
  {
    id: 'vivid',
    name: '鲜艳',
    css: 'contrast(1.2) saturate(1.35) brightness(1.1)',
    description: 'Bright & Punchy'
  },
  {
    id: 'soft',
    name: '胶片',
    css: 'brightness(1.05) hue-rotate(-10deg) contrast(0.9) sepia(0.2)',
    description: 'Vintage Soft'
  },
  {
    id: 'clean',
    name: '清新',
    css: 'contrast(0.9) brightness(1.1) saturate(1.1) sepia(0.1)',
    description: 'Cool & Airy'
  },
  {
    id: 'warm',
    name: '暖阳',
    css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)',
    description: 'Warm & Dusty'
  },
  {
    id: 'rich',
    name: '浓郁',
    css: 'contrast(1.15) saturate(1.4) sepia(0.15) hue-rotate(-5deg)',
    description: 'Warm & Deep'
  },
  {
    id: 'cyber',
    name: '赛博',
    css: 'contrast(1.3) saturate(1.8) hue-rotate(10deg) brightness(1.1)',
    description: 'Cyberpunk'
  },
  {
    id: 'candy',
    name: '糖果',
    css: 'brightness(1.1) contrast(1.1) saturate(1.3) hue-rotate(-10deg)',
    description: 'Pink & Sweet'
  },
  {
    id: 'retro',
    name: '复古',
    css: 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(0.8)',
    description: 'Strong Sepia'
  }
];

export const GEMINI_MODEL_REMIX = 'gemini-2.5-flash-image';