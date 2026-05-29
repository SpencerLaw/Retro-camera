import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wbAssignments = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
const grades = ['初一', '初二', '初三', '高一', '高二', '高三'];

const subjectCleanName = {
  '语文': '语文', '数学': '数学', '英语': '英语', '政治': '政治', '历史': '历史', '地理': '地理',
  '物理': '物理', '化学': '化学', '生物': '生物', '体育': '体育', '通用': '通用', '劳动': '通用',
  '音': '音乐', '美': '美术', '信息': '信息技术'
};

console.log('=== MULTI-GRADE EXCEL DATA EXTRACTION VERIFICATION ===');

grades.forEach(gradeName => {
  const ws = wbAssignments.Sheets[gradeName];
  if (!ws) {
    console.log(`[ERROR] Sheet "${gradeName}" not found in workbook!`);
    return;
  }
  
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (data.length < 3) {
    console.log(`[ERROR] Sheet "${gradeName}" has insufficient rows (${data.length})`);
    return;
  }
  
  const headerRow = data[2];
  
  // Find key columns
  let classCol = -1;
  let typeCol = -1;
  let adviserCol = -1;
  
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]?.toString().trim();
    if (val === '班级') classCol = c;
    if (val === '分层' || val === '科类' || val === '班型') typeCol = c;
    if (val === '班主任') adviserCol = c;
  }
  
  if (classCol === -1) {
    // try to guess class column
    for (let c = 0; c < headerRow.length; c++) {
      if (headerRow[c]?.toString().trim().includes('班')) {
        classCol = c;
        break;
      }
    }
  }
  
  if (adviserCol === -1) adviserCol = headerRow.includes('班型') ? 7 : 6;
  
  // Parse subject columns
  const subjectFields = [];
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]?.toString().trim();
    const cleanSubj = subjectCleanName[val];
    if (cleanSubj && headerRow[c + 1]?.toString().trim().includes('节')) {
      subjectFields.push({
        subjectName: cleanSubj,
        nameCol: c,
        periodsCol: c + 1
      });
    }
  }
  
  console.log(`\nGrade: [${gradeName}] | Detected Class Column: ${classCol} | Adviser Column: ${adviserCol} | Found Subjects Count: ${subjectFields.length}`);
  console.log(`Subjects: ${subjectFields.map(f => f.subjectName).join(', ')}`);
  
  let validClassesCount = 0;
  let errorsCount = 0;
  
  for (let r = 3; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const classVal = row[classCol]?.toString().trim();
    if (!classVal || classVal.includes('走班') || classVal === '') continue;
    
    const classNum = parseInt(classVal);
    if (isNaN(classNum)) continue;
    
    validClassesCount++;
    const adviser = row[adviserCol]?.toString().trim().replace(/\s+/g, '') || '未设定';
    
    // Check if adviser is blank
    if (adviser === '未设定' || adviser === '') {
      console.log(`  [WARNING] Row ${r}: Class ${classNum} has no adviser!`);
      errorsCount++;
    }
    
    // Check each subject teaching assignment
    subjectFields.forEach(field => {
      const tName = row[field.nameCol]?.toString().trim().replace(/\s+/g, '');
      const periodsVal = parseInt(row[field.periodsCol]);
      const periods = isNaN(periodsVal) ? 0 : periodsVal;
      
      if (periods > 0 && (!tName || tName === '')) {
        console.log(`  [ERROR] Class ${classNum} has ${periods} periods of ${field.subjectName} but NO assigned teacher!`);
        errorsCount++;
      }
      if (tName && periods === 0) {
        console.log(`  [WARNING] Class ${classNum} has teacher ${tName} for ${field.subjectName} but 0 periods!`);
      }
    });
  }
  
  console.log(`Total Valid Classes Found: ${validClassesCount} | Warnings/Errors: ${errorsCount}`);
});

console.log('\n=== DB INTEGRITY AUDIT ===');
// Let's read the actual mockData.ts and do an integrity check
import fs from 'fs';
const content = fs.readFileSync('components/course-scheduler/mockData.ts', 'utf8');

function extractArray(varName) {
  const marker = `export const ${varName}: `;
  const startIdx = content.indexOf(marker);
  if (startIdx === -1) return [];
  const afterMarker = content.substring(startIdx + marker.length);
  const openBracket = afterMarker.indexOf('[');
  if (openBracket === -1) return [];
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
  return JSON.parse(afterMarker.substring(openBracket, endBracket + 1));
}

const teachers = extractArray('INITIAL_TEACHERS');
const classes = extractArray('INITIAL_TEACHING_CLASSES');

let integrityErrors = 0;
// Check if any class has an invalid teacherId
classes.forEach(c => {
  const t = teachers.find(x => x.id === c.teacherId);
  if (!t) {
    console.log(`[INTEGRITY ERROR] Teaching Class "${c.name}" (ID: ${c.id}) has invalid teacherId: "${c.teacherId}"`);
    integrityErrors++;
  }
});

// Check for null or undefined values in teachers and classes
teachers.forEach(t => {
  if (!t.name || t.name === 'undefined' || t.name === 'null') {
    console.log(`[INTEGRITY ERROR] Teacher ID "${t.id}" has invalid name: "${t.name}"`);
    integrityErrors++;
  }
});

console.log('Database Integrity Errors Found:', integrityErrors);
