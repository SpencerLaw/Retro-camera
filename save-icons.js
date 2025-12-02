// Save PNG icons from Puppeteer-generated base64 data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Base64 icon data from Puppeteer
const iconData = {
  72: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAABvdJREFUeF7tXGtsVFUQx/8ze/e2L6UvtBRaKGohgkEjqBETExMTY0w0fvCDH0z8YPygn0z8YEyMMX7wgx8kJiYaE2NijPGDHzQxJhoTY0w0JsYYE42JMdGYGGNiTIwx0Zjobua2t7vb7b7ce/fdvXd3T/Ikl+w9c2bO/HfOnDkzc0n8jx/6H48fECBegJ5gBC+gAIAWAVgMYCGABgA1ACoBlAOoAFAGoAxAKYASAAoABUAMQBxAHEAcQBJAEkAaQBpACkAaQBJACkASQBpAGkASQApAGkAaQAJAEkAaQBpAEkAK...",
  // ... additional sizes omitted for brevity
};

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const base64Data = iconData[size].replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const filename = path.join(iconsDir, `icon-${size}x${size}.png`);

  fs.writeFileSync(filename, buffer);
  console.log(`Saved: icon-${size}x${size}.png`);
});

console.log('\n✓ All PNG icons saved successfully!');
