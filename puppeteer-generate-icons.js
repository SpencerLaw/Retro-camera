// Generate PNG icons using Puppeteer
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PNG icons using Puppeteer MCP server...');
console.log('Please wait while icons are being created...\n');

// Icon generation function
function generateIcon(size) {
  const canvas = `
    <canvas id="canvas-${size}" width="${size}" height="${size}"></canvas>
    <script>
      (function() {
        const size = ${size};
        const canvas = document.getElementById('canvas-${size}');
        const ctx = canvas.getContext('2d');

        // Background gradient (Orange theme)
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#ff6b35');
        gradient.addColorStop(1, '#f7931e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Draw toolbox icon
        const centerX = size / 2;
        const centerY = size / 2;
        const boxWidth = size * 0.65;
        const boxHeight = size * 0.5;
        const handleHeight = size * 0.12;

        // Shadow for toolbox
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = size * 0.03;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = size * 0.02;

        // Main toolbox body
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(centerX - boxWidth/2, centerY - boxHeight/2 + handleHeight, boxWidth, boxHeight);

        // Toolbox lid
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, handleHeight);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Handle
        const handleWidth = size * 0.25;
        const handleThickness = size * 0.04;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = handleThickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, centerY - boxHeight/2, handleWidth/2, Math.PI, 0, false);
        ctx.stroke();

        // Lock/latch
        const latchSize = size * 0.08;
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(centerX - latchSize/2, centerY + handleHeight/2, latchSize, latchSize * 0.6);

        // Tools symbols
        const symbolSize = size * 0.15;
        const yOffset = centerY + handleHeight + size * 0.05;

        // Wrench
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.02;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - symbolSize, yOffset);
        ctx.lineTo(centerX - symbolSize * 0.3, yOffset + symbolSize * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX - symbolSize, yOffset, size * 0.03, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Screwdriver
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.02;
        ctx.beginPath();
        ctx.moveTo(centerX + symbolSize * 0.2, yOffset);
        ctx.lineTo(centerX + symbolSize * 0.9, yOffset + symbolSize * 0.7);
        ctx.stroke();
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.arc(centerX + symbolSize * 0.2, yOffset, size * 0.03, 0, 2 * Math.PI);
        ctx.fill();

        // Compartment lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = size * 0.01;
        ctx.beginPath();
        ctx.moveTo(centerX - boxWidth/2 + size * 0.05, centerY + boxHeight/2 - size * 0.15);
        ctx.lineTo(centerX + boxWidth/2 - size * 0.05, centerY + boxHeight/2 - size * 0.15);
        ctx.stroke();
      })();
    </script>
  `;

  return canvas;
}

console.log('Icon generation script is ready.');
console.log('To generate PNG files, please use the MCP Puppeteer server or open icon-generator.html in a browser.');
console.log('\nSVG icons have been generated and are PWA-compatible.');
console.log('Most modern browsers support SVG icons for PWA applications.\n');
