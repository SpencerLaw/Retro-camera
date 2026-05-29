import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const lines = content.split('\n');

// Find start and end of left sidebar (starts at 977)
let indent = 0;
let leftStart = 976; // 0-indexed line 976
let leftEnd = -1;

for (let i = 976; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<aside id="left_sidebar"')) {
    leftStart = i;
  }
  if (leftStart !== -1 && leftEnd === -1) {
    if (line.includes('</aside>')) {
      leftEnd = i;
      break;
    }
  }
}

console.log(`Left sidebar starts at line ${leftStart + 1}, ends at line ${leftEnd + 1}`);

// Find start and end of right sidebar (starts at 1702)
let rightStart = -1;
let rightEnd = -1;
for (let i = 1690; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<aside id="right_sidebar"')) {
    rightStart = i;
  }
  if (rightStart !== -1 && rightEnd === -1) {
    if (line.includes('</aside>')) {
      rightEnd = i;
      break;
    }
  }
}
console.log(`Right sidebar starts at line ${rightStart + 1}, ends at line ${rightEnd + 1}`);
