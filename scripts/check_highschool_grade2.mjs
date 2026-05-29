import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Load assignments
const wbAssignments = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
const ws = wbAssignments.Sheets['高二'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Header Row is row index 2
const headerRow = data[2];
const classCol = headerRow.indexOf('班级');
const adviserCol = headerRow.indexOf('班主任');

// Get all subjects
const subjectFields = [];
const subjectCleanName = {
  '语文': '语文', '数学': '数学', '英语': '英语', '政治': '政治', '历史': '历史', '地理': '地理',
  '物理': '物理', '化学': '化学', '生物': '生物', '体育': '体育', '通用': '通用', '劳动': '通用',
  '音': '音乐', '美': '美术', '信息': '信息技术'
};

const singleCharSubjectMap = {
  '语': '语文', '数': '数学', '英': '英语', '物': '物理', '化': '化学', '生': '生物',
  '政': '政治', '史': '历史', '地': '地理', '体': '体育', '音': '音乐', '美': '美术', '信': '信息技术'
};

for (let c = 0; c < headerRow.length; c++) {
  const val = headerRow[c]?.toString().trim();
  const cleanSubj = subjectCleanName[val];
  if (cleanSubj && headerRow[c + 1]?.toString().trim() === '节') {
    subjectFields.push({ subjectName: cleanSubj, nameCol: c, periodsCol: c + 1 });
  }
}

const g2Teachers = new Set();
for (let r = 3; r < data.length; r++) {
  const row = data[r];
  if (!row || !row[classCol]) continue;
  subjectFields.forEach(field => {
    const tName = row[field.nameCol]?.toString().trim().replace(/\s+/g, '');
    if (tName) g2Teachers.add(tName);
  });
}
const uniqueG2Teachers = Array.from(g2Teachers);
console.log('--- Grade 11 Teachers from Assignments (Total:', uniqueG2Teachers.length, ') ---');
console.log(uniqueG2Teachers.join(', '));

// Load timetable
const wbTimetable = XLSX.readFile('高二课程表3.5.xlsx');
const wsTimetable = wbTimetable.Sheets['3.2定稿'];
const timetableData = XLSX.utils.sheet_to_json(wsTimetable, { header: 1, defval: '' });

const dayMap = [
  { name: '星期一', dayVal: 1, startCol: 1, rows: [3, 10] },
  { name: '星期二', dayVal: 2, startCol: 14, rows: [3, 10] },
  { name: '星期三', dayVal: 3, startCol: 27, rows: [3, 10] },
  { name: '星期四', dayVal: 4, startCol: 1, rows: [13, 20] },
  { name: '星期五', dayVal: 5, startCol: 14, rows: [13, 20] },
];

const rawTimetableItems = [];
dayMap.forEach(d => {
  const [startRow, endRow] = d.rows;
  for (let r = startRow; r <= endRow; r++) {
    const row = timetableData[r];
    if (!row) continue;
    const period = r - startRow + 1;
    for (let cNum = 1; cNum <= 12; cNum++) {
      const colIdx = d.startCol + cNum - 1;
      const cellVal = row[colIdx]?.toString().trim().replace(/\s+/g, '');
      if (cellVal) {
        rawTimetableItems.push({
          day: d.dayVal,
          period: period,
          classNumber: cNum,
          value: cellVal
        });
      }
    }
  }
});

console.log('\nTotal cells read from timetable sheet:', rawTimetableItems.length);

const unmapped = new Set();
const mappedCount = { count: 0 };
rawTimetableItems.forEach(item => {
  const abbrev = item.value;
  if (abbrev === '通用') {
    mappedCount.count++;
    return;
  }
  if (abbrev === '英程') {
    mappedCount.count++;
    return;
  }
  
  const subjChar = abbrev[0];
  const namePart = abbrev.substring(1);
  const subjName = singleCharSubjectMap[subjChar];
  
  if (subjName) {
    const match = uniqueG2Teachers.find(name => name.includes(namePart));
    if (match) {
      mappedCount.count++;
    } else {
      unmapped.add(abbrev);
    }
  } else {
    unmapped.add(abbrev);
  }
});

console.log('Mapped cells:', mappedCount.count);
console.log('Unmapped cell values (Total:', unmapped.size, '):');
console.log(Array.from(unmapped).join(', '));
