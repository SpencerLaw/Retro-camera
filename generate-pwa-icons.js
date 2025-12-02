// Generate PWA Icons using Canvas
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon and convert to different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const generateSVGIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f7931e;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${size * 0.015}"/>
      <feOffset dx="0" dy="${size * 0.02}" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- Toolbox with shadow -->
  <g filter="url(#shadow)">
    <!-- Main toolbox body -->
    <rect x="${size * 0.175}" y="${size * 0.37}" width="${size * 0.65}" height="${size * 0.5}" fill="#e74c3c" rx="${size * 0.02}"/>

    <!-- Toolbox lid -->
    <rect x="${size * 0.175}" y="${size * 0.25}" width="${size * 0.65}" height="${size * 0.12}" fill="#c0392b" rx="${size * 0.02}"/>

    <!-- Handle -->
    <path d="M ${size * 0.375} ${size * 0.25} Q ${size * 0.5} ${size * 0.12} ${size * 0.625} ${size * 0.25}"
          stroke="#2c3e50" stroke-width="${size * 0.04}" fill="none" stroke-linecap="round"/>

    <!-- Lock/latch -->
    <rect x="${size * 0.46}" y="${size * 0.31}" width="${size * 0.08}" height="${size * 0.048}" fill="#f39c12" rx="${size * 0.01}"/>

    <!-- Wrench symbol -->
    <line x1="${size * 0.35}" y1="${size * 0.42}" x2="${size * 0.395}" y2="${size * 0.525}"
          stroke="#ffffff" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    <circle cx="${size * 0.35}" cy="${size * 0.42}" r="${size * 0.03}" fill="#ffffff"/>

    <!-- Screwdriver symbol -->
    <line x1="${size * 0.53}" y1="${size * 0.42}" x2="${size * 0.635}" y2="${size * 0.525}"
          stroke="#ffffff" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    <circle cx="${size * 0.53}" cy="${size * 0.42}" r="${size * 0.03}" fill="#f39c12"/>

    <!-- Compartment line -->
    <line x1="${size * 0.225}" y1="${size * 0.72}" x2="${size * 0.775}" y2="${size * 0.72}"
          stroke="rgba(255,255,255,0.2)" stroke-width="${size * 0.01}"/>
  </g>
</svg>
`;

// Create icons directory
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for each size
sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

console.log('\n✓ All SVG icons generated successfully!');
console.log('\nNote: SVG icons work great for PWA. If you need PNG files, you can:');
console.log('1. Open icon-generator.html in a browser');
console.log('2. Click "下载全部图标" to download all PNG versions');
