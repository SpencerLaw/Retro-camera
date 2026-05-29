import fs from 'fs';
const content = fs.readFileSync('scripts/rewrite_scheduler_app.mjs', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('检测到') || line.includes('故障') || line.includes('碰撞')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
