import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const fs = require('fs');

// 1. Read assignments from 2026春各年级分工表（3.1）.xlsx sheet "高二"
const wbAssignments = XLSX.readFile('2026春各年级分工表（3.1）.xlsx');
const wsAssignments = wbAssignments.Sheets['高二'];
const assignmentsData = XLSX.utils.sheet_to_json(wsAssignments, { header: 1, defval: '' });

// Parse teachers and classes from assignmentsData
const teachersList = []; // { name, subject }
const classesList = []; // { classNumber, name, type, combination, adviser, teachers: { subject: name } }

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
    classNumber: parseInt(classId),
    name: `高二${classId}班`,
    type: classType,
    combination: classCombo,
    adviser: adviser,
    teachers: {}
  };
  
  subjectCols.forEach(subj => {
    let tName = row[subj.col]?.toString().trim().replace(/\s+/g, '');
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

// 2. Map abbreviations from timetable
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

const uniqueAbbrevs = [...new Set(rawTimetableItems.map(item => item.value))];
const abbrevToTeacher = {};

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
  const subjName = subjectAbbrevToName[subjChar];
  
  if (subjName) {
    const match = teachersList.find(t => t.subject === subjName && t.name.includes(namePart));
    if (match) {
      abbrevToTeacher[abbrev] = match;
    } else {
      const fallbackMatch = teachersList.find(t => t.name.includes(namePart));
      if (fallbackMatch) {
        abbrevToTeacher[abbrev] = fallbackMatch;
      }
    }
  }
});

// Construct teachers list with proper IDs
// Group by subject to assign sequential IDs e.g. T001, T002...
const subjectOrder = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '体育', '通用'];
const finalTeachers = [];
let tIdCounter = 1;

subjectOrder.forEach(subj => {
  const tList = teachersList.filter(t => t.subject === subj);
  tList.forEach(t => {
    const id = `T${tIdCounter.toString().padStart(3, '0')}`;
    tIdCounter++;
    
    // Check if adviser
    const isAdviser = classesList.some(c => c.adviser === t.name);
    const advisoryClass = classesList.find(c => c.adviser === t.name)?.classNumber;
    
    finalTeachers.push({
      id: id,
      name: t.name,
      subjects: [t.subject],
      maxWeeklyHours: subj === '数学' || subj === '语文' || subj === '英语' ? 16 : 14,
      maxDailyHours: 4,
      maxConsecutiveLessons: 2,
      unavailablePeriods: [],
      preferences: isAdviser ? `担任高二${advisoryClass}班班主任` : '无特殊偏好',
      phone: `138${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `${t.name.toLowerCase()}@school.edu.cn`,
      department: `${subj}组`
    });
  });
});

// Get teacher ID by name
function getTeacherId(name) {
  const t = finalTeachers.find(x => x.name === name);
  return t ? t.id : 'T000';
}

// 3. Construct classrooms
const finalClassrooms = [];
for (let cNum = 1; cNum <= 12; cNum++) {
  finalClassrooms.push({
    id: `R${cNum.toString().padStart(3, '0')}`,
    name: `高二${cNum}班普通教室`,
    type: 'ordinary',
    capacity: 50,
    assignedSubjects: ['语文', '数学', '英语', '政治', '历史', '地理', '物理', '化学', '生物']
  });
}
// Special classrooms
finalClassrooms.push({
  id: 'R_GYM',
  name: '体育场',
  type: 'art',
  capacity: 100,
  assignedSubjects: ['体育']
});
finalClassrooms.push({
  id: 'R_LAB_GEN',
  name: '通用技术教室',
  type: 'lab',
  capacity: 50,
  assignedSubjects: ['通用']
});

// 4. Construct teaching classes
const finalTeachingClasses = [];
let cIdCounter = 1;

classesList.forEach(cls => {
  const classRoomId = `R${cls.classNumber.toString().padStart(3, '0')}`;
  
  Object.entries(cls.teachers).forEach(([subject, teacherName]) => {
    const id = `C${cIdCounter.toString().padStart(3, '0')}`;
    cIdCounter++;
    
    let classroomId = classRoomId;
    if (subject === '体育') classroomId = 'R_GYM';
    if (subject === '通用') classroomId = 'R_LAB_GEN';
    
    finalTeachingClasses.push({
      id: id,
      name: `${cls.name}${subject}班`,
      subject: subject,
      teacherId: getTeacherId(teacherName),
      classroomId: classroomId,
      studentCount: 45,
      combination: cls.combination,
      classNumber: cls.classNumber // extra property to make lookup easy
    });
  });
});

// Helper to look up teaching class by classNumber and subject
function findTeachingClass(classNumber, subject) {
  return finalTeachingClasses.find(c => c.classNumber === classNumber && c.subject === subject);
}

// 5. Construct prepopulated schedules based on real timetable cell values
const finalSchedules = [];
let sIdCounter = 1;

rawTimetableItems.forEach(item => {
  const abbrevInfo = abbrevToTeacher[item.value];
  if (!abbrevInfo) {
    console.log(`Warning: Unresolved abbreviation in cell: ${item.value}`);
    return;
  }
  
  const subjName = abbrevInfo.subject;
  const tClass = findTeachingClass(item.classNumber, subjName);
  
  if (tClass) {
    const teacher = finalTeachers.find(t => t.id === tClass.teacherId);
    const classroom = finalClassrooms.find(r => r.id === tClass.classroomId);
    
    finalSchedules.push({
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
  } else {
    console.log(`Warning: Teaching class not found for Class ${item.classNumber} and Subject ${subjName}`);
  }
});

console.log(`Constructed ${finalTeachers.length} teachers`);
console.log(`Constructed ${finalClassrooms.length} classrooms`);
console.log(`Constructed ${finalTeachingClasses.length} teaching classes`);
console.log(`Constructed ${finalSchedules.length} prepopulated schedules`);

// 6. Generate students
const studentNames = [
  '林子涵', '欧阳雨欣', '陈子豪', '邓文博', '许诗蕾', '张明轩', '李雨婷', '王晨阳', '赵雪涵', '刘建国',
  '孙雅琪', '杨智勇', '吴佩慈', '郭旭东', '马嘉祺', '朱晓萌', '胡若飞', '高睿捷', '梁爽', '徐铭泽'
];

const finalStudents = studentNames.map((name, idx) => {
  const classNum = (idx % 12) + 1; // Distribute students into 12 classes
  const cls = classesList.find(c => c.classNumber === classNum);
  const classIdPrefix = `C${classNum.toString().padStart(3, '0')}`;
  
  // Find all teaching classes for this student's class
  const studentClasses = finalTeachingClasses
    .filter(c => c.classNumber === classNum)
    .map(c => c.id);
    
  return {
    id: `S${(idx + 1).toString().padStart(3, '0')}`,
    name: name,
    electiveCombo: cls ? cls.combination : '通用',
    classes: studentClasses
  };
});

// 7. Write to mockData.ts
const code = `import { Teacher, Classroom, TeachingClass, Student, ScheduleItem } from './types';

export const INITIAL_TEACHERS: Teacher[] = ${JSON.stringify(finalTeachers, null, 2)};

export const INITIAL_CLASSROOMS: Classroom[] = ${JSON.stringify(finalClassrooms, null, 2)};

export const INITIAL_TEACHING_CLASSES: TeachingClass[] = ${JSON.stringify(finalTeachingClasses, null, 2)};

export const INITIAL_STUDENTS: Student[] = ${JSON.stringify(finalStudents, null, 2)};

export function generatePrepopulatedSchedules(
  teachers: Teacher[],
  classrooms: Classroom[],
  classes: TeachingClass[]
): ScheduleItem[] {
  // Pre-populated with the actual 3.2 real-world timetable data
  const baseSchedules: ScheduleItem[] = ${JSON.stringify(finalSchedules, null, 2)};
  
  // Dynamically map name / details if the entities change, to maintain consistency
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
console.log('Successfully wrote components/course-scheduler/mockData.ts!');
