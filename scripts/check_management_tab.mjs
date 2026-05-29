import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
for (let i = 1920; i < Math.min(lines.length, 2150); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
