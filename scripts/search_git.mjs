import { execSync } from 'child_process';

try {
  const content = execSync('git show 37a07af59688da8f52620517aa7fca139b835b03:components/course-scheduler/CourseSchedulerApp.tsx', { encoding: 'utf8' });
  const lines = content.split('\n');
  for (let i = 1279; i < Math.min(lines.length, 1330); i++) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
  }
} catch (err) {
  console.error('Error running git show:', err.message);
}
