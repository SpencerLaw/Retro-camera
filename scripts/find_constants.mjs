import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('const DAYS') || line.includes('const PERIODS_METADATA')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
