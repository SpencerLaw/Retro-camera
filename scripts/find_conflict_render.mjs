import fs from 'fs';

const content = fs.readFileSync('scripts/rewrite_scheduler_app.mjs', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('conflicts') || line.includes('AlertTriangle') || line.includes('检测到') || line.includes('故障')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
