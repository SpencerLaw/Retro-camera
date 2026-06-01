import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// 1. Read assignments from 2026春各年级分工表（3.1）.xlsx sheet "高二"
const wbAssignments = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
const wsAssignments = wbAssignments.Sheets['高二'];
const assignmentsData = XLSX.utils.sheet_to_json(wsAssignments, { header: 1, defval: '' });

// Parse teachers and classes from assignmentsData
// Row 2 is the header
// Row 3 to 14 contain classes 1 to 12
const teachersList = []; // { name, subject }
const classesList = []; // { id, name, type, combination, adviser, subjectTeachers: { subject: name } }

const subjectCols = [
  { name: '语文', col: 8 },
  { name: '数学', col: 10 },
  { name: '英语', col: 12 },
  { name: '政治', col: 14 },
  { name: '历史', col: 16 },
  { name: '地理', col: 18 },
  { name: '物理', col: 20 },
  { name: '化学', col: 22 },
  { name: '生物', col: 24 },
  { name: '体育', col: 26 },
  { name: '通用', col: 28 },
];

for (let r = 3; r <= 14; r++) {
  const row = assignmentsData[r];
  if (!row || !row[4]) continue;
  
  const classId = row[4];
  const classType = row[5];
  const classCombo = row[6];
  const adviser = row[7];
  
  const classInfo = {
    id: `C${classId.toString().padStart(3, '0')}`,
    classNumber: parseInt(classId),
    name: `高二${classId}班`,
    type: classType,
    combination: classCombo,
    adviser: adviser,
    teachers: {}
  };
  
  subjectCols.forEach(subj => {
    const tName = row[subj.col]?.toString().trim().replace(/\s+/g, '');
    if (tName) {
      classInfo.teachers[subj.name] = tName;
      // Add to unique teachers
      if (!teachersList.some(t => t.name === tName && t.subject === subj.name)) {
        teachersList.push({ name: tName, subject: subj.name });
      }
    }
  });
  
  classesList.push(classInfo);
}

console.log('Unique teachers from assignments:', teachersList.length);
console.log(teachersList);

// 2. Read timetable from 高二课程表3.5.xlsx sheet "3.2定稿"
const wbTimetable = XLSX.readFile('高二课程表3.5.xlsx');
const sheetName = wbTimetable.SheetNames.includes('3.2定稿') ? '3.2定稿' : wbTimetable.SheetNames[0];
const wsTimetable = wbTimetable.Sheets[sheetName];
const timetableData = XLSX.utils.sheet_to_json(wsTimetable, { header: 1, defval: '' });

// Parse cell schedules.
// Days:
// Mon: Cols 1-12 of rows 3-10
// Tue: Cols 14-25 of rows 3-10
// Wed: Cols 27-38 of rows 3-10
// Thu: Cols 1-12 of rows 13-20
// Fri: Cols 14-25 of rows 13-20

const dayMap = [
  { name: '星期一', dayVal: 1, startCol: 1, rows: [3, 10] },
  { name: '星期二', dayVal: 2, startCol: 14, rows: [3, 10] },
  { name: '星期三', dayVal: 3, startCol: 27, rows: [3, 10] },
  { name: '星期四', dayVal: 4, startCol: 1, rows: [13, 20] },
  { name: '星期五', dayVal: 5, startCol: 14, rows: [13, 20] },
];

const rawTimetableItems = []; // { day, period, classNumber, value }

dayMap.forEach(d => {
  const [startRow, endRow] = d.rows;
  for (let r = startRow; r <= endRow; r++) {
    const row = timetableData[r];
    if (!row) continue;
    
    const period = r - startRow + 1; // 1 to 8
    
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

console.log('Total raw timetable cells parsed:', rawTimetableItems.length);

// Analyze timetable abbreviations
const uniqueAbbrevs = [...new Set(rawTimetableItems.map(item => item.value))];
console.log('Unique abbreviations in timetable:', uniqueAbbrevs);

// Let's match abbreviations to teachers.
// Abbreviation format is typically: subjectAbbrev + teacherLastOrFirstName, e.g. "物锐" -> 物理王锐静
// Let's create an automatic mapper.
const subjectAbbrevToName = {
  '语': '语文',
  '数': '数学',
  '英': '英语',
  '物': '物理',
  '化': '化学',
  '生': '生物',
  '政': '政治',
  '史': '历史',
  '地': '地理',
  '体': '体育',
  '通': '通用'
};

const mappedAbbrevs = {};
uniqueAbbrevs.forEach(abbrev => {
  const subjChar = abbrev[0];
  const namePart = abbrev.substring(1);
  const subjName = subjectAbbrevToName[subjChar];
  
  if (subjName) {
    // Find teacher in teachersList of this subject whose name contains the namePart
    const matches = teachersList.filter(t => t.subject === subjName && t.name.includes(namePart));
    if (matches.length === 1) {
      mappedAbbrevs[abbrev] = matches[0];
    } else if (matches.length > 1) {
      console.log(`Multiple matches for ${abbrev}:`, matches);
    } else {
      // Try mapping without subject constraint just in case
      const fuzzyMatches = teachersList.filter(t => t.name.includes(namePart));
      if (fuzzyMatches.length === 1) {
        mappedAbbrevs[abbrev] = fuzzyMatches[0];
      } else {
        console.log(`No match for abbrev: ${abbrev} (${subjName} / ${namePart})`);
      }
    }
  } else {
    // Maybe it's a full name or different format, like "通用" or "体洋" or something
    if (abbrev === '通用') {
      // Find generic teacher? High School Grade 11 generic tech teacher is 谢怡
      mappedAbbrevs[abbrev] = { name: '谢怡', subject: '通用' };
    } else {
      console.log(`Cannot determine subject for abbrev: ${abbrev}`);
    }
  }
});

console.log('Abbreviation mapping count:', Object.keys(mappedAbbrevs).length);
console.log('Mapping results:', mappedAbbrevs);
