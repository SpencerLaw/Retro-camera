// Icon Generator Script
// This script generates PWA icons in different sizes
// Run: node generate-icons.js

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = './public/icons';

// Create icons directory if it doesn't exist
try {
  mkdirSync(iconDir, { recursive: true });
} catch (e) {
  // Directory already exists
}

// Generate icons
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (Orange theme)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#ff6b35');
  gradient.addColorStop(1, '#f7931e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw camera icon
  const centerX = size / 2;
  const centerY = size / 2;
  const iconSize = size * 0.6;

  // Camera body
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(centerX - iconSize/2, centerY - iconSize/3, iconSize, iconSize * 0.6);

  // Camera lens
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize * 0.25, 0, 2 * Math.PI);
  ctx.fillStyle = '#2c2c2c';
  ctx.fill();

  // Lens center
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize * 0.15, 0, 2 * Math.PI);
  ctx.fillStyle = '#4a4a4a';
  ctx.fill();

  // Flash
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(centerX + iconSize/3, centerY - iconSize/3, iconSize * 0.15, iconSize * 0.15);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const filename = join(iconDir, `icon-${size}x${size}.png`);
  writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
});

console.log('All icons generated successfully!');
