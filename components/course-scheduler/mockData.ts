import { Teacher, Classroom, TeachingClass, Student, ScheduleItem } from './types';

export const INITIAL_TEACHERS: Teacher[] = [
  // 语文 (Chinese)
  {
    id: "T001",
    name: "张伟",
    subjects: ["语文"],
    maxWeeklyHours: 16,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [{ day: 1, period: 1 }, { day: 1, period: 2 }], // 周一早晨开会
    preferences: "不排周五下午最后一节课",
    phone: "13812345671",
    email: "zhangwei@school.edu.cn",
    department: "语文组"
  },
  {
    id: "T002",
    name: "王芳",
    subjects: ["语文"],
    maxWeeklyHours: 16,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "偏好上午前两节课",
    phone: "13812345672",
    email: "wangfang@school.edu.cn",
    department: "语文组"
  },
  
  // 数学 (Math)
  {
    id: "T003",
    name: "李娜",
    subjects: ["数学"],
    maxWeeklyHours: 18,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [{ day: 2, period: 3 }, { day: 2, period: 4 }], // 周二上午集体备课
    preferences: "偏好上午课",
    phone: "13812345673",
    email: "lina@school.edu.cn",
    department: "数学组"
  },
  {
    id: "T004",
    name: "刘强",
    subjects: ["数学"],
    maxWeeklyHours: 18,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "无特殊偏好",
    phone: "13812345674",
    email: "liuqiang@school.edu.cn",
    department: "数学组"
  },

  // 英语 (English)
  {
    id: "T005",
    name: "陈杰",
    subjects: ["英语"],
    maxWeeklyHours: 16,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [{ day: 3, period: 5 }, { day: 3, period: 6 }],
    preferences: "下午第一节不排课",
    phone: "13812345675",
    email: "chenjie@school.edu.cn",
    department: "英语组"
  },

  // 物理 (Physics)
  {
    id: "T006",
    name: "赵刚",
    subjects: ["物理"],
    maxWeeklyHours: 14,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "上课时间集中在周一到周四",
    phone: "13812345676",
    email: "zhaogang@school.edu.cn",
    department: "物理组"
  },
  {
    id: "T007",
    name: "孙兵",
    subjects: ["物理"],
    maxWeeklyHours: 12,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [{ day: 4, period: 1 }, { day: 4, period: 2 }],
    preferences: "实验课最好集中在下午",
    phone: "13812345677",
    email: "sunbing@school.edu.cn",
    department: "物理组"
  },

  // 化学 (Chemistry)
  {
    id: "T008",
    name: "周鸣",
    subjects: ["化学"],
    maxWeeklyHours: 14,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "周五请假，周五不排课",
    phone: "13812345678",
    email: "zhouming@school.edu.cn",
    department: "化学组"
  },

  // 生物 (Biology)
  {
    id: "T009",
    name: "吴丽",
    subjects: ["生物"],
    maxWeeklyHours: 14,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "偏好下午课",
    phone: "13812345679",
    email: "wuli@school.edu.cn",
    department: "生物组"
  },

  // 历史 (History)
  {
    id: "T010",
    name: "郑国庆",
    subjects: ["历史"],
    maxWeeklyHours: 14,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "希望平均分布在各天",
    phone: "13812345680",
    email: "zhengguoqing@school.edu.cn",
    department: "历史政治组"
  },

  // 地理 (Geography)
  {
    id: "T011",
    name: "钱建国",
    subjects: ["地理"],
    maxWeeklyHours: 14,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "早上头两节课不排",
    phone: "13812345681",
    email: "qianjianguo@school.edu.cn",
    department: "地理组"
  },

  // 政治 (Politics)
  {
    id: "T012",
    name: "徐静",
    subjects: ["政治"],
    maxWeeklyHours: 12,
    maxDailyHours: 3,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "无特殊偏好",
    phone: "13812345682",
    email: "xujing@school.edu.cn",
    department: "历史政治组"
  },

  // 技术 (Technology / General + Information Technology)
  {
    id: "T013",
    name: "林晓明",
    subjects: ["通用技术", "信息技术"],
    maxWeeklyHours: 16,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "信息技术课必须在机房",
    phone: "13812345683",
    email: "linxiaoming@school.edu.cn",
    department: "信息技术组"
  },

  // 体育/其他
  {
    id: "T014",
    name: "马武胜",
    subjects: ["体育"],
    maxWeeklyHours: 14,
    maxDailyHours: 4,
    maxConsecutiveLessons: 2,
    unavailablePeriods: [],
    preferences: "下午最后两堂课偏好",
    phone: "13812345684",
    email: "mawusheng@school.edu.cn",
    department: "体育组"
  }
];

// Add the default custom leave constraint for周五 for Zhou Ming (周鸣)
INITIAL_TEACHERS[7].unavailablePeriods = [
  { day: 5, period: 1 }, { day: 5, period: 2 }, { day: 5, period: 3 }, { day: 5, period: 4 },
  { day: 5, period: 5 }, { day: 5, period: 6 }, { day: 5, period: 7 }, { day: 5, period: 8 }
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  // 普通大教室 (Ordinary)
  { id: "R101", name: "高一1班普通教室", type: "ordinary", capacity: 50, assignedSubjects: ["语文", "数学", "英语", "历史", "地理", "政治"] },
  { id: "R102", name: "高一2班普通教室", type: "ordinary", capacity: 50, assignedSubjects: ["语文", "数学", "英语", "历史", "地理", "政治"] },
  { id: "R103", name: "高一3班普通教室", type: "ordinary", capacity: 45, assignedSubjects: ["语文", "数学", "英语", "历史", "地理", "政治"] },
  { id: "R201", name: "高二物理教学专用教室", type: "ordinary", capacity: 45, assignedSubjects: ["物理"] },
  { id: "R202", name: "高二化学选修1教室", type: "ordinary", capacity: 40, assignedSubjects: ["化学"] },
  { id: "R203", name: "高二地理走班教室", type: "ordinary", capacity: 45, assignedSubjects: ["地理"] },
  { id: "R204", name: "历史走班教室", type: "ordinary", capacity: 40, assignedSubjects: ["历史"] },

  // 特殊教室 (Specialist Classrooms)
  { id: "R301", name: "物理探究实验室", type: "lab", capacity: 40, assignedSubjects: ["物理"] },
  { id: "R302", name: "化学先进实验室", type: "lab", capacity: 40, assignedSubjects: ["化学"] },
  { id: "R303", name: "数字化通用技术实验室", type: "lab", capacity: 45, assignedSubjects: ["通用技术"] },
  { id: "R401", name: "多媒体网络机房", type: "media", capacity: 60, assignedSubjects: ["信息技术"] },
  { id: "R402", name: "体艺多功能排练厅", type: "art", capacity: 80, assignedSubjects: ["艺术"] }
];

export const INITIAL_TEACHING_CLASSES: TeachingClass[] = [
  // 教学班 - 包含核心 compulsory 行政班/教学班和走班选科教学班 (Student groups)
  // 语文 (Chinese)
  { id: "C001", name: "高一语文必修1班", subject: "语文", teacherId: "T001", classroomId: "R101", studentCount: 45, combination: "通用" },
  { id: "C002", name: "高一语文必修2班", subject: "语文", teacherId: "T002", classroomId: "R102", studentCount: 48, combination: "通用" },

  // 数学 (Math)
  { id: "C003", name: "高一数学必修1班", subject: "数学", teacherId: "T003", classroomId: "R101", studentCount: 45, combination: "通用" },
  { id: "C004", name: "高一数学必修2班", subject: "数学", teacherId: "T004", classroomId: "R102", studentCount: 48, combination: "通用" },

  // 选考走班级组 (Electives for Grade 11-12 Gaokao)
  // 物理教学班 (Physics - 走班)
  { id: "C005", name: "高二物理选考1班 (物化生)", subject: "物理", teacherId: "T006", classroomId: "R201", studentCount: 42, combination: "物化生" },
  { id: "C006", name: "高二物理选考2班 (物化地)", subject: "物理", teacherId: "T007", classroomId: "R301", studentCount: 38, combination: "物化地" },

  // 化学教学班 (Chemistry - 走班)
  { id: "C007", name: "高二化学选考1班 (物化生)", subject: "化学", teacherId: "T008", classroomId: "R202", studentCount: 42, combination: "物化生" },
  { id: "C008", name: "高二化学选考2班 (史化地)", subject: "化学", teacherId: "T008", classroomId: "R302", studentCount: 35, combination: "史化地" },

  // 历史/地理/技术 (走班)
  { id: "C009", name: "高二历史选考1班 (史化地)", subject: "历史", teacherId: "T010", classroomId: "R204", studentCount: 35, combination: "史化地" },
  { id: "C010", name: "高二地理选考1班 (物化地)", subject: "地理", teacherId: "T011", classroomId: "R203", studentCount: 38, combination: "物化地" },
  { id: "C011", name: "高二生物选考1班 (物化生)", subject: "生物", teacherId: "T009", classroomId: "R103", studentCount: 42, combination: "物化生" },

  // 技术 (技术走班：通常在前期考试前，之后会快速调整)
  { id: "C012", name: "高一信息技术1班", subject: "信息技术", teacherId: "T013", classroomId: "R401", studentCount: 50, combination: "信息技术" },
  { id: "C013", name: "高一通用技术1班", subject: "通用技术", teacherId: "T013", classroomId: "R303", studentCount: 45, combination: "通用技术" },

  // 体育
  { id: "C014", name: "高一体育1班", subject: "体育", teacherId: "T014", classroomId: "R101", studentCount: 45, combination: "通用" }
];

export const INITIAL_STUDENTS: Student[] = [
  { id: "S001", name: "林子涵", electiveCombo: "物化生", classes: ["C001", "C003", "C005", "C007", "C011", "C014"] },
  { id: "S002", name: "欧阳雨欣", electiveCombo: "物化地", classes: ["C001", "C003", "C006", "C007", "C010", "C014"] },
  { id: "S003", name: "陈子豪", electiveCombo: "史化地", classes: ["C002", "C004", "C008", "C009", "C010", "C014"] },
  { id: "S004", name: "邓文博", electiveCombo: "物化生", classes: ["C001", "C003", "C005", "C007", "C011", "C014"] },
  { id: "S005", name: "许诗蕾", electiveCombo: "物化地", classes: ["C002", "C004", "C006", "C007", "C010", "C014"] }
];

// Generates an initial realistic timetable that satisfies base constraints so that the app opens fully populated.
export function generatePrepopulatedSchedules(teachers: Teacher[], classrooms: Classroom[], classes: TeachingClass[]): ScheduleItem[] {
  const schedule: ScheduleItem[] = [];
  
  // High school week periods: 1 to 8. Mondays to Fridays.
  // Set up logical fixed mapping to avoid overlap
  const classSchedules: { [classId: string]: { day: number; period: number }[] } = {
    // Chinese Compulsory 1 (C001) - Mon 1,2; Wed 3,4; Fri 1
    C001: [
      { day: 1, period: 3 }, { day: 1, period: 4 }, // Mon late morning
      { day: 3, period: 1 }, { day: 3, period: 2 }, // Wed early morning
      { day: 5, period: 3 }
    ],
    // Chinese Compulsory 2 (C002) - Mon 3,4; Wed 1,2; Fri 2
    C002: [
      { day: 1, period: 1 }, { day: 1, period: 2 }, // Mon early morning
      { day: 3, period: 3 }, { day: 3, period: 4 }, // Wed late morning
      { day: 5, period: 4 }
    ],
    // Math Compulsory 1 (C003) - Tue 1,2; Thu 3,4; Fri 2
    C003: [
      { day: 2, period: 1 }, { day: 2, period: 2 },
      { day: 4, period: 3 }, { day: 4, period: 4 },
      { day: 5, period: 1 }
    ],
    // Math Compulsory 2 (C004) - Tue 3,4; Thu 1,2; Fri 1
    C004: [
      { day: 2, period: 5 }, { day: 2, period: 6 },
      { day: 4, period: 1 }, { day: 4, period: 2 },
      { day: 5, period: 2 }
    ],

    // Elective Physics 1 (C005) (物化生 combo) - Mon 5,6; Wed 5
    C005: [
      { day: 1, period: 5 }, { day: 1, period: 6 },
      { day: 3, period: 5 }
    ],
    // Elective Physics 2 (C006) (物化地 combo) - Mon 7,8; Wed 6
    C006: [
      { day: 1, period: 7 }, { day: 1, period: 8 },
      { day: 3, period: 6 }
    ],

    // Elective Chem 1 (C007) - Tue 5,6; Thu 5
    C007: [
      { day: 2, period: 5 }, { day: 2, period: 6 },
      { day: 4, period: 5 }
    ],
    // Elective Chem 2 (C008) - Tue 7,8; Thu 6
    C008: [
      { day: 2, period: 7 }, { day: 2, period: 8 },
      { day: 4, period: 6 }
    ],

    // History 1 (C009) - Mon 5,6; Wed 7
    C009: [
      { day: 1, period: 5 }, { day: 1, period: 6 },
      { day: 3, period: 7 }
    ],
    // Geography 1 (C010) - Tue 1,2; Thu 7
    C010: [
      { day: 2, period: 1 }, { day: 2, period: 2 },
      { day: 4, period: 7 }
    ],
    // Biology 1 (C011) - Tue 3,4; Thu 8
    C011: [
      { day: 2, period: 3 }, { day: 2, period: 4 },
      { day: 4, period: 8 }
    ],

    // Tech skills: General Tech (C013) - Wed 7,8
    C013: [
      { day: 3, period: 7 }, { day: 3, period: 8 }
    ],
    // Info Tech (C012) - Thu 1,2
    C012: [
      { day: 5, period: 5 }, { day: 5, period: 6 }
    ],

    // Physical Education (C014) - Fri 7,8
    C014: [
      { day: 5, period: 7 }, { day: 5, period: 8 }
    ]
  };

  let counter = 1;
  for (const c of classes) {
    const slots = classSchedules[c.id] || [];
    const teacher = teachers.find(t => t.id === c.teacherId);
    const classroom = classrooms.find(r => r.id === c.classroomId);

    for (const s of slots) {
      schedule.push({
        id: `S_ITEM_${counter++}`,
        teachingClassId: c.id,
        teachingClassName: c.name,
        subject: c.subject,
        teacherId: c.teacherId,
        teacherName: teacher ? teacher.name : "未知教师",
        classroomId: c.classroomId,
        classroomName: classroom ? classroom.name : "未知教室",
        day: s.day,
        period: s.period
      });
    }
  }

  return schedule;
}
