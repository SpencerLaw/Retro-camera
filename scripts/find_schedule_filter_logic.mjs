import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/CourseSchedulerApp.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('schedules.filter') || line.includes('filteredSchedules') || line.includes('filteredItems')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
