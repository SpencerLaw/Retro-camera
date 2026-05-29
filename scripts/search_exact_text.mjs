import fs from 'fs';

const content = fs.readFileSync('components/HomePage.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('检测到') || line.includes('故障') || line.includes('碰撞') || line.includes('分身') || line.includes('冲突')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
