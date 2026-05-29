import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('const handle') || line.includes('function ')) {
    if (line.length < 150) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  }
});
