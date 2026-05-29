import fs from 'fs';

const content = fs.readFileSync('components/course-scheduler/mockData.ts', 'utf8');

function extractArray(varName) {
  const marker = `export const ${varName}: `;
  const startIdx = content.indexOf(marker);
  if (startIdx === -1) return [];
  const afterMarker = content.substring(startIdx + marker.length);
  const openBracket = afterMarker.indexOf('[');
  if (openBracket === -1) return [];
  
  // Find matching closing bracket
  let depth = 0;
  let endBracket = -1;
  for (let i = openBracket; i < afterMarker.length; i++) {
    const char = afterMarker[i];
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) {
        endBracket = i;
        break;
      }
    }
  }
  
  if (endBracket === -1) return [];
  const arrayStr = afterMarker.substring(openBracket, endBracket + 1);
  return JSON.parse(arrayStr);
}

function extractSchedules() {
  const marker = `const baseSchedules: ScheduleItem[] = `;
  const startIdx = content.indexOf(marker);
  if (startIdx === -1) return [];
  const afterMarker = content.substring(startIdx + marker.length);
  const openBracket = afterMarker.indexOf('[');
  if (openBracket === -1) return [];
  
  // Find matching closing bracket
  let depth = 0;
  let endBracket = -1;
  for (let i = openBracket; i < afterMarker.length; i++) {
    const char = afterMarker[i];
    if (char === '[') depth++;
    else if (char === ']') {
      depth--;
      if (depth === 0) {
        endBracket = i;
        break;
      }
    }
  }
  
  if (endBracket === -1) return [];
  const arrayStr = afterMarker.substring(openBracket, endBracket + 1);
  return JSON.parse(arrayStr);
}

const teachers = extractArray('INITIAL_TEACHERS');
const classes = extractArray('INITIAL_TEACHING_CLASSES');
const schedules = extractSchedules();

console.log('Total Teachers in DB:', teachers.length);
console.log('Total Teaching Classes in DB:', classes.length);

const grades = ['初一', '初二', '初三', '高一', '高二', '高三'];
grades.forEach(grade => {
  const tCount = teachers.filter(t => t.preferences.includes(grade)).length;
  const cCount = classes.filter(c => c.grade === grade).length;
  const sCount = schedules.filter(s => s.teachingClassName.startsWith(grade)).length;
  console.log(`Grade: ${grade} | Assigned Teachers: ${tCount} | Active Classes: ${cCount} | Schedules Count: ${sCount}`);
});

console.log('Total Schedules Count:', schedules.length);

