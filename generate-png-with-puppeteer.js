// Generate and save PNG icons using Puppeteer
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

// Function to draw icon on canvas
function getCanvasCode(size) {
  return `
    const canvas = document.createElement('canvas');
    canvas.width = ${size};
    canvas.height = ${size};
    const ctx = canvas.getContext('2d');

    const size = ${size};

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

    // Return base64 data
    canvas.toDataURL('image/png');
  `;
}

console.log('This script requires Puppeteer MCP server to be running.');
console.log('Please use the Puppeteer MCP tools to generate icons.');
console.log('\nAlternatively, run: node generate-pwa-icons.js');
console.log('SVG icons will work for most PWA applications.');
