import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const fs = require('fs');

// Load assignments workbook
const wbAssignments = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
const grades = ['初一', '初二', '初三', '高一', '高二', '高三'];

const globalTeachers = []; // { id, name, subjects: [], department, phone, email, preferences, grade }
const globalClassrooms = []; // { id, name, type, capacity, assignedSubjects, grade }
const globalTeachingClasses = []; // { id, name, subject, teacherId, classroomId, studentCount, combination, classNumber, grade }
const globalSchedules = []; // { id, teachingClassId, teachingClassName, subject, teacherId, teacherName, classroomId, classroomName, day, period }

let tIdCounter = 1;
let cIdCounter = 1;
let sIdCounter = 1;

// Subject mapping to clean up names and standardize
const subjectCleanName = {
  '语文': '语文',
  '数学': '数学',
  '英语': '英语',
  '政治': '政治',
  '历史': '历史',
  '地理': '地理',
  '物理': '物理',
  '化学': '化学',
  '生物': '生物',
  '体育': '体育',
  '通用': '通用',
  '劳动': '通用',
  '音': '音乐',
  '美': '美术',
  '信息': '信息技术'
};

const teachersMapByName = new Map(); // name -> teacherObject

// Keep track of special classrooms to avoid duplicates
const specialRooms = new Map(); // name -> id
function getSpecialRoomId(name, type) {
  if (specialRooms.has(name)) return specialRooms.get(name);
  const id = `R_SPEC_${specialRooms.size + 1}`;
  specialRooms.set(name, id);
  globalClassrooms.push({
    id: id,
    name: name,
    type: type,
    capacity: 100,
    assignedSubjects: [type === 'art' ? '体育' : '通用']
  });
  return id;
}

// 1. First Pass: Parse all teachers and classes across all grades to build clean lists
const parsedGradesData = {}; // grade -> { classes: [], teachers: [] }

grades.forEach(gradeName => {
  const ws = wbAssignments.Sheets[gradeName];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (data.length < 3) return;
  
  const headerRow = data[2];
  
  // Find key columns
  let classCol = -1;
  let typeCol = -1;
  let adviserCol = -1;
  
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]?.toString().trim();
    if (val === '班级') classCol = c;
    if (val === '分层' || val === '科类') typeCol = c;
    if (val === '班主任') adviserCol = c;
  }
  
  // If classCol or adviserCol not found, look at default column patterns
  if (classCol === -1) classCol = 4;
  if (adviserCol === -1) adviserCol = headerRow.includes('班型') ? 7 : 6;
  
  // Parse subject columns
  // Each subject column is followed by a "节" column
  const subjectFields = [];
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]?.toString().trim();
    const cleanSubj = subjectCleanName[val];
    if (cleanSubj && headerRow[c + 1]?.toString().trim() === '节') {
      subjectFields.push({
        subjectName: cleanSubj,
        nameCol: c,
        periodsCol: c + 1
      });
    }
  }
  
  const classes = [];
  
  // Parse rows (starts from row 3)
  for (let r = 3; r < data.length; r++) {
    const row = data[r];
    if (!row || !row[classCol]) continue;
    
    const classVal = row[classCol]?.toString().trim();
    if (classVal.includes('走班') || classVal === '') continue; // skip walkthrough row
    
    const classNum = parseInt(classVal);
    if (isNaN(classNum)) continue;
    
    const adviser = row[adviserCol]?.toString().trim().replace(/\s+/g, '');
    const classType = typeCol !== -1 ? row[typeCol]?.toString().trim() : '普通班';
    
    const classInfo = {
      grade: gradeName,
      classNumber: classNum,
      name: `${gradeName}${classNum}班`,
      type: classType,
      adviser: adviser,
      teachers: [] // { subject, teacherName, periods }
    };
    
    subjectFields.forEach(field => {
      const tName = row[field.nameCol]?.toString().trim().replace(/\s+/g, '');
      const periodsVal = parseInt(row[field.periodsCol]);
      const periods = isNaN(periodsVal) ? 0 : periodsVal;
      
      if (tName && periods > 0) {
        classInfo.teachers.push({
          subject: field.subjectName,
          teacherName: tName,
          periods: periods
        });
        
        // Add to global teachers
        let tObj = teachersMapByName.get(tName);
        if (!tObj) {
          const id = `T${tIdCounter.toString().padStart(3, '0')}`;
          tIdCounter++;
          tObj = {
            id: id,
            name: tName,
            subjects: new Set(),
            maxWeeklyHours: 16,
            maxDailyHours: 4,
            maxConsecutiveLessons: 2,
            unavailablePeriods: [],
            preferences: `主要负责 ${gradeName} 教学任务`,
            phone: `138${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `${tName.toLowerCase()}@school.edu.cn`,
            department: `${field.subjectName}组`
          };
          teachersMapByName.set(tName, tObj);
          globalTeachers.push(tObj);
        }
        tObj.subjects.add(field.subjectName);
      }
    });
    
    classes.push(classInfo);
  }
  
  parsedGradesData[gradeName] = { classes };
});

// Finalize teachers list subjects set -> array
globalTeachers.forEach(t => {
  t.subjects = Array.from(t.subjects);
});

// 2. Generate Classrooms for all grades
// For each grade, generate ordinary classrooms
grades.forEach(gradeName => {
  const gClasses = parsedGradesData[gradeName]?.classes || [];
  gClasses.forEach(cls => {
    globalClassrooms.push({
      id: `R_${gradeName}_${cls.classNumber}`,
      name: `${gradeName}${cls.classNumber}班普通教室`,
      type: 'ordinary',
      capacity: 50,
      assignedSubjects: ['语文', '数学', '英语', '政治', '历史', '地理', '物理', '化学', '生物', '音乐', '美术', '信息技术']
    });
  });
});

// 3. Generate Teaching Classes for all grades
grades.forEach(gradeName => {
  const gClasses = parsedGradesData[gradeName]?.classes || [];
  gClasses.forEach(cls => {
    const ordinaryRoomId = `R_${gradeName}_${cls.classNumber}`;
    cls.teachers.forEach(tInfo => {
      const teacherObj = teachersMapByName.get(tInfo.teacherName);
      const teacherId = teacherObj ? teacherObj.id : 'T000';
      
      let roomId = ordinaryRoomId;
      if (tInfo.subject === '体育') roomId = getSpecialRoomId('体育场', 'art');
      if (tInfo.subject === '通用') roomId = getSpecialRoomId('通用技术教室', 'lab');
      
      const tcId = `C_${gradeName}_C${cls.classNumber}_${tInfo.subject}`;
      globalTeachingClasses.push({
        id: tcId,
        name: `${cls.name}${tInfo.subject}班`,
        subject: tInfo.subject,
        teacherId: teacherId,
        classroomId: roomId,
        studentCount: 45,
        combination: cls.type || '通用',
        classNumber: cls.classNumber,
        grade: gradeName,
        periods: tInfo.periods // extra property for scheduling helper
      });
    });
  });
});

// 4. Build schedules
// We must separate High School Grade 11 (高二) and others
// FOR 高二: load 100% real schedule from Excel
const wbTimetable = XLSX.readFile('高二课程表3.5.xlsx');
const sheetName = wbTimetable.SheetNames.includes('3.2定稿') ? '3.2定稿' : wbTimetable.SheetNames[0];
const wsTimetable = wbTimetable.Sheets[sheetName];
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

const uniqueAbbrevs = [...new Set(rawTimetableItems.map(item => item.value))];
const abbrevToTeacher = {};

// Helper to find teacher from High School Grade 11
const grade2Teachers = parsedGradesData['高二']?.classes.flatMap(c => c.teachers) || [];
const uniqueGrade2TeacherNames = [...new Set(grade2Teachers.map(t => t.teacherName))];

const singleCharSubjectMap = {
  '语': '语文', '数': '数学', '英': '英语', '物': '物理', '化': '化学', '生': '生物',
  '政': '政治', '史': '历史', '地': '地理', '体': '体育', '音': '音乐', '美': '美术', '信': '信息技术'
};

uniqueAbbrevs.forEach(abbrev => {
  if (abbrev === '通用') {
    abbrevToTeacher[abbrev] = { name: '谢怡', subject: '通用' };
    return;
  }
  if (abbrev === '英程') {
    abbrevToTeacher[abbrev] = { name: '张红旗', subject: '英语' };
    return;
  }
  
  const subjChar = abbrev[0];
  const namePart = abbrev.substring(1);
  const subjName = singleCharSubjectMap[subjChar];
  
  if (subjName) {
    const match = globalTeachers.find(t => 
      uniqueGrade2TeacherNames.includes(t.name) && 
      t.name.includes(namePart) && 
      t.subjects.includes(subjName)
    );
    if (match) {
      abbrevToTeacher[abbrev] = { name: match.name, subject: subjName };
    }
  }
});

// Helper to look up teaching class by classNumber and subject and grade
function findTeachingClass(grade, classNumber, subject) {
  return globalTeachingClasses.find(c => c.grade === grade && c.classNumber === classNumber && c.subject === subject);
}

// Load real schedule for 高二
rawTimetableItems.forEach(item => {
  const abbrevInfo = abbrevToTeacher[item.value];
  if (!abbrevInfo) return;
  
  const subjName = abbrevInfo.subject;
  const tClass = findTeachingClass('高二', item.classNumber, subjName);
  
  if (tClass) {
    const teacher = globalTeachers.find(t => t.id === tClass.teacherId);
    const classroom = globalClassrooms.find(r => r.id === tClass.classroomId);
    
    globalSchedules.push({
      id: `S_ITEM_${sIdCounter}`,
      teachingClassId: tClass.id,
      teachingClassName: tClass.name,
      subject: tClass.subject,
      teacherId: tClass.teacherId,
      teacherName: teacher ? teacher.name : tClass.teacherName,
      classroomId: tClass.classroomId,
      classroomName: classroom ? classroom.name : '未知教室',
      day: item.day,
      period: item.period
    });
    sIdCounter++;
  }
});

// We only load real schedules for 高二, other grades do not have timetable files, so they remain unscheduled to keep data 100% real.
console.log(`Parsed ${globalTeachers.length} unique teachers in total.`);
console.log(`Generated ${globalClassrooms.length} classrooms.`);
console.log(`Generated ${globalTeachingClasses.length} teaching classes.`);
console.log(`Generated ${globalSchedules.length} schedule items.`);

// 5. Students (Excel sheets do not have student rosters, so this must remain empty to keep data 100% real and authentic)
const globalStudents = [];
console.log('No students generated to ensure 100% real data.');

// 6. Write to mockData.ts
const code = `import { Teacher, Classroom, TeachingClass, Student, ScheduleItem } from './types';

export const INITIAL_TEACHERS: Teacher[] = ${JSON.stringify(globalTeachers, null, 2)};

export const INITIAL_CLASSROOMS: Classroom[] = ${JSON.stringify(globalClassrooms, null, 2)};

export const INITIAL_TEACHING_CLASSES: TeachingClass[] = ${JSON.stringify(globalTeachingClasses, null, 2)};

export const INITIAL_STUDENTS: Student[] = ${JSON.stringify(globalStudents, null, 2)};

export function generatePrepopulatedSchedules(
  teachers: Teacher[],
  classrooms: Classroom[],
  classes: TeachingClass[]
): ScheduleItem[] {
  const baseSchedules: ScheduleItem[] = ${JSON.stringify(globalSchedules, null, 2)};
  
  return baseSchedules.map(item => {
    const tc = classes.find(c => c.id === item.teachingClassId);
    if (!tc) return item;
    
    const t = teachers.find(x => x.id === tc.teacherId);
    const r = classrooms.find(x => x.id === tc.classroomId);
    
    return {
      ...item,
      teacherId: tc.teacherId,
      teacherName: t ? t.name : item.teacherName,
      classroomId: tc.classroomId,
      classroomName: r ? r.name : item.classroomName
    };
  });
}
`;

fs.writeFileSync('components/course-scheduler/mockData.ts', code);
console.log('Successfully wrote components/course-scheduler/mockData.ts for ALL GRADES!');
