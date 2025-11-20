export interface Filter {
  id: string;
  name: string;
  css: string;
  description?: string;
}

export interface Photo {
  id: string;
  dataUrl: string;
  timestamp: number;
  x: number; // Position on wall
  y: number;
  rotation: number;
  isDeveloping?: boolean; // For animation state
}

export enum ViewState {
  CAMERA = 'CAMERA',
  GALLERY = 'GALLERY', // Not strictly used in new design, but kept for compatibility
  PREVIEW = 'PREVIEW'
}