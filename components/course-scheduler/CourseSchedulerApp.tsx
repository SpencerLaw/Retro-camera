import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  Clock, 
  User, 
  X,
  Plus,
  Activity,
  Database,
  RotateCcw,
  MessageSquareText
} from 'lucide-react';
import { 
  Role, 
  Teacher, 
  Classroom, 
  TeachingClass, 
  Student, 
  ScheduleItem, 
  Conflict, 
  SchedulingPreferences,
  PreferenceDiagnostic,
  SubstituteRecommendation 
} from './types';
import { detectConflicts, getSubstituteRecommendations } from './courseSchedulerLogic';
import {
  createDefaultSchedulingPreferences,
  normalizeSchedulingPreferences,
  detectPreferenceDiagnostics
} from './courseSchedulerPreferences';
import { buildDataAuditReport } from './courseSchedulerDataAudit';
import { 
  INITIAL_TEACHERS, 
  INITIAL_CLASSROOMS, 
  INITIAL_TEACHING_CLASSES, 
  INITIAL_STUDENTS, 
  generatePrepopulatedSchedules,
  EXCEL_DATASET_ID,
  EXCEL_DATA_SOURCES,
  EXCEL_DATA_LIMITATIONS,
  EXCEL_TIMETABLE_ABBREVIATION_AUDIT,
  EXCEL_PERIOD_MISMATCH_AUDIT
} from './excelData';
import './CourseSchedulerStyles.css';

// Days mapping
const DAYS = [
  { num: 1, name: "周一", engName: "MON" },
  { num: 2, name: "周二", engName: "TUE" },
  { num: 3, name: "周三", engName: "WED" },
  { num: 4, name: "周四", engName: "THU" },
  { num: 5, name: "周五", engName: "FRI" }
];

// Hour sections mapping with spacers indices
const PERIODS_METADATA = [
  { type: 'period', num: 1, name: "第一节", time: "08:00 - 08:40" },
  { type: 'period', num: 2, name: "第二节", time: "08:50 - 09:30" },
  { type: 'break', num: 0, name: "大课间", time: "09:30 - 10:10" },
  { type: 'period', num: 3, name: "第三节", time: "10:10 - 10:50" },
  { type: 'period', num: 4, name: "第四节", time: "11:00 - 11:40" },
  { type: 'lunch', num: 0, name: "午休时段", time: "11:40 - 14:00" },
  { type: 'period', num: 5, name: "第五节", time: "14:00 - 14:40" },
  { type: 'period', num: 6, name: "第六节", time: "14:50 - 15:30" },
  { type: 'period', num: 7, name: "第七节", time: "15:40 - 16:20" },
  { type: 'period', num: 8, name: "第八节", time: "16:30 - 17:10" },
];

const getPeriodScrollbarClass = (periodNum: number) => {
  if (periodNum <= 2) return 'period-scrollbar-morning-early';
  if (periodNum <= 4) return 'period-scrollbar-morning-late';
  if (periodNum <= 6) return 'period-scrollbar-afternoon-early';
  return 'period-scrollbar-afternoon-late';
};

const getPeriodModuleClass = (periodNum: number) => {
  if (periodNum <= 2) return 'period-module-morning-early';
  if (periodNum <= 4) return 'period-module-morning-late';
  if (periodNum <= 6) return 'period-module-afternoon-early';
  return 'period-module-afternoon-late';
};

const isPeriodModuleStart = (periodNum: number) => [1, 3, 5, 7].includes(periodNum);
const isPeriodModuleEnd = (periodNum: number) => [2, 4, 6, 8].includes(periodNum);
const PERIOD_MODULES = [
  { id: 'morning-early', title: '第一节 / 第二节', subtitle: '上午第一段', periodNums: [1, 2], className: getPeriodModuleClass(1) },
  { id: 'morning-late', title: '第三节 / 第四节', subtitle: '上午第二段', periodNums: [3, 4], className: getPeriodModuleClass(3) },
  { id: 'afternoon-early', title: '第五节 / 第六节', subtitle: '下午第一段', periodNums: [5, 6], className: getPeriodModuleClass(5) },
  { id: 'afternoon-late', title: '第七节 / 第八节', subtitle: '下午第二段', periodNums: [7, 8], className: getPeriodModuleClass(7) }
];
const TIMETABLE_BLOCKS = [
  { type: 'module', module: PERIOD_MODULES[0] },
  { type: 'break', meta: PERIODS_METADATA[2] },
  { type: 'module', module: PERIOD_MODULES[1] },
  { type: 'lunch', meta: PERIODS_METADATA[5] },
  { type: 'module', module: PERIOD_MODULES[2] },
  { type: 'module', module: PERIOD_MODULES[3] }
] as const;
const SUBSTITUTE_REASON_OPTIONS = ['临时有事请假', '教研活动', '外出培训', '病假', '会议冲突', '走班临调'];
const subjectHueMap: Record<string, number> = {
  '语文': 358,
  '数学': 146,
  '英语': 55,
  '物理': 196,
  '化学': 8,
  '生物': 122,
  '历史': 42,
  '地理': 210,
  '政治': 218,
  '通用': 88,
  '信息技术': 202,
  '音乐': 326,
  '美术': 48,
  '体育': 96
};
const subjectBriefNameMap: Record<string, string> = {
  '语文': '语',
  '数学': '数',
  '英语': '英',
  '物理': '物',
  '化学': '化',
  '生物': '生',
  '历史': '史',
  '地理': '地',
  '政治': '政',
  '通用': '通',
  '信息技术': '信',
  '音乐': '音',
  '美术': '美',
  '体育': '体'
};

type PendingSubstituteConfirm = {
  scheduleId: string;
  teachingClassName: string;
  subject: string;
  classroomName: string;
  day: number;
  period: number;
  periodTimeLabel: string;
  rootOriginalTeacherId: string;
  rootOriginalTeacherName: string;
  fromTeacherId: string;
  fromTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  reason: string;
  summary: string;
};

export default function App() {
  // Application Data States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [schedulingPreferences, setSchedulingPreferences] = useState<SchedulingPreferences>(createDefaultSchedulingPreferences());
  const [preferenceDiagnostics, setPreferenceDiagnostics] = useState<PreferenceDiagnostic[]>([]);
  
  // Loading & View Controls
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'board' | 'management'>('board');
  const [boardDisplayMode, setBoardDisplayMode] = useState<'time' | 'class' | 'dayCards'>('time');
  const [expandedDayCard, setExpandedDayCard] = useState<number>(1);
  const [isTabLayoutPinned, setIsTabLayoutPinned] = useState<boolean>(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('高二');
  const [mgmtSubTab, setMgmtSubTab] = useState<'teachers' | 'assignments' | 'students' | 'audit' | 'preferences'>('teachers');

  // Base Data Edit States
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Filter states for Schedule Grid
  const [combinationFilter, setCombinationFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dataAuditSearchTerm, setDataAuditSearchTerm] = useState<string>('');
  const [dataAuditMappingStatusFilter, setDataAuditMappingStatusFilter] = useState<string>('all');
  const [dataAuditClassNumberFilter, setDataAuditClassNumberFilter] = useState<string>('all');
  
  // Interactive Cell States
  const [selectedCell, setSelectedCell] = useState<ScheduleItem | null>(null);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);
  const [substituteData, setSubstituteData] = useState<{ item: ScheduleItem; recommendations: SubstituteRecommendation[] } | null>(null);
  const [substituteReason, setSubstituteReason] = useState<string>('临时有事请假');
  const [substituteReasonDetail, setSubstituteReasonDetail] = useState<string>('');
  const [pendingSubstituteConfirm, setPendingSubstituteConfirm] = useState<PendingSubstituteConfirm | null>(null);
  
  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [showAddClassroomModal, setShowAddClassroomModal] = useState<boolean>(false);
  const [showSubstituteDialog, setShowSubstituteDialog] = useState<boolean>(false);
  const [showJSONModal, setShowJSONModal] = useState<boolean>(false);
  const [showConflictsModal, setShowConflictsModal] = useState<boolean>(false);
  const [showRemarksModal, setShowRemarksModal] = useState<boolean>(false);
  const [jsonRawText, setJsonRawText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  
  // Modals Form Data
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('语文');
  const [newTeacherWeeklyHours, setNewTeacherWeeklyHours] = useState(0);
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('综合组');

  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomType, setNewClassroomType] = useState<'ordinary'|'lab'|'media'>('ordinary');
  const [newClassroomCapacity, setNewClassroomCapacity] = useState(45);
  const [newClassroomSubject, setNewClassroomSubject] = useState('物理');

  const updatePreferenceDiagnostics = (
    currentSchedules: ScheduleItem[],
    currentTeachers: Teacher[],
    currentClasses: TeachingClass[],
    currentPreferences: SchedulingPreferences
  ) => {
    setPreferenceDiagnostics(detectPreferenceDiagnostics(
      currentSchedules,
      currentTeachers,
      currentClasses,
      currentPreferences
    ));
  };

  const createExcelDataSourceSnapshot = () => ({
    module: 'excelData',
    datasetId: EXCEL_DATASET_ID,
    sources: EXCEL_DATA_SOURCES,
    limitations: EXCEL_DATA_LIMITATIONS,
  });

  const isTrustedExcelSavedData = (value: any) => (
    value?.dataSource?.module === 'excelData' &&
    value?.dataSource?.datasetId === EXCEL_DATASET_ID
  );

  // Load defaults or saved states
  const fetchData = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const savedData = localStorage.getItem('course_scheduler_real_data');
      const parsedSavedData = savedData ? JSON.parse(savedData) : null;
      if (
        parsedSavedData &&
        isTrustedExcelSavedData(parsedSavedData) &&
        parsedSavedData.teachers?.length >= 100 &&
        parsedSavedData.schedules?.length >= 400
      ) {
        const parsed = parsedSavedData;
        const parsedTeachers = parsed.teachers || [];
        const parsedClassrooms = parsed.classrooms || [];
        const parsedTeachingClasses = parsed.teachingClasses || [];
        const parsedStudents = parsed.students || [];
        const parsedSchedules = parsed.schedules || [];
        const parsedSchedulingPreferences = normalizeSchedulingPreferences(parsed.schedulingPreferences);

        setTeachers(parsedTeachers);
        setClassrooms(parsedClassrooms);
        setTeachingClasses(parsedTeachingClasses);
        setStudents(parsedStudents);
        setSchedules(parsedSchedules);
        setSchedulingPreferences(parsedSchedulingPreferences);
        
        const initialConflicts = detectConflicts(
          parsedSchedules, 
          parsedTeachers, 
          parsedClassrooms, 
          parsedTeachingClasses, 
          parsedStudents, 
          { hardStudentConflict: true, hardTeacherConflict: true, hardClassroomConflict: true, allowTeacherPrefRelaxation: false, allowClassroomLoadRelaxation: false }
        );
        setConflicts(initialConflicts);
        updatePreferenceDiagnostics(parsedSchedules, parsedTeachers, parsedTeachingClasses, parsedSchedulingPreferences);
      } else {
        const initialTeachers = JSON.parse(JSON.stringify(INITIAL_TEACHERS));
        const initialClassrooms = JSON.parse(JSON.stringify(INITIAL_CLASSROOMS));
        const initialTeachingClasses = JSON.parse(JSON.stringify(INITIAL_TEACHING_CLASSES));
        const initialStudents = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
        const initialSchedules = generatePrepopulatedSchedules(initialTeachers, initialClassrooms, initialTeachingClasses);
        const initialSchedulingPreferences = createDefaultSchedulingPreferences();

        setTeachers(initialTeachers);
        setClassrooms(initialClassrooms);
        setTeachingClasses(initialTeachingClasses);
        setStudents(initialStudents);
        setSchedules(initialSchedules);
        setSchedulingPreferences(initialSchedulingPreferences);
        
        const initialConflicts = detectConflicts(
          initialSchedules, 
          initialTeachers, 
          initialClassrooms, 
          initialTeachingClasses, 
          initialStudents, 
          { hardStudentConflict: true, hardTeacherConflict: true, hardClassroomConflict: true, allowTeacherPrefRelaxation: false, allowClassroomLoadRelaxation: false }
        );
        setConflicts(initialConflicts);
        updatePreferenceDiagnostics(initialSchedules, initialTeachers, initialTeachingClasses, initialSchedulingPreferences);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      updatePreferenceDiagnostics(schedules, teachers, teachingClasses, schedulingPreferences);
    }
  }, [schedules, teachers, teachingClasses, schedulingPreferences, loading]);

  // Save to localStorage when state changes
  useEffect(() => {
    if (!loading && teachers.length > 0) {
      const dataToSave = {
        dataSource: createExcelDataSourceSnapshot(),
        teachers,
        classrooms,
        teachingClasses,
        students,
        schedules,
        schedulingPreferences
      };
      localStorage.setItem('course_scheduler_real_data', JSON.stringify(dataToSave));
    }
  }, [teachers, classrooms, teachingClasses, students, schedules, schedulingPreferences, loading]);

  const updateConflicts = (
    currentSchedules: ScheduleItem[],
    currentTeachers: Teacher[],
    currentClassrooms: Classroom[],
    currentClasses: TeachingClass[],
    currentStudents: Student[]
  ) => {
    const newConflicts = detectConflicts(
      currentSchedules,
      currentTeachers,
      currentClassrooms,
      currentClasses,
      currentStudents,
      { hardStudentConflict: true, hardTeacherConflict: true, hardClassroomConflict: true, allowTeacherPrefRelaxation: false, allowClassroomLoadRelaxation: false }
    );
    setConflicts(newConflicts);
    updatePreferenceDiagnostics(currentSchedules, currentTeachers, currentClasses, schedulingPreferences);
  };

  const handleResetData = async () => {
    if (window.confirm("确定要重置排课底座数据吗？所有手动做出的代课、偏好修改都将被还原。")) {
      try {
        setLoading(true);
        localStorage.removeItem('course_scheduler_real_data');
        const initialTeachers = JSON.parse(JSON.stringify(INITIAL_TEACHERS));
        const initialClassrooms = JSON.parse(JSON.stringify(INITIAL_CLASSROOMS));
        const initialTeachingClasses = JSON.parse(JSON.stringify(INITIAL_TEACHING_CLASSES));
        const initialStudents = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
        const initialSchedules = generatePrepopulatedSchedules(initialTeachers, initialClassrooms, initialTeachingClasses);
        const initialSchedulingPreferences = createDefaultSchedulingPreferences();

        setTeachers(initialTeachers);
        setClassrooms(initialClassrooms);
        setTeachingClasses(initialTeachingClasses);
        setStudents(initialStudents);
        setSchedules(initialSchedules);
        setSchedulingPreferences(initialSchedulingPreferences);
        setSelectedCell(null);
        setSubstituteData(null);
        setShowSubstituteDialog(false);
        
        updateConflicts(initialSchedules, initialTeachers, initialClassrooms, initialTeachingClasses, initialStudents);
        updatePreferenceDiagnostics(initialSchedules, initialTeachers, initialTeachingClasses, initialSchedulingPreferences);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSchedulerScroll = (event: React.UIEvent<HTMLElement>) => {
    const nextPinned = event.currentTarget.scrollTop > 24;
    setIsTabLayoutPinned(current => current === nextPinned ? current : nextPinned);
  };

  const handleViewTabChange = (tab: 'board' | 'management') => {
    setActiveTab(tab);
    setIsTabLayoutPinned(false);
  };

  const handleOpenJSONModal = () => {
    setJsonError('');
    const exportData = {
      dataSource: createExcelDataSourceSnapshot(),
      teachers,
      classrooms,
      teachingClasses,
      students,
      schedules,
      schedulingPreferences
    };
    setJsonRawText(JSON.stringify(exportData, null, 2));
    setShowJSONModal(true);
  };

  const handleJSONImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonRawText);
      if (!parsed.teachers || !parsed.classrooms || !parsed.teachingClasses || !parsed.schedules) {
        throw new Error("JSON数据结构不规范！缺少必要的 'teachers', 'classrooms', 'teachingClasses' 或 'schedules' 字段。");
      }
      if (!isTrustedExcelSavedData(parsed)) {
        throw new Error("JSON缺少当前真实 Excel 数据来源标记，请先从本系统导出带 dataSource 的 JSON，避免导入旧版模拟/伪造数据。");
      }
      
      setTeachers(parsed.teachers);
      setClassrooms(parsed.classrooms);
      setTeachingClasses(parsed.teachingClasses);
      setStudents(parsed.students || []);
      setSchedules(parsed.schedules);
      const importedSchedulingPreferences = normalizeSchedulingPreferences(parsed.schedulingPreferences);
      setSchedulingPreferences(importedSchedulingPreferences);
      
      updateConflicts(
        parsed.schedules,
        parsed.teachers,
        parsed.classrooms,
        parsed.teachingClasses,
        parsed.students || []
      );
      updatePreferenceDiagnostics(parsed.schedules, parsed.teachers, parsed.teachingClasses, importedSchedulingPreferences);
      
      setShowJSONModal(false);
      alert("🎉 JSON 备份数据覆盖导入成功！课表网格与冲突诊断已实时调度热更新。");
    } catch (err: any) {
      setJsonError(`解析/导入出现错误: ${err.message}`);
    }
  };

  const handleClearAllCache = () => {
    if (window.confirm("⚠️ 警告：确定要清空浏览器中缓存的所有排课和教师修改吗？该操作将完全清除包括旧版本在内的所有本地缓存数据，并自动刷新页面载入 100% 干净的初始 Excel 静态底座。")) {
      localStorage.removeItem('course_scheduler_real_data');
      localStorage.removeItem('course_scheduler_data');
      alert("🗑️ 本地缓存清除完毕，页面即将刷新...");
      window.location.reload();
    }
  };

  // Grade-filtered core datasets for unified filtering across components
  const getGradeTeachingClasses = () => teachingClasses.filter(tc => tc.grade === selectedGrade);
  const getGradeTeacherIds = () => new Set(getGradeTeachingClasses().map(tc => tc.teacherId));
  const getGradeTeachers = () => teachers.filter(t => getGradeTeacherIds().has(t.id));
  const getGradeClassrooms = () => classrooms.filter(c => c.name.startsWith(selectedGrade) || c.id.startsWith('R_SPEC_'));
  const getGradeStudents = () => students.filter(s => s.classes.some(cId => {
    const tc = teachingClasses.find(x => x.id === cId);
    return tc && tc.grade === selectedGrade;
  }));

  const getAdviserName = (grade: string, classNum: number) => {
    const teacher = teachers.find(t => t.preferences?.includes('担任' + grade + classNum + '班班主任'));
    return teacher ? teacher.name : '未设定';
  };

  // Retrieve active schedule cell list for grid mapping
  const getSchedulesForSlot = (day: number, period: number) => {
    return schedules.filter(s => s.day === day && s.period === period && s.teachingClassName.startsWith(selectedGrade));
  };

  // Helper filters application for Middle column grid
  const getFilteredSchedules = (day: number, period: number) => {
    let list = getSchedulesForSlot(day, period);

    if (combinationFilter !== 'all') {
      list = list.filter(item => {
        const tc = teachingClasses.find(c => c.id === item.teachingClassId);
        return tc && tc.combination === combinationFilter;
      });
    }

    if (teacherFilter !== 'all') {
      list = list.filter(item => item.teacherId === teacherFilter);
    }

    if (classroomFilter !== 'all') {
      list = list.filter(item => item.classroomId === classroomFilter);
    }

    if (subjectFilter !== 'all') {
      list = list.filter(item => item.subject === subjectFilter);
    }

    return list;
  };

  const getScheduleClassNumber = (item: ScheduleItem) => {
    const teachingClass = teachingClasses.find(tc => tc.id === item.teachingClassId);
    if (teachingClass?.classNumber) return teachingClass.classNumber;
    const classNumberMatch = item.teachingClassName.match(/(?:初一|初二|初三|高一|高二|高三)(\d+)班/);
    return classNumberMatch ? Number(classNumberMatch[1]) : null;
  };

  const getGradeClassNumbers = () => {
    const classNumbersFromAssignments = getGradeTeachingClasses()
      .map(tc => tc.classNumber)
      .filter((classNumber): classNumber is number => typeof classNumber === 'number');
    const classNumbersFromSchedules = schedules
      .filter(item => item.teachingClassName.startsWith(selectedGrade))
      .map(item => getScheduleClassNumber(item))
      .filter((classNumber): classNumber is number => typeof classNumber === 'number');

    return Array.from(new Set([...classNumbersFromAssignments, ...classNumbersFromSchedules]))
      .sort((a, b) => a - b);
  };

  const getClassViewSchedules = (day: number, period: number, classNumber: number) => {
    return getFilteredSchedules(day, period)
      .filter(item => getScheduleClassNumber(item) === classNumber)
      .sort((a, b) => a.subject.localeCompare(b.subject) || a.teacherName.localeCompare(b.teacherName));
  };

  const getCellConflicts = (day: number, period: number) => {
    return conflicts.filter(c => c.affectedSlots.some(s => s.day === day && s.period === period));
  };

  const getSubstituteReasonText = () => {
    return substituteReasonDetail.trim() || substituteReason;
  };

  const getPeriodTimeLabel = (period: number) => {
    const periodMeta = PERIODS_METADATA.find(item => item.type === 'period' && item.num === period);
    return periodMeta ? periodMeta.time : `第${period}节`;
  };

  const getScheduleAdjustmentLogs = (item: ScheduleItem) => {
    if (item.adjustmentHistory && item.adjustmentHistory.length > 0) return item.adjustmentHistory;
    return item.adjustmentNote ? [item.adjustmentNote] : [];
  };

  // Substitute Recommend Trigger
  const handleSelectCell = async (item: ScheduleItem) => {
    setSelectedCell(item);
    setSubstituteData(null);
    setSubstituteReason(item.adjustmentNote?.reason || '临时有事请假');
    setSubstituteReasonDetail('');
    setShowSubstituteDialog(true);
    setSubstituteLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const recommendations = getSubstituteRecommendations(item.id, schedules, teachers);
      setSubstituteData({ item, recommendations });
    } catch (err) {
      console.error(err);
    } finally {
      setSubstituteLoading(false);
    }
  };

  const closeSubstituteDialog = () => {
    setShowSubstituteDialog(false);
    setSelectedCell(null);
    setSubstituteData(null);
    setPendingSubstituteConfirm(null);
    setSubstituteLoading(false);
    setSubstituteReason('临时有事请假');
    setSubstituteReasonDetail('');
  };

  // Confirm Substitute Substitute Action
  const handleApplySubstitute = async (substituteTeacherId: string) => {
    if (!selectedCell) return;
    const substituteTeacher = teachers.find(t => t.id === substituteTeacherId);
    if (!substituteTeacher) return;

    const reason = getSubstituteReasonText();
    const rootOriginalTeacherId = selectedCell.adjustmentNote?.originalTeacherId || selectedCell.teacherId;
    const rootOriginalTeacherName = selectedCell.adjustmentNote?.originalTeacherName || selectedCell.teacherName;
    const fromTeacherId = selectedCell.teacherId;
    const fromTeacherName = selectedCell.teacherName;
    const summary = `${fromTeacherName}老师${reason}，已临时调配${substituteTeacher.name}老师`;

    setPendingSubstituteConfirm({
      scheduleId: selectedCell.id,
      teachingClassName: selectedCell.teachingClassName,
      subject: selectedCell.subject,
      classroomName: selectedCell.classroomName,
      day: selectedCell.day,
      period: selectedCell.period,
      periodTimeLabel: getPeriodTimeLabel(selectedCell.period),
      rootOriginalTeacherId,
      rootOriginalTeacherName,
      fromTeacherId,
      fromTeacherName,
      substituteTeacherId,
      substituteTeacherName: substituteTeacher.name,
      reason,
      summary
    });
  };

  const cancelPendingSubstitute = () => {
    setPendingSubstituteConfirm(null);
  };

  const confirmPendingSubstitute = () => {
    if (!pendingSubstituteConfirm) return;

    const newSchedules = schedules.map(s => {
      if (s.id === pendingSubstituteConfirm.scheduleId) {
        const existingHistory = s.adjustmentHistory ?? (s.adjustmentNote ? [s.adjustmentNote] : []);
        const nextAdjustmentNote = {
          id: `remark-${pendingSubstituteConfirm.scheduleId}-${Date.now()}`,
          type: 'substitute' as const,
          reason: pendingSubstituteConfirm.reason,
          summary: pendingSubstituteConfirm.summary,
          createdAt: new Date().toISOString(),
          chainIndex: existingHistory.length + 1,
          originalTeacherId: pendingSubstituteConfirm.rootOriginalTeacherId,
          originalTeacherName: pendingSubstituteConfirm.rootOriginalTeacherName,
          fromTeacherId: pendingSubstituteConfirm.fromTeacherId,
          fromTeacherName: pendingSubstituteConfirm.fromTeacherName,
          toTeacherId: pendingSubstituteConfirm.substituteTeacherId,
          toTeacherName: pendingSubstituteConfirm.substituteTeacherName,
          substituteTeacherId: pendingSubstituteConfirm.substituteTeacherId,
          substituteTeacherName: pendingSubstituteConfirm.substituteTeacherName
        };
        return {
          ...s,
          teacherId: pendingSubstituteConfirm.substituteTeacherId,
          teacherName: pendingSubstituteConfirm.substituteTeacherName,
          isTemp: true,
          adjustmentNote: nextAdjustmentNote,
          adjustmentHistory: [...existingHistory, nextAdjustmentNote]
        };
      }
      return s;
    });

    setSchedules(newSchedules);
    setSelectedCell(null);
    setSubstituteData(null);
    setPendingSubstituteConfirm(null);
    setShowSubstituteDialog(false);
    setSubstituteReason('临时有事请假');
    setSubstituteReasonDetail('');
    updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students);
  };

  const handleSaveTeacher = () => {
    if (!editingTeacher) return;
    const newTeachers = teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t);
    setTeachers(newTeachers);
    setEditingTeacher(null);
    updateConflicts(schedules, newTeachers, classrooms, teachingClasses, students);
    alert('教师偏好同步成功！');
  };

  const handleSaveStudent = () => {
    if (!editingStudent) return;
    const newStudents = students.map(s => s.id === editingStudent.id ? editingStudent : s);
    setStudents(newStudents);
    setEditingStudent(null);
    updateConflicts(schedules, teachers, classrooms, teachingClasses, newStudents);
    alert('学生走班绑定同步成功！');
  };

  const handleAdviserChange = (classNum: number, teacherId: string) => {
    const oldTeacher = teachers.find(t => t.preferences?.includes('担任' + selectedGrade + classNum + '班班主任'));
    const newTeachers = teachers.map(t => {
      let prefs = t.preferences || '';
      if (oldTeacher && t.id === oldTeacher.id) {
        prefs = prefs.replace('担任' + selectedGrade + classNum + '班班主任', '').trim();
      }
      if (t.id === teacherId) {
        if (!prefs.includes('班主任')) {
          prefs = (prefs + ' 担任' + selectedGrade + classNum + '班班主任').trim();
        }
      }
      return { ...t, preferences: prefs };
    });
    setTeachers(newTeachers);
    updateConflicts(schedules, newTeachers, classrooms, teachingClasses, students);
    alert('班主任分工更新成功！');
  };

  const handleSubjectTeacherChange = (classNum: number, subjectName: string, teacherId: string) => {
    const tc = teachingClasses.find(x => x.grade === selectedGrade && x.classNumber === classNum && x.subject === subjectName);
    if (!tc) return;
    const newTeacher = teachers.find(t => t.id === teacherId);
    if (!newTeacher) return;

    const newTeachingClasses = teachingClasses.map(x => {
      if (x.id === tc.id) {
        return { ...x, teacherId: teacherId };
      }
      return x;
    });
    setTeachingClasses(newTeachingClasses);

    const newSchedules = schedules.map(s => {
      if (s.teachingClassId === tc.id) {
        return {
          ...s,
          teacherId: teacherId,
          teacherName: newTeacher.name,
          isTemp: false,
          adjustmentNote: undefined,
          adjustmentHistory: undefined
        };
      }
      return s;
    });
    setSchedules(newSchedules);
    updateConflicts(newSchedules, teachers, classrooms, newTeachingClasses, students);
    alert('任课教师岗位调整成功，课表排期已同步热更！');
  };

  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `T${(teachers.length + 1).toString().padStart(3, '0')}`;
    const newT: Teacher = {
      id,
      name: newTeacherName,
      subjects: [newTeacherSubject],
      maxWeeklyHours: newTeacherWeeklyHours,
      maxDailyHours: 4,
      maxConsecutiveLessons: 2,
      unavailablePeriods: [],
      preferences: `主要负责 ${selectedGrade} 教学任务`,
      phone: newTeacherPhone,
      email: '',
      department: newTeacherDept
    };

    const newTeachers = [...teachers, newT];
    setTeachers(newTeachers);
    setShowAddTeacherModal(false);
    setNewTeacherName('');
    setNewTeacherPhone('');
    updateConflicts(schedules, newTeachers, classrooms, teachingClasses, students);
    alert(`聘任成功！新进教师 ${newT.name} 已归档，工号为 ${newT.id}。`);
  };

  const handleAddClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `R${(classrooms.length + 1).toString().padStart(3, '0')}`;
    const newR: Classroom = {
      id,
      name: newClassroomName,
      type: newClassroomType,
      capacity: newClassroomCapacity,
      assignedSubjects: [newClassroomSubject]
    };

    const newClassrooms = [...classrooms, newR];
    setClassrooms(newClassrooms);
    setShowAddClassroomModal(false);
    setNewClassroomName('');
    updateConflicts(schedules, teachers, newClassrooms, teachingClasses, students);
    alert(`增设成功！走班教室 ${newR.name} 已归档，代码为 ${newR.id}。`);
  };

  const getActiveFilterLabel = () => {
    if (combinationFilter !== 'all') return `选科组合：${combinationFilter}`;
    if (teacherFilter !== 'all') {
      const found = teachers.find(t => t.id === teacherFilter);
      return found ? `教师课表：${found.name}` : '课表过滤';
    }
    if (classroomFilter !== 'all') {
      const found = classrooms.find(c => c.id === classroomFilter);
      return found ? `教室课表：${found.name}` : '课表过滤';
    }
    if (subjectFilter !== 'all') return `学科筛选：${subjectFilter}`;
    return "全校走班排课总看板";
  };

  const getBoardHeadingTitle = () => {
    if (boardDisplayMode === 'class') return `班级课程检查：${selectedGrade}`;
    if (boardDisplayMode === 'dayCards') return `周卡片排班：${selectedGrade}`;
    return getActiveFilterLabel();
  };

  const getBoardHeadingDescription = () => {
    if (boardDisplayMode === 'class') {
      return '按行政班号横向扫描每一天的课程，用颜色和教师缩写快速发现缺课、重复或临时代课。';
    }

    if (boardDisplayMode === 'dayCards') {
      return '五个工作日横向铺开，当前日期展开完整排班，其余日期收起为课程、教师和备注摘要。';
    }

    return '采用一键自动排课+手动微调保障。排上课表项代表走班制上课组织，包含行政班与教学班时间。';
  };

  const getSubjectColorClass = (subj: string, isFinished?: boolean, isTemp?: boolean) => {
    if (isFinished) return "bg-slate-50 border-l-4 border-slate-300 text-slate-400 opacity-50";
    if (isTemp) return "bg-orange-50 border-2 border-orange-200 text-orange-800";
    switch (subj) {
      case '语文': return 'bg-rose-50 border-l-4 border-rose-500 text-rose-800';
      case '数学': return 'bg-blue-50 border-l-4 border-blue-500 text-blue-800';
      case '英语': return 'bg-violet-50 border-l-4 border-violet-500 text-violet-800';
      case '物理': return 'bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800';
      case '化学': return 'bg-amber-50 border-l-4 border-amber-500 text-amber-800';
      case '生物': return 'bg-teal-50 border-l-4 border-teal-500 text-teal-800';
      case '历史': return 'bg-amber-50 border-l-4 border-amber-700 text-amber-900';
      case '地理': return 'bg-cyan-50 border-l-4 border-cyan-500 text-cyan-800';
      case '政治': return 'bg-indigo-50 border-l-4 border-indigo-500 text-indigo-800';
      case '通用': return 'bg-purple-50 border-l-4 border-purple-500 text-purple-800';
      case '信息技术': return 'bg-sky-50 border-l-4 border-sky-500 text-sky-800';
      case '音乐': return 'bg-pink-50 border-l-4 border-pink-500 text-pink-800';
      case '美术': return 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800';
      case '体育': return 'bg-lime-50 border-l-4 border-lime-500 text-lime-800';
      default: return 'bg-slate-50 border-l-4 border-slate-400 text-slate-800';
    }
  };

  const getTeacherToneIndex = (teacherId: string) => {
    return teacherId.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 5;
  };

  const getClassMatrixCellStyle = (item: ScheduleItem): React.CSSProperties => {
    const toneIndex = getTeacherToneIndex(item.teacherId);
    const lightnessByTone = [90, 84, 78, 72, 66];
    const hue = subjectHueMap[item.subject] ?? 215;

    return {
      '--subject-hue': hue,
      '--teacher-lightness': `${lightnessByTone[toneIndex]}%`,
      '--teacher-border-lightness': `${Math.max(38, lightnessByTone[toneIndex] - 24)}%`,
      '--teacher-chip-lightness': `${Math.min(96, lightnessByTone[toneIndex] + 5)}%`
    } as React.CSSProperties;
  };

  const getSubjectBriefName = (subject: string) => {
    return subjectBriefNameMap[subject] || subject.slice(0, 1);
  };

  const gradeTeachers = getGradeTeachers();
  const gradeTeachingClasses = getGradeTeachingClasses();
  const gradeStudents = getGradeStudents();
  const gradeScheduleCount = schedules.filter(s => s.teachingClassName.startsWith(selectedGrade)).length;
  const dataAuditReport = buildDataAuditReport({
    selectedGrade,
    teachers,
    classrooms,
    teachingClasses,
    students,
    schedules,
  });
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');
  const preferenceCriticalDiagnostics = preferenceDiagnostics.filter(item => item.severity === 'critical');
  const preferenceWarningDiagnostics = preferenceDiagnostics.filter(item => item.severity === 'warning');
  const hasCriticalConflicts = criticalConflicts.length > 0;
  const hasDiagnosticWarnings = warningConflicts.length > 0 || preferenceDiagnostics.length > 0;
  const diagnosticSummary = `${criticalConflicts.length} 处硬冲突 / ${warningConflicts.length} 条资源提醒 / ${preferenceDiagnostics.length} 条偏好诊断`;
  const weeklyRemarks = schedules
    .filter(s => s.teachingClassName.startsWith(selectedGrade))
    .flatMap(s => {
      const logs = s.adjustmentHistory && s.adjustmentHistory.length > 0
        ? s.adjustmentHistory
        : (s.adjustmentNote ? [s.adjustmentNote] : []);
      return logs.map(adjustmentNote => ({ ...s, adjustmentNote }));
    })
    .sort((a, b) => (
      (a.day - b.day) ||
      (a.period - b.period) ||
      a.teachingClassName.localeCompare(b.teachingClassName) ||
      a.adjustmentNote.createdAt.localeCompare(b.adjustmentNote.createdAt)
    ));
  const getRemarksForDay = (dayNum: number) => weeklyRemarks.filter(item => item.day === dayNum);
  const managementStats = [
    {
      label: '当前教师',
      value: gradeTeachers.length,
      suffix: '人',
      detail: '参与本年级排课',
      icon: <Users className="w-4 h-4 text-blue-600" />,
      className: 'border-blue-100 bg-blue-50/60 text-blue-900'
    },
    {
      label: '授课分工',
      value: gradeTeachingClasses.length,
      suffix: '项',
      detail: '行政班与学科绑定',
      icon: <Sliders className="w-4 h-4 text-indigo-600" />,
      className: 'border-indigo-100 bg-indigo-50/60 text-indigo-900'
    },
    {
      label: '走班学生',
      value: gradeStudents.length,
      suffix: '人',
      detail: '已绑定选科组合',
      icon: <User className="w-4 h-4 text-emerald-600" />,
      className: 'border-emerald-100 bg-emerald-50/60 text-emerald-900'
    },
    {
      label: '硬冲突',
      value: criticalConflicts.length,
      suffix: '处',
      detail: `${warningConflicts.length} 条资源提醒 · ${preferenceDiagnostics.length} 条偏好诊断 · ${selectedGrade}课表 ${gradeScheduleCount} 节`,
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      className: hasCriticalConflicts ? 'border-rose-100 bg-rose-50/70 text-rose-900' : 'border-amber-100 bg-amber-50/70 text-amber-900'
    }
  ];
  const managementTableShellClass = 'management-table-shell bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0';
  const managementTableScrollClass = 'management-table-scroll min-h-0 overflow-x-auto overflow-y-visible';

  const renderSchedulerViewTabs = () => {
    return (
      <nav
        className={`scheduler-view-tabs scheduler-header-tabs ${isTabLayoutPinned ? 'scheduler-header-tabs--pinned' : ''}`}
        aria-label="排班视图切换"
      >
        <button
          onClick={() => handleViewTabChange('board')}
          className={activeTab === 'board' ? 'scheduler-view-tab is-active' : 'scheduler-view-tab'}
        >
          动态排课主看板
        </button>
        <button
          onClick={() => handleViewTabChange('management')}
          className={activeTab === 'management' ? 'scheduler-view-tab is-active' : 'scheduler-view-tab'}
        >
          学校教学分工与基础数据
        </button>
      </nav>
    );
  };

  const renderBoardModeToggle = (variant: 'head' | 'pinned') => {
    return (
      <div
        className={`scheduler-board-mode-toggle scheduler-board-mode-toggle--${variant}`}
        aria-label="排课检查模式"
      >
        <button
          type="button"
          onClick={() => setBoardDisplayMode('time')}
          aria-pressed={boardDisplayMode === 'time'}
          className={boardDisplayMode === 'time' ? 'scheduler-board-mode-option is-active' : 'scheduler-board-mode-option'}
        >
          时间视图
        </button>
        <button
          type="button"
          onClick={() => setBoardDisplayMode('class')}
          aria-pressed={boardDisplayMode === 'class'}
          className={boardDisplayMode === 'class' ? 'scheduler-board-mode-option is-active' : 'scheduler-board-mode-option'}
        >
          按班级看
        </button>
        <button
          type="button"
          onClick={() => setBoardDisplayMode('dayCards')}
          aria-pressed={boardDisplayMode === 'dayCards'}
          className={boardDisplayMode === 'dayCards' ? 'scheduler-board-mode-option is-active' : 'scheduler-board-mode-option'}
        >
          周卡片
        </button>
      </div>
    );
  };

  const renderBoardFilters = (variant: 'head' | 'pinned') => {
    return (
      <div className={`scheduler-board-filters scheduler-board-filters--${variant}`}>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="scheduler-board-filter-select text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option value="all">所有科目</option>
          <option value="语文">语文</option>
          <option value="数学">数学</option>
          <option value="英语">英语</option>
          <option value="物理">物理</option>
          <option value="化学">化学</option>
          <option value="生物">生物</option>
          <option value="历史">历史</option>
          <option value="地理">地理</option>
          <option value="通用">通用/劳动</option>
          <option value="音乐">音乐</option>
          <option value="美术">美术</option>
          <option value="信息技术">信息技术</option>
        </select>

        <select
          value={combinationFilter}
          onChange={(e) => setCombinationFilter(e.target.value)}
          className="scheduler-board-filter-select text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option value="all">所有选修组合/类型</option>
          <option value="物化生">物化生 组 (高二复合)</option>
          <option value="物化地">物化地 组</option>
          <option value="历政地">历政地 组</option>
          <option value="普通班">普通班</option>
        </select>

        <select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          className="scheduler-board-filter-select text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option value="all">所有任课教师</option>
          {getGradeTeachers().map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.subjects.join('/')})</option>
          ))}
        </select>

        <select
          value={classroomFilter}
          onChange={(e) => setClassroomFilter(e.target.value)}
          className="scheduler-board-filter-select text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
        >
          <option value="all">所有备课/走班教室</option>
          {getGradeClassrooms().map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {(subjectFilter !== 'all' || combinationFilter !== 'all' || teacherFilter !== 'all' || classroomFilter !== 'all') && (
          <button
            onClick={() => {
              setSubjectFilter('all');
              setCombinationFilter('all');
              setTeacherFilter('all');
              setClassroomFilter('all');
            }}
            className="scheduler-board-filter-clear p-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded font-bold"
          >
            清除筛选
          </button>
        )}
      </div>
    );
  };

  const renderClassBoardView = () => {
    const classNumbers = getGradeClassNumbers();
    const periodRows = PERIODS_METADATA.filter(meta => meta.type === 'period');
    const gridTemplateColumns = `4.1rem repeat(${Math.max(classNumbers.length, 1)}, minmax(3.7rem, 1fr))`;

    return (
      <div className="class-board-shell" data-view-mode="class-inspection">
        <div className="class-board-summary">
          <div>
            <span className="class-board-kicker">班级横向检查</span>
            <h3>{selectedGrade}各班本周课程矩阵</h3>
          </div>
          <p>
            横向是班级号，纵向是节次；同学科保持同一色系，同科不同老师用深浅区分，点击任意课程可继续查看诊断和临时代课。
          </p>
        </div>

        {DAYS.map(day => {
          const dayCourseCount = schedules.filter(item => item.teachingClassName.startsWith(selectedGrade) && item.day === day.num).length;

          return (
            <section key={`class-board-day-${day.num}`} className="class-board-day-block">
              <div className="class-board-day-title">
                <div>
                  <span>{day.engName}</span>
                  <strong>{day.name}</strong>
                </div>
                <small>{classNumbers.length} 个班级 · {dayCourseCount} 节课</small>
              </div>

              <div className="class-board-scroll">
                <div className="class-board-grid" style={{ gridTemplateColumns }}>
                  <div className="class-board-corner">节次</div>
                  {classNumbers.map(classNumber => (
                    <div key={`class-head-${day.num}-${classNumber}`} className="class-board-class-head">
                      <span className="class-board-number-badge">{classNumber}</span>
                      <small>班</small>
                    </div>
                  ))}

                  {periodRows.map(period => (
                    <React.Fragment key={`class-period-row-${day.num}-${period.num}`}>
                      <div className="class-board-period-label">
                        <strong>{period.name}</strong>
                        <small>{period.time}</small>
                      </div>

                      {classNumbers.map(classNumber => {
                        const cellItems = getClassViewSchedules(day.num, period.num, classNumber);

                        return (
                          <div
                            key={`class-slot-${day.num}-${period.num}-${classNumber}`}
                            className={`class-board-slot ${cellItems.length > 1 ? 'has-overlap' : ''}`}
                          >
                            {cellItems.length > 0 ? (
                              cellItems.map(item => (
                                <button
                                  type="button"
                                  key={item.id}
                                  onClick={() => handleSelectCell(item)}
                                  className="class-board-course-card"
                                  style={getClassMatrixCellStyle(item)}
                                  title={`${day.name} ${period.name} · ${selectedGrade}${classNumber}班 · ${item.subject} · ${item.teacherName}`}
                                >
                                  {item.adjustmentNote && (
                                    <span className="class-board-substitute-dot">代</span>
                                  )}
                                  <strong>{item.subject}</strong>
                                  <span>{item.teacherName}</span>
                                </button>
                              ))
                            ) : (
                              <span className="class-board-empty">-</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderDayCardsBoardView = () => {
    const periodRows = PERIODS_METADATA.filter(meta => meta.type === 'period');

    return (
      <div className="day-card-board-shell" data-view-mode="weekday-accordion">
        <div className="day-card-board-summary">
          <div>
            <span className="day-card-board-kicker">周一至周五</span>
            <h3>{selectedGrade}横向排班卡片</h3>
          </div>
          <div className="day-card-board-totals">
            <span>{DAYS.length} 天</span>
            <span>{periodRows.length} 节</span>
            <span>{gradeScheduleCount} 条课表</span>
          </div>
        </div>

        <div className="weekday-accordion-row">
          {DAYS.map(day => {
            const daySchedules = periodRows.flatMap(period => getFilteredSchedules(day.num, period.num));
            const dayTeacherCount = new Set(daySchedules.map(item => item.teacherId)).size;
            const dayRemarkCount = daySchedules.filter(item => getScheduleAdjustmentLogs(item).length > 0).length;
            const subjectSummary = Array.from(new Set(daySchedules.map(item => item.subject))).slice(0, 4);
            const isExpanded = expandedDayCard === day.num;

            return (
              <section
                key={`weekday-card-${day.num}`}
                className={`weekday-accordion-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
              >
                <button
                  type="button"
                  className="weekday-card-trigger"
                  aria-expanded={isExpanded}
                  aria-pressed={isExpanded}
                  onClick={() => setExpandedDayCard(day.num)}
                >
                  <span className="weekday-card-eng">{day.engName}</span>
                  <strong>{day.name}</strong>
                  <span className="weekday-card-count">{daySchedules.length} 节</span>
                </button>

                {isExpanded ? (
                  <div className="weekday-expanded-panel">
                    {periodRows.map(period => {
                      const cellItems = getFilteredSchedules(day.num, period.num);
                      const periodScrollbarClass = getPeriodScrollbarClass(period.num);

                      return (
                        <section
                          key={`weekday-expanded-${day.num}-${period.num}`}
                          className={`weekday-period-row ${getPeriodModuleClass(period.num)}`}
                        >
                          <div className="weekday-period-label">
                            <strong>{period.name}</strong>
                            <span>{period.time}</span>
                          </div>
                          <div className={`weekday-period-courses ${periodScrollbarClass}`}>
                            {cellItems.length > 0 ? (
                              cellItems.map(item => (
                                <button
                                  type="button"
                                  key={item.id}
                                  className="weekday-period-course"
                                  style={getClassMatrixCellStyle(item)}
                                  onClick={() => handleSelectCell(item)}
                                  title={`${day.name} ${period.name} · ${item.teachingClassName} · ${item.subject} · ${item.teacherName}`}
                                >
                                  {item.adjustmentNote && (
                                    <span className="weekday-period-course-badge" title={item.adjustmentNote.summary}>
                                      代
                                    </span>
                                  )}
                                  <strong>{item.subject} · {item.teacherName}</strong>
                                  <span>{item.teachingClassName}</span>
                                  {item.adjustmentNote && (
                                    <small title={item.adjustmentNote.summary}>
                                      {item.adjustmentNote.originalTeacherName || '原老师'} → {item.adjustmentNote.substituteTeacherName || item.teacherName}
                                    </small>
                                  )}
                                </button>
                              ))
                            ) : (
                              <span className="weekday-period-empty">-</span>
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="weekday-collapsed-summary">
                    <div className="weekday-card-metrics">
                      <span>{dayTeacherCount} 位教师</span>
                      <span>{dayRemarkCount} 条备注</span>
                    </div>
                    <div className="weekday-card-subjects">
                      {subjectSummary.length > 0 ? (
                        subjectSummary.map(subject => (
                          <span key={`weekday-${day.num}-${subject}`}>{getSubjectBriefName(subject)}</span>
                        ))
                      ) : (
                        <span>空</span>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreferenceSettingsPanel = () => (
    <div className="preference-settings-grid">
      <section className="preference-rule-panel">
        <div className="preference-rule-panel-head">
          <span>教师重点节次均衡</span>
          <strong>{schedulingPreferences.teacherPeriodBalance.length} 条规则</strong>
        </div>
        <p>避免同一老师反复排在第一、第四、第五、第八节；默认每周 1-2 次为可接受范围。</p>
        <div className="preference-period-chip-row">
          {[1, 4, 5, 8].map(period => (
            <span key={period} className="preference-period-chip">第{period}节</span>
          ))}
        </div>
      </section>

      <section className="preference-rule-panel">
        <div className="preference-rule-panel-head">
          <span>连堂偏好</span>
          <strong>{schedulingPreferences.doubleLessonRules.length} 条规则</strong>
        </div>
        <p>用于设置某年级某学科在指定星期尽量连续两节，例如周三语文连堂。</p>
      </section>

      <section className="preference-rule-panel">
        <div className="preference-rule-panel-head">
          <span>禁排时段</span>
          <strong>{schedulingPreferences.forbiddenSlotRules.length} 条规则</strong>
        </div>
        <p>用于限制某老师、某班、某学科或某教学班不能出现在指定星期和节次。</p>
      </section>

      <section className="preference-rule-panel">
        <div className="preference-rule-panel-head">
          <span>同步上课</span>
          <strong>{schedulingPreferences.syncLessonRules.length} 条规则</strong>
        </div>
        <p>用于走班选课场景，要求多个班级或教学班必须安排在同一时段。</p>
      </section>

      <section className="preference-rule-panel preference-rule-panel--wide">
        <div className="preference-rule-panel-head">
          <span>偏好诊断</span>
          <strong>{preferenceCriticalDiagnostics.length} 条严重 / {preferenceWarningDiagnostics.length} 条提醒</strong>
        </div>
        <div className="preference-diagnostics-list">
          {preferenceDiagnostics.length > 0 ? preferenceDiagnostics.slice(0, 8).map(item => (
            <div key={item.id} className={`preference-diagnostic-item preference-diagnostic-item--${item.severity}`}>
              <span>{item.ruleName}</span>
              <p>{item.message}</p>
            </div>
          )) : (
            <div className="preference-diagnostic-empty">当前排课偏好诊断无异常</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderDataAuditPanel = () => {
    const categoryCards = [
      { key: 'integrity', label: '引用完整性', detail: '教师、教室、教学班 ID 是否能互相对应', tone: 'sky' },
      { key: 'periods', label: '课时口径', detail: '分工表节数与当前课表格子数是否一致', tone: 'indigo' },
      { key: 'load', label: '教师负荷', detail: '教师每周上限是否被当前课表突破', tone: 'amber' },
      { key: 'students', label: '学生数据', detail: '学生选科与教学班绑定是否足够支撑走班冲突检测', tone: 'emerald' },
    ] as const;
    const abbreviationAuditRows = EXCEL_TIMETABLE_ABBREVIATION_AUDIT.filter(row => row.grade === selectedGrade);
    const periodMismatchRows = EXCEL_PERIOD_MISMATCH_AUDIT.filter(row => row.grade === selectedGrade);
    const auditSearchTerm = dataAuditSearchTerm.trim().toLowerCase();
    const selectedAuditClassNumber = dataAuditClassNumberFilter === 'all' ? null : Number(dataAuditClassNumberFilter);
    const auditClassNumbers = Array.from(new Set([
      ...abbreviationAuditRows.flatMap(row => row.classNumbers),
      ...periodMismatchRows.map(row => row.classNumber),
    ])).filter(Number.isFinite).sort((a, b) => a - b);
    const matchesAuditSearch = (values: Array<string | number | null | undefined>) => (
      auditSearchTerm.length === 0 ||
      values.some(value => String(value ?? '').toLowerCase().includes(auditSearchTerm))
    );
    const matchesMappingStatus = (status: string) => {
      if (dataAuditMappingStatusFilter === 'all') return true;
      if (dataAuditMappingStatusFilter === 'review') return status !== 'matched';
      return status === dataAuditMappingStatusFilter;
    };
    const filteredAbbreviationAuditRows = abbreviationAuditRows.filter(row => (
      matchesMappingStatus(row.status) &&
      (selectedAuditClassNumber === null || row.classNumbers.includes(selectedAuditClassNumber)) &&
      matchesAuditSearch([
        row.abbreviation,
        row.subject,
        row.teacherName,
        row.status,
        row.note,
        row.classNumbers.map(classNumber => `${selectedGrade}${classNumber}班`).join(' '),
      ])
    ));
    const filteredPeriodMismatchRows = periodMismatchRows.filter(row => (
      (selectedAuditClassNumber === null || row.classNumber === selectedAuditClassNumber) &&
      matchesAuditSearch([
        row.subject,
        row.teacherName,
        row.teachingClassName,
        row.classNumber,
        `${row.grade}${row.classNumber}班`,
        row.assignedPeriods,
        row.scheduledPeriods,
        row.delta,
      ])
    ));
    const reviewMappingCount = filteredAbbreviationAuditRows.filter(row => row.status !== 'matched').length;
    const isDataAuditFilterActive = Boolean(
      auditSearchTerm ||
      dataAuditMappingStatusFilter !== 'all' ||
      dataAuditClassNumberFilter !== 'all'
    );
    const getMappingStatusLabel = (status: string) => {
      if (status === 'matched') return '已匹配';
      if (status === 'needsReview') return '需人工确认';
      if (status === 'ambiguous') return '多候选';
      return '未匹配';
    };

    return (
      <div className="data-audit-grid">
        <section className={`data-audit-summary-card ${dataAuditReport.summary.readyForAlgorithm ? 'is-ready' : 'has-issues'}`}>
          <div>
            <span className="data-audit-kicker">算法可用性</span>
            <h3>{dataAuditReport.summary.readyForAlgorithm ? '当前数据可进入自动排课' : '当前数据需要先核对'}</h3>
            <p>
              根据本地 JSON 中的教师、教学分工、课表与学生绑定数据，先把会影响自动排课和代课推荐的口径问题集中列出来。
            </p>
          </div>
          <div className="data-audit-score">
            <strong>{dataAuditReport.summary.totalIssues}</strong>
            <span>待核对</span>
          </div>
        </section>

        <div className="data-audit-category-row">
          {categoryCards.map(card => (
            <section key={card.key} className={`data-audit-category-card data-audit-category-card--${card.tone}`}>
              <div>
                <span>{card.label}</span>
                <strong>{dataAuditReport.categoryCounts[card.key]} 条</strong>
              </div>
              <p>{card.detail}</p>
            </section>
          ))}
        </div>

        <section className="data-audit-source-card">
          <div className="data-audit-issues-head">
            <div>
              <span className="data-audit-kicker">真实 Excel 来源</span>
              <h3>当前本地数据底座</h3>
            </div>
            <div className="data-audit-issue-counts">
              <span>{EXCEL_DATA_SOURCES.length} 个源文件/工作表</span>
            </div>
          </div>
          <div className="data-audit-source-body">
            <div className="data-audit-source-list">
              {EXCEL_DATA_SOURCES.map((source, index) => (
                <div key={`${source.fileName}-${index}`} className="data-audit-source-item">
                  <strong>{source.fileName}</strong>
                  <span>{'sheetName' in source ? source.sheetName : source.sheets.join(' / ')}</span>
                </div>
              ))}
            </div>
            <div className="data-audit-limitations">
              {EXCEL_DATA_LIMITATIONS.map(item => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="data-audit-reconciliation-grid">
          <div className="data-audit-filter-bar" role="search" aria-label="数据核对筛选">
            <label className="data-audit-filter-field">
              <span>关键字</span>
              <input
                value={dataAuditSearchTerm}
                onChange={(event) => setDataAuditSearchTerm(event.target.value)}
                placeholder="搜索缩写、老师、学科"
              />
            </label>
            <label className="data-audit-filter-field">
              <span>映射</span>
              <select
                value={dataAuditMappingStatusFilter}
                onChange={(event) => setDataAuditMappingStatusFilter(event.target.value)}
              >
                <option value="all">全部映射状态</option>
                <option value="review">只看需人工确认</option>
                <option value="matched">只看已匹配</option>
                <option value="ambiguous">只看多候选</option>
                <option value="unmatched">只看未匹配</option>
              </select>
            </label>
            <label className="data-audit-filter-field">
              <span>班级</span>
              <select
                value={dataAuditClassNumberFilter}
                onChange={(event) => setDataAuditClassNumberFilter(event.target.value)}
              >
                <option value="all">全部班级</option>
                {auditClassNumbers.map(classNumber => (
                  <option key={classNumber} value={String(classNumber)}>{selectedGrade}{classNumber}班</option>
                ))}
              </select>
            </label>
            <div className="data-audit-filter-result">
              <strong>{filteredAbbreviationAuditRows.length}</strong>
              <span>缩写</span>
              <strong>{filteredPeriodMismatchRows.length}</strong>
              <span>节数差异</span>
            </div>
            <button
              type="button"
              className="data-audit-filter-reset"
              disabled={!isDataAuditFilterActive}
              onClick={() => {
                setDataAuditSearchTerm('');
                setDataAuditMappingStatusFilter('all');
                setDataAuditClassNumberFilter('all');
              }}
            >
              <RotateCcw size={14} />
              清空
            </button>
          </div>

          <div className="data-audit-mapping-panel">
            <div className="data-audit-issues-head">
              <div>
                <span className="data-audit-kicker">缩写映射核对</span>
                <h3>课程表缩写到真实教师</h3>
              </div>
              <div className="data-audit-issue-counts">
                <span>{filteredAbbreviationAuditRows.length}/{abbreviationAuditRows.length} 个缩写</span>
                <span>{reviewMappingCount} 需人工确认</span>
              </div>
            </div>
            <div className="data-audit-mapping-table" role="table" aria-label={`${selectedGrade}课表缩写映射核对`}>
              <div className="data-audit-mapping-row data-audit-mapping-row--head" role="row">
                <span>课表缩写</span>
                <span>学科</span>
                <span>映射老师</span>
                <span>出现</span>
                <span>状态</span>
              </div>
              {filteredAbbreviationAuditRows.length > 0 ? filteredAbbreviationAuditRows.map(row => (
                <div key={`${row.grade}-${row.abbreviation}`} className={`data-audit-mapping-row data-audit-mapping-row--${row.status}`} role="row" title={row.note}>
                  <span className="data-audit-abbrev">{row.abbreviation}</span>
                  <span>{row.subject || '-'}</span>
                  <span>{row.teacherName || '未匹配'}</span>
                  <span>{row.occurrenceCount} 格</span>
                  <span>{getMappingStatusLabel(row.status)}</span>
                </div>
              )) : (
                <div className="data-audit-inline-empty">
                  {abbreviationAuditRows.length > 0 ? '没有符合筛选条件的缩写映射' : '当前年级没有导入真实课程表缩写数据'}
                </div>
              )}
            </div>
          </div>

          <div className="data-audit-mapping-panel">
            <div className="data-audit-issues-head">
              <div>
                <span className="data-audit-kicker">节数差异明细</span>
                <h3>分工表节数 vs 课表实排格子</h3>
              </div>
              <div className="data-audit-issue-counts">
                <span>{filteredPeriodMismatchRows.length}/{periodMismatchRows.length} 项差异</span>
              </div>
            </div>
            <div className="data-audit-period-list">
              {filteredPeriodMismatchRows.length > 0 ? filteredPeriodMismatchRows.slice(0, 24).map(row => (
                <article key={`${row.grade}-${row.classNumber}-${row.subject}`} className="data-audit-period-item">
                  <div>
                    <strong>{row.grade}{row.classNumber}班 · {row.subject}</strong>
                    <span>{row.teacherName || '未匹配教师'}</span>
                  </div>
                  <p>
                    分工表 {row.assignedPeriods} 节 / 课表 {row.scheduledPeriods} 格
                    <b>{row.delta > 0 ? `+${row.delta}` : row.delta}</b>
                  </p>
                </article>
              )) : (
                <div className="data-audit-inline-empty">
                  {periodMismatchRows.length > 0 ? '没有符合筛选条件的节数差异' : '当前年级分工表节数与课表实排格子一致，或尚未导入该年级真实课表。'}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="data-audit-issues-panel">
          <div className="data-audit-issues-head">
            <div>
              <span className="data-audit-kicker">核对结果</span>
              <h3>{selectedGrade}数据诊断清单</h3>
            </div>
            <div className="data-audit-issue-counts">
              <span>{dataAuditReport.summary.criticalCount} 严重</span>
              <span>{dataAuditReport.summary.warningCount} 提醒</span>
            </div>
          </div>

          <div className="data-audit-issue-list">
            {dataAuditReport.issues.length > 0 ? dataAuditReport.issues.map(issue => (
              <article key={issue.id} className={`data-audit-issue-card data-audit-issue-card--${issue.severity}`}>
                <div className="data-audit-issue-title">
                  <span>{issue.title}</span>
                  <strong>{issue.severity === 'critical' ? '严重' : '提醒'}</strong>
                </div>
                <p>{issue.message}</p>
                <small>{issue.suggestedAction}</small>
              </article>
            )) : (
              <div className="data-audit-empty">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>当前年级没有发现会阻断算法的数据核对问题</span>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="course-scheduler-root flex flex-col h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-600">
      
      {/* LOADING SCREEN OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-white/90 z-50 flex flex-col gap-4 items-center justify-center animate-in fade-in duration-200">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">排课辅助系统正在搭载数据底层，请稍后...</p>
        </div>
      )}

      {/* TOP HEADER NAVIGATION AREA */}
      <header id="main_header" className={`scheduler-main-header scheduler-glass-topbar h-16 flex items-center justify-between px-6 shrink-0 z-30 ${isTabLayoutPinned ? 'scheduler-main-header--tabs' : ''}`}>
        <div className="scheduler-brand-strip flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded flex items-center justify-center shadow-md shadow-blue-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-lg tracking-tight text-slate-900 leading-none">智能排课系统</span>
            </div>
          </div>

          {renderSchedulerViewTabs()}
        </div>

        {/* SYSTEM ACTIONS & HEADER CONTROLS */}
        <div className="scheduler-header-actions flex items-center gap-4">
          <button
            onClick={handleOpenJSONModal}
            title="JSON 数据导入与导出备份"
            className="scheduler-glass-action px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>💾 导入/导出 JSON</span>
          </button>
          {hasCriticalConflicts ? (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课硬冲突详情"
              className="scheduler-glass-action scheduler-glass-action--danger px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors animate-pulse hover:animate-none"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{criticalConflicts.length} 处硬冲突 · {warningConflicts.length} 条资源提醒 · {preferenceDiagnostics.length} 条偏好诊断</span>
            </button>
          ) : hasDiagnosticWarnings ? (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课诊断提醒"
              className="scheduler-glass-action scheduler-glass-action--warning px-3 py-1.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>0 处硬冲突 · {warningConflicts.length} 条资源提醒 · {preferenceDiagnostics.length} 条偏好诊断</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课诊断详情"
              className="scheduler-glass-action scheduler-glass-action--ok px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>硬冲突与提醒均为 0</span>
            </button>
          )}

          <div className="scheduler-term-chip bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            2026学期 · 第15周
          </div>

          <button
            onClick={() => setShowRemarksModal(true)}
            title="查看本周备注汇总"
            className="scheduler-glass-action scheduler-glass-action--info px-3 py-1.5 border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-800 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
          >
            <MessageSquareText className="w-3.5 h-3.5 text-sky-600" />
            <span>备注汇总</span>
            <span className="min-w-5 rounded-full bg-white px-1.5 py-0.5 text-[10px] leading-none text-sky-700 border border-sky-100">
              {weeklyRemarks.length}
            </span>
          </button>

          <button
            onClick={handleResetData}
            title="重置为默认数据"
            className="scheduler-glass-action scheduler-icon-action p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </header>

      {activeTab === 'board' && (
        <div className={`scheduler-pinned-filter-bar ${isTabLayoutPinned ? 'is-visible' : ''}`} aria-hidden={!isTabLayoutPinned}>
          {isTabLayoutPinned && (
            <div className="scheduler-pinned-filter-inner">
              {renderBoardModeToggle('pinned')}
              {renderBoardFilters('pinned')}
            </div>
          )}
        </div>
      )}

      {/* THREE SECTION WORKFLOW LAYOUT */}
      {activeTab === 'board' && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* MIDDLE SECTION: MAIN VIEW TIMETABLE GRID */}
          <main id="main_grid" className="scheduler-board-scroll flex-1 p-6 flex flex-col min-w-0 overflow-y-auto" onScroll={handleSchedulerScroll}>
            
            {/* VIEW TITLE AND ACTIVE FILTERS HEADBOARD */}
            <div className={`scheduler-page-head scheduler-board-head flex justify-between items-end mb-4 shrink-0 ${isTabLayoutPinned ? 'scheduler-page-head--collapsed' : ''}`}>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {getBoardHeadingTitle()}
                  </h2>
                  <select 
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-full px-2.5 py-0.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="初一">初一年级</option>
                    <option value="初二">初二年级</option>
                    <option value="初三">初三年级</option>
                    <option value="高一">高一年级</option>
                    <option value="高二">高二年级</option>
                    <option value="高三">高三年级</option>
                  </select>
                  {renderBoardModeToggle('head')}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {getBoardHeadingDescription()}
                </p>
              </div>

              {/* GRID INTERACTIVE FILTERS */}
              <div className="flex items-center gap-2">
                {renderBoardFilters('head')}
              </div>
            </div>

            {/* TIMETABLE DYNAMIC LAYOUT: THE GEOMETRIC GRID */}
            {boardDisplayMode === 'time' ? (
            <div className="scheduler-timetable-shell min-w-[700px]">
              
              {/* Columns Header (Monday - Friday) */}
              <div className="scheduler-weekday-header grid grid-cols-6 shrink-0 select-none">
                <div className="scheduler-weekday-cell p-3 flex items-center justify-center text-[11px] font-bold text-slate-400">
                  时刻节段
                </div>
                {DAYS.map((day) => {
                  return (
                    <div
                      key={day.num}
                      className="scheduler-weekday-cell p-3 text-center flex flex-col items-center justify-center"
                    >
                      <span className="text-xs font-bold text-slate-900">
                        {day.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                        {day.engName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows (Schedule slots, Break items & Lunch Spacers) */}
              <div className="scheduler-timetable-rows">
                {TIMETABLE_BLOCKS.map((block, blockIdx) => {
                  if (block.type === 'break') {
                    return (
                      <div key={`spacer-${blockIdx}`} className="scheduler-break-block grid grid-cols-6 h-10 bg-slate-50/50 hover:bg-slate-50 text-slate-400 border-b border-slate-200">
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center items-center">
                          <span className="text-[10px] font-bold tracking-tight">大课间休息</span>
                          <span className="text-[8px] text-slate-400 leading-none">09:30-10:10</span>
                        </div>
                        <div className="col-span-5 flex items-center justify-center text-xs font-semibold text-slate-500 space-x-1">
                          <span>大课间体育操与自主活动时段</span>
                        </div>
                      </div>
                    );
                  }

                  if (block.type === 'lunch') {
                    return (
                      <div key={`spacer-${blockIdx}`} className="scheduler-lunch-block grid grid-cols-6 h-9 bg-slate-100/50 text-slate-400 border-b border-slate-200">
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center items-center">
                          <span className="text-[10px] font-bold">午后休餐</span>
                          <span className="text-[8px] text-slate-400">11:40-14:00</span>
                        </div>
                        <div className="col-span-5 flex items-center justify-center text-xs font-semibold text-slate-500 space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>午休自主辅餐洗漱 · 行政班自休时段不排课</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <section
                      key={block.module.id}
                      data-period-module={block.module.id}
                      className={`period-module-group ${block.module.className}`}
                    >
                      <div className="period-module-group-title">
                        <span>{block.module.title}</span>
                        <small>{block.module.subtitle}</small>
                      </div>

                      {block.module.periodNums.map((periodNum) => {
                        const periodMeta = PERIODS_METADATA.find(item => item.type === 'period' && item.num === periodNum);
                        if (!periodMeta) return null;

                        const periodColorMap: Record<number, { bg: string; border: string; label: string; tag: string; tagBg: string }> = {
                          1: { bg: 'bg-amber-50/80',   border: 'border-l-2 border-amber-400',   label: 'text-amber-900',  tag: '上午',   tagBg: 'bg-amber-100 text-amber-700' },
                          2: { bg: 'bg-amber-50/80',   border: 'border-l-2 border-amber-400',   label: 'text-amber-900',  tag: '上午',   tagBg: 'bg-amber-100 text-amber-700' },
                          3: { bg: 'bg-teal-50/70',    border: 'border-l-2 border-teal-400',    label: 'text-teal-900',   tag: '上午',   tagBg: 'bg-teal-100 text-teal-700' },
                          4: { bg: 'bg-teal-50/70',    border: 'border-l-2 border-teal-400',    label: 'text-teal-900',   tag: '上午',   tagBg: 'bg-teal-100 text-teal-700' },
                          5: { bg: 'bg-indigo-50/70',  border: 'border-l-2 border-indigo-400',  label: 'text-indigo-900', tag: '下午',   tagBg: 'bg-indigo-100 text-indigo-700' },
                          6: { bg: 'bg-indigo-50/70',  border: 'border-l-2 border-indigo-400',  label: 'text-indigo-900', tag: '下午',   tagBg: 'bg-indigo-100 text-indigo-700' },
                          7: { bg: 'bg-violet-50/70',  border: 'border-l-2 border-violet-400',  label: 'text-violet-900', tag: '下午',   tagBg: 'bg-violet-100 text-violet-700' },
                          8: { bg: 'bg-violet-50/70',  border: 'border-l-2 border-violet-400',  label: 'text-violet-900', tag: '下午',   tagBg: 'bg-violet-100 text-violet-700' },
                        };
                        const pc = periodColorMap[periodMeta.num] || { bg: 'bg-slate-50/20', border: '', label: 'text-slate-800', tag: '', tagBg: '' };
                        const periodModuleStartClass = isPeriodModuleStart(periodMeta.num) ? 'period-module-row--start' : '';
                        const periodModuleEndClass = isPeriodModuleEnd(periodMeta.num) ? 'period-module-row--end' : '';

                        return (
                          <div
                            key={`period-row-${periodMeta.num}`}
                            className={`period-module-row ${periodModuleStartClass} ${periodModuleEndClass} grid grid-cols-6 border-b border-slate-100`}
                            style={{gridAutoRows: '1fr'}}
                          >
                            <div className={`period-module-label p-2 border-r border-slate-200 text-center flex flex-col justify-center items-center shrink-0 ${pc.bg} ${pc.border}`}>
                              <span className={`text-[11px] font-bold ${pc.label}`}>{periodMeta.name}</span>
                              <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">{periodMeta.time}</span>
                              {pc.tag && <span className={`mt-1 text-[8px] font-bold px-1 py-0.5 rounded-full ${pc.tagBg}`}>{pc.tag}</span>}
                            </div>

                            {DAYS.map((day) => {
                              const cellItems = getFilteredSchedules(day.num, periodMeta.num);
                              const cellConflicts = getCellConflicts(day.num, periodMeta.num);
                              const hasMany = cellItems.length > 3;
                              const periodScrollbarClass = getPeriodScrollbarClass(periodMeta.num);

                              return (
                                <div
                                  key={`${day.num}-${periodMeta.num}`}
                                  className={`period-module-cell border-r last:border-r-0 border-slate-200 ${cellConflicts.length > 0 ? 'bg-orange-50/20' : 'bg-transparent'}`}
                                >
                                  {cellItems.length > 0 ? (
                                    <div className={`p-1 flex flex-col gap-1 ${periodScrollbarClass} ${hasMany ? 'max-h-[320px] overflow-y-auto' : ''}`}>
                                      {cellItems.map((item) => {
                                        const isSelected = selectedCell && selectedCell.id === item.id;
                                        return (
                                          <div
                                            key={item.id}
                                            onClick={() => handleSelectCell(item)}
                                            className={`schedule-remark-card relative p-1.5 rounded text-left cursor-pointer transition-all shrink-0 ${item.adjustmentNote ? 'pr-9' : ''} ${getSubjectColorClass(item.subject, item.isFinished, item.isTemp)} ${isSelected ? 'ring-2 ring-blue-600 shadow-md' : 'hover:shadow-xs'}`}
                                          >
                                            {item.adjustmentNote && (
                                              <span className="schedule-remark-badge" title={item.adjustmentNote.summary}>
                                                代
                                              </span>
                                            )}
                                            <div className="font-bold text-[11px] leading-tight truncate">
                                              {item.subject} · {item.teacherName}
                                            </div>
                                            <div className="text-[9px] text-slate-600/80 truncate mt-0.5">
                                              {item.teachingClassName}
                                            </div>
                                            {item.adjustmentNote && (
                                              <div className="schedule-remark-line" title={item.adjustmentNote.summary}>
                                                {item.adjustmentNote.originalTeacherName || '原老师'} → {item.adjustmentNote.substituteTeacherName || item.teacherName}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="h-full min-h-[72px] flex items-center justify-center text-[10px] text-slate-200 select-none">
                                      -
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            </div>
            ) : boardDisplayMode === 'class' ? renderClassBoardView() : renderDayCardsBoardView()}
          </main>

        </div>
      )}

      {/* FLOATING DIALOG: INTELLIGENT DIAGNOSTICS & TEMPORARY SUBSTITUTE */}
      {showSubstituteDialog && (
        <div
          data-ui-surface="substitute-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
          style={{ position: 'fixed', inset: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="数据诊断及临时代课调配"
        >
          <button
            type="button"
            aria-label="关闭调配弹窗"
            onClick={closeSubstituteDialog}
            className="absolute inset-0 cursor-default"
          />

          <section className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4 select-none">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></span>
                数据诊断及临时代课调配
              </h3>
              <button
                type="button"
                aria-label="关闭调配弹窗"
                onClick={closeSubstituteDialog}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {selectedCell && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-800 tracking-tight">【检查授课时段单元】</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-white/70 border border-blue-100 rounded-full px-2 py-0.5">
                      周{selectedCell.day} 第{selectedCell.period}节
                    </span>
                  </div>

                  <div className="grid gap-2 rounded-lg border border-blue-100 bg-white p-3 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400">任教班次</span>
                      <span className="font-bold text-slate-800">{selectedCell.teachingClassName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400">学科/教室</span>
                      <span className="font-semibold text-slate-700">{selectedCell.subject} | {selectedCell.classroomName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400">原定老师</span>
                      <span className="font-bold text-slate-700">{selectedCell.adjustmentNote?.originalTeacherName || selectedCell.teacherName}</span>
                    </div>
                    {selectedCell.adjustmentNote && (
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400">当前代课</span>
                        <span className="font-bold text-orange-700">{selectedCell.teacherName}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg border border-sky-100 bg-white/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-800">调班原因备注</span>
                      <span className="text-[10px] text-slate-400">会同步写入 JSON 课表项</span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {SUBSTITUTE_REASON_OPTIONS.map(reason => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setSubstituteReason(reason)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                            substituteReason === reason
                              ? 'border-sky-300 bg-sky-100 text-sky-800'
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-200 hover:text-sky-700'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={substituteReasonDetail}
                      onChange={(e) => setSubstituteReasonDetail(e.target.value)}
                      placeholder="可补充更具体的备注，例如：上午9点临时请假，第二节语文由张老师改为李老师代课"
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  {selectedCell.adjustmentNote && (
                    <div className="mt-2 rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2 text-[10px] font-bold text-orange-700">
                      <div>当前备注：{selectedCell.adjustmentNote.summary}</div>
                      {getScheduleAdjustmentLogs(selectedCell).length > 1 && (
                        <div className="mt-2 space-y-1 border-t border-orange-100 pt-2 text-orange-600">
                          <span className="block text-[9px] text-orange-400">历史调配日志</span>
                          {getScheduleAdjustmentLogs(selectedCell).map(log => (
                            <div key={log.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{log.chainIndex ? `${log.chainIndex}. ` : ''}{log.summary}</span>
                              <span className="shrink-0 text-[8px] text-orange-400">{new Date(log.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    {substituteLoading ? (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-blue-100 bg-white p-5">
                        <div className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-[10px] text-slate-500">正在精密校算同组教师课时负荷...</span>
                      </div>
                    ) : (
                      substituteData && (
                        <div className="space-y-3">
                          <span className="block text-[11px] font-bold text-blue-900">推荐代/顶替本学课老师方案：</span>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {substituteData.recommendations.map((rec) => {
                              const disabled = rec.hasConflictOnChosenSlot || rec.hasLoadConflict || rec.hasAvailabilityConflict;
                              return (
                                <div
                                  key={rec.teacher.id}
                                  className={`rounded-lg border border-slate-200 bg-white p-3 text-[10.5px] ${disabled ? 'opacity-50' : ''}`}
                                >
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800">
                                      {rec.teacher.name}老师 ({rec.teacher.subjects[0]})
                                    </span>
                                  </div>

                                  <ul className="text-[9.5px] text-slate-500 list-disc list-inside space-y-0.5">
                                    {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                  </ul>

                                  {!disabled ? (
                                    <button
                                      type="button"
                                      onClick={() => handleApplySubstitute(rec.teacher.id)}
                                      className="mt-2 w-full rounded bg-blue-600 py-1.5 text-[9.5px] font-bold text-white transition-colors hover:bg-blue-700"
                                    >
                                      选择将其调整为此代课教师
                                    </button>
                                  ) : (
                                    <span className="mt-2 block text-center text-[8.5px] font-medium text-rose-500">
                                      有冲突！无法安排代课
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowConflictsModal(true)}
                className="w-full rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-left transition-colors hover:bg-indigo-50"
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">当前排课诊断反馈</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    hasCriticalConflicts ? 'bg-rose-100 text-rose-800' : hasDiagnosticWarnings ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {diagnosticSummary}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  点击此处可打开可滑动诊断详情，分开查看硬冲突、资源负载与数据完整性提醒。
                </p>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* FLOATING DIALOG: SUBSTITUTE CONFIRMATION */}
      {pendingSubstituteConfirm && (
        <div
          data-ui-surface="substitute-confirm-dialog"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="确认临时代课调整"
        >
          <button
            type="button"
            aria-label="取消临时代课调整"
            onClick={cancelPendingSubstitute}
            className="absolute inset-0 cursor-default"
          />

          <section className="substitute-confirm-panel relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white/[0.88] text-left shadow-2xl">
            <div className="border-b border-white/60 bg-white/40 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-sm">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-950">确认临时代课调整</h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    请确认这条调配备注，确认后会同步写入本地 JSON 课表数据。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-extrabold text-sky-800 shadow-sm">
                    {pendingSubstituteConfirm.teachingClassName}
                  </span>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                    周{pendingSubstituteConfirm.day} · 第{pendingSubstituteConfirm.period}节 · {pendingSubstituteConfirm.periodTimeLabel}
                  </span>
                </div>

                <div className="grid gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">课程</span>
                    <span className="font-extrabold text-slate-800">{pendingSubstituteConfirm.subject}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">教室</span>
                    <span className="font-bold text-slate-700">{pendingSubstituteConfirm.classroomName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">原因</span>
                    <span className="font-bold text-amber-700">{pendingSubstituteConfirm.reason}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400">本次调出</span>
                  <span className="text-sm font-extrabold text-slate-900">{pendingSubstituteConfirm.fromTeacherName}</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400">临时代课</span>
                  <span className="text-sm font-extrabold text-blue-700">{pendingSubstituteConfirm.substituteTeacherName}</span>
                </div>
              </div>

              {pendingSubstituteConfirm.rootOriginalTeacherName !== pendingSubstituteConfirm.fromTeacherName && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[11px] font-bold leading-relaxed text-slate-500">
                  原定老师：{pendingSubstituteConfirm.rootOriginalTeacherName} · 本次是在既有代课基础上继续调整
                </div>
              )}

              <div className="rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-3 text-xs font-bold leading-relaxed text-orange-800">
                {pendingSubstituteConfirm.summary}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/60 bg-white/40 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelPendingSubstitute}
                className="min-h-11 rounded-xl border border-slate-200 bg-white/70 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmPendingSubstitute}
                className="min-h-11 rounded-xl bg-blue-600 px-5 py-2 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-blue-700"
              >
                确认调整并写入备注
              </button>
            </div>
          </section>
        </div>
      )}

      {/* FLOATING DIALOG: WEEKLY REMARKS TIMELINE */}
      {showRemarksModal && (
        <div
          data-ui-surface="remarks-summary-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="本周备注汇总"
        >
          <button
            type="button"
            aria-label="关闭备注汇总"
            onClick={() => setShowRemarksModal(false)}
            className="absolute inset-0 cursor-default"
          />

          <section className="remarks-summary-panel relative z-10 flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 text-left shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <MessageSquareText className="h-4 w-4 text-sky-600" />
                  本周备注汇总
                </h3>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  2026学期 · 第15周 · {selectedGrade} · 共 {weeklyRemarks.length} 条调班/走班备注
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭备注汇总"
                onClick={() => setShowRemarksModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="remarks-timeline overflow-y-auto p-5">
              <div className="grid gap-3 md:grid-cols-5">
                {DAYS.map(day => {
                  const dayRemarks = getRemarksForDay(day.num);
                  return (
                    <section key={`remark-day-${day.num}`} className="rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold text-slate-900">{day.name}</div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{day.engName}</div>
                        </div>
                        <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                          {dayRemarks.length}
                        </span>
                      </div>

                      {dayRemarks.length > 0 ? (
                        <div className="space-y-2">
                          {dayRemarks.map(remark => (
                            <article key={remark.adjustmentNote.id} className="remarks-timeline-item">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="font-mono text-[9px] font-bold text-sky-700">
                                  {getPeriodTimeLabel(remark.period)}
                                </span>
                                <div className="flex shrink-0 items-center gap-1">
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500">
                                    第{remark.period}节
                                  </span>
                                  <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-bold text-sky-700">
                                    第{remark.adjustmentNote.chainIndex || 1}次调配
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] font-extrabold leading-snug text-slate-800">
                                {remark.subject} · {remark.teachingClassName}
                              </div>
                              <div className="remarks-handoff">
                                <span>{remark.adjustmentNote.fromTeacherName || remark.adjustmentNote.originalTeacherName || '原老师'}</span>
                                <span>→</span>
                                <span>{remark.adjustmentNote.toTeacherName || remark.adjustmentNote.substituteTeacherName || remark.teacherName}</span>
                              </div>
                              <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-slate-600">
                                {remark.adjustmentNote.summary}
                              </p>
                              <div className="mt-2 text-[9px] font-bold text-slate-400">
                                原因：{remark.adjustmentNote.reason}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-[112px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-300">
                          暂无备注
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ALTERNATIVE VIEW: MANAGEMENT SCREEN */}
      {activeTab === 'management' && (
        <main id="data_management" className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-slate-50 text-left w-full" onScroll={handleSchedulerScroll}>
          {/* Scrollable overview area */}
          <div className={`scheduler-page-head management-header px-6 pt-4 pb-2 shrink-0 border-b border-slate-200/80 ${isTabLayoutPinned ? 'scheduler-page-head--collapsed' : ''}`}>
            <div className="mb-2 flex flex-wrap justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-950 tracking-tight">学校教学分工与基础数据</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-4xl leading-relaxed">
                  点击表格中的记录，可直接修改学生的请假信息、走班分配，以及教师的课表偏好和紧急任务状态。数据将热同步至排课底座。
                </p>
              </div>
              
              {/* Grade Selector on Management Page */}
              <div className="bg-white rounded-lg border border-slate-200 p-1 flex items-center shadow-sm shrink-0">
                <span className="text-xs text-slate-400 font-bold px-2">当前所选年级:</span>
                <select 
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded px-2.5 py-1 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="初一">初一年级</option>
                  <option value="初二">初二年级</option>
                  <option value="初三">初三年级</option>
                  <option value="高一">高一年级</option>
                  <option value="高二">高二年级</option>
                  <option value="高三">高三年级</option>
                </select>
              </div>
            </div>

            <div className="management-stats-rail grid grid-cols-2 xl:grid-cols-4 gap-2 mb-2">
              {managementStats.map(stat => (
                <div key={stat.label} className={`rounded-lg border px-2.5 py-1.5 ${stat.className}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-white/70 border border-white/80 flex items-center justify-center shrink-0">
                        {stat.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-500">{stat.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{stat.detail}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black tabular-nums">{stat.value}</span>
                      <span className="ml-1 text-[10px] font-bold text-slate-500">{stat.suffix}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sub-tab selection menu */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMgmtSubTab('teachers')}
              className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'teachers' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
            >
              教师排课大表 ({gradeTeachers.length} 人)
            </button>
            <button
              onClick={() => setMgmtSubTab('assignments')}
              className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'assignments' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
            >
              行政班授课分工表 (Excel视图)
            </button>
            <button
              onClick={() => setMgmtSubTab('students')}
              className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'students' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
            >
              学生走班花名册 ({gradeStudents.length} 人)
            </button>
            <button
              onClick={() => setMgmtSubTab('audit')}
              className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'audit' ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
            >
              数据核对 ({dataAuditReport.summary.totalIssues} 条)
            </button>
            <button
              onClick={() => setMgmtSubTab('preferences')}
              className={`h-9 px-3 rounded-lg font-bold text-sm border transition-colors ${mgmtSubTab === 'preferences' ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-300'}`}
            >
              排课偏好设置 ({preferenceDiagnostics.length} 条)
            </button>
          </div>
          </div>{/* end scrollable overview area */}

          {/* Scrollable table content area */}
          <div className="management-content-area px-6 py-3 pb-6 min-h-0 flex flex-col overflow-visible">

          {/* 1. TEACHERS TABLE */}
          {mgmtSubTab === 'teachers' && (
            <div className={managementTableShellClass}>
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  {selectedGrade}年级教师聘任偏好与排课量限制表
                </h3>
                <button
                  onClick={() => setShowAddTeacherModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加教师
                </button>
              </div>
              <div className={managementTableScrollClass}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200">工号</th>
                      <th className="p-3 border-r border-slate-200">教师姓名</th>
                      <th className="p-3 border-r border-slate-200">授课学科</th>
                      <th className="p-3 border-r border-slate-200">所属教研组</th>
                      <th className="p-3 border-r border-slate-200">每周排课上限</th>
                      <th className="p-3 border-r border-slate-200">休假/偏好备注</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {getGradeTeachers().map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 border-r border-slate-100 font-mono font-bold text-slate-400">{t.id}</td>
                        <td className="p-3 border-r border-slate-100 font-bold text-slate-800">{t.name}</td>
                        <td className="p-3 border-r border-slate-100">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                            {t.subjects.join('/')}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-100 text-slate-600">{t.department}</td>
                        <td className="p-3 border-r border-slate-100 font-semibold text-slate-700">
                          {t.maxWeeklyHours > 0 ? `${t.maxWeeklyHours} 节/周` : '未导入'}
                        </td>
                        <td className="p-3 border-r border-slate-100">
                          {t.preferences && !t.preferences.startsWith('主要负责') ? (
                            <span className="text-orange-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {t.preferences}
                            </span>
                          ) : (
                            <span className="text-slate-400">出勤正常</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setEditingTeacher(t)}
                            className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 hover:border-blue-200 transition-colors font-bold"
                          >
                            编辑偏好
                          </button>
                        </td>
                      </tr>
                    ))}
                    {getGradeTeachers().length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3">
                              <Users className="w-7 h-7 text-blue-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">当前年级暂无教师数据</p>
                            <p className="text-xs text-slate-300 mt-1">请切换年级或点击「添加教师」录入数据</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. CLASS ASSIGNMENTS EXCEL-STYLE TABLE */}
          {mgmtSubTab === 'assignments' && (
            <div className={managementTableShellClass}>
              <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  {selectedGrade}年级教师教学岗位聘任与授课分工大表
                </h3>
                <span className="text-xs text-slate-400 font-semibold">还原 Excel 经典数据视图</span>
              </div>
              <div className={managementTableScrollClass}>
                <table className="w-full text-left border-collapse text-xs text-center">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 text-center">
                      <th className="p-3 border-r border-slate-200 text-left">班级</th>
                      <th className="p-3 border-r border-slate-200 text-left">班型/分层</th>
                      <th className="p-3 border-r border-slate-200 bg-indigo-50/50 text-indigo-800 text-center">班主任</th>
                      <th className="p-3 border-r border-slate-200 text-center">语文</th>
                      <th className="p-3 border-r border-slate-200 text-center">数学</th>
                      <th className="p-3 border-r border-slate-200 text-center">英语</th>
                      <th className="p-3 border-r border-slate-200 text-center">物理</th>
                      <th className="p-3 border-r border-slate-200 text-center">化学</th>
                      <th className="p-3 border-r border-slate-200 text-center">生物</th>
                      <th className="p-3 border-r border-slate-200 text-center">政治</th>
                      <th className="p-3 border-r border-slate-200 text-center">历史</th>
                      <th className="p-3 border-r border-slate-200 text-center">地理</th>
                      <th className="p-3 border-r border-slate-200 text-center">体育</th>
                      <th className="p-3 text-center">通用/劳动</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(classNum => {
                      const clsTeachingClasses = teachingClasses.filter(tc => tc.grade === selectedGrade && tc.classNumber === classNum);
                      const sampleTc = clsTeachingClasses[0];
                      
                      const renderSubjectTeacherSelect = (subName: string) => {
                        const tc = clsTeachingClasses.find(x => x.subject === subName);
                        if (!tc) return <td className="p-3 border-r border-slate-100 text-slate-300 text-center">-</td>;
                        const subjectTeachers = getGradeTeachers().filter(t => t.subjects.includes(subName));
                        return (
                          <td className="p-1 border-r border-slate-100 text-center">
                            <select
                              value={tc.teacherId}
                              onChange={(e) => handleSubjectTeacherChange(classNum, subName, e.target.value)}
                              className="bg-transparent text-xs text-slate-700 text-center w-full focus:ring-0 cursor-pointer border-0 py-1"
                            >
                              {subjectTeachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                              {!subjectTeachers.some(t => t.id === tc.teacherId) && (
                                <option value={tc.teacherId}>
                                  {teachers.find(t => t.id === tc.teacherId)?.name || '未知'}
                                </option>
                              )}
                            </select>
                          </td>
                        );
                      };

                      return (
                        <tr key={classNum} className="hover:bg-slate-50/50 transition-colors text-center">
                          <td className="p-3 border-r border-slate-100 font-bold text-slate-800 text-left">{classNum}班</td>
                          <td className="p-3 border-r border-slate-100 text-slate-600 font-semibold text-left">{sampleTc?.combination || '普通班'}</td>
                          <td className="p-1 border-r border-slate-100 bg-indigo-50/20 text-center">
                            <select
                              value={teachers.find(t => t.preferences?.includes('担任' + selectedGrade + classNum + '班班主任'))?.id || ''}
                              onChange={(e) => handleAdviserChange(classNum, e.target.value)}
                              className="bg-transparent text-xs font-bold text-indigo-700 text-center w-full focus:ring-0 cursor-pointer border-0 py-1"
                            >
                              <option value="">未设定</option>
                              {getGradeTeachers().map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          {renderSubjectTeacherSelect('语文')}
                          {renderSubjectTeacherSelect('数学')}
                          {renderSubjectTeacherSelect('英语')}
                          {renderSubjectTeacherSelect('物理')}
                          {renderSubjectTeacherSelect('化学')}
                          {renderSubjectTeacherSelect('生物')}
                          {renderSubjectTeacherSelect('政治')}
                          {renderSubjectTeacherSelect('历史')}
                          {renderSubjectTeacherSelect('地理')}
                          {renderSubjectTeacherSelect('体育')}
                          {renderSubjectTeacherSelect('通用')}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

            {/* 3. STUDENTS TABLE */}
            {mgmtSubTab === 'students' && (
              <div className={managementTableShellClass}>
                <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    {selectedGrade}年级学生走班绑定与考勤异常登记表
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">记录考勤请假与动态走班代码</span>
                </div>
                <div className={managementTableScrollClass}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200">学号</th>
                        <th className="p-3 border-r border-slate-200">学生姓名</th>
                        <th className="p-3 border-r border-slate-200">班级/分层</th>
                        <th className="p-3 border-r border-slate-200">走班选科组合</th>
                        <th className="p-3 border-r border-slate-200">绑定走班班级ID</th>
                        <th className="p-3 border-r border-slate-200">特殊情况/假条</th>
                        <th className="p-3">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getGradeStudents().map(s => {
                        const sampleTcId = s.classes[0];
                        const sampleTc = teachingClasses.find(x => x.id === sampleTcId);
                        const studentClassLabel = sampleTc ? `${selectedGrade}${sampleTc.classNumber}班` : '未入班';
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 border-r border-slate-100 font-mono font-bold text-slate-400">{s.id}</td>
                            <td className="p-3 border-r border-slate-100 font-bold text-slate-800">{s.name}</td>
                            <td className="p-3 border-r border-slate-100 font-semibold text-slate-700">{studentClassLabel}</td>
                            <td className="p-3 border-r border-slate-100">
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                                {s.electiveCombo}
                              </span>
                            </td>
                            <td className="p-3 border-r border-slate-100 font-mono text-slate-500 line-clamp-1 max-w-[200px]" title={s.classes.join(', ')}>
                              {s.classes.join(', ')}
                            </td>
                            <td className="p-3 border-r border-slate-100">
                              {s.note ? (
                                <span className="text-rose-600 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  {s.note}
                                </span>
                              ) : (
                                <span className="text-slate-400">正常出勤</span>
                              )}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => setEditingStudent(s)}
                                className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-slate-200 hover:border-emerald-200 transition-colors font-bold"
                              >
                                编辑走班
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {getGradeStudents().length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                                <User className="w-7 h-7 text-emerald-300" />
                              </div>
                              <p className="text-sm font-bold text-slate-400">当前年级暂无学生走班数据</p>
                              <p className="text-xs text-slate-300 mt-1">{selectedGrade}年级走班数据将在学生绑定选科组合后自动加载</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {mgmtSubTab === 'audit' && renderDataAuditPanel()}
            {mgmtSubTab === 'preferences' && renderPreferenceSettingsPanel()}
          </div>{/* end scrollable content area */}
        </main>
      )}

      {/* EDIT TEACHER MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1">
                  <User className="w-5 h-5 text-blue-600" />
                  编辑教师与偏好设置
                </h3>
                <button onClick={() => setEditingTeacher(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-600 mb-1">教师姓名</label>
                  <input
                    type="text"
                    value={editingTeacher.name}
                    onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">休假/排课偏好 (紧急任务、出差、请假等)</label>
                  <textarea
                    rows={3}
                    value={editingTeacher.preferences}
                    onChange={e => setEditingTeacher({ ...editingTeacher, preferences: e.target.value })}
                    placeholder="例如：因病假本周三停课，或市级教研任务需回避周五..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                  <button onClick={() => setEditingTeacher(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-bold">取消</button>
                  <button onClick={handleSaveTeacher} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-md shadow-blue-200 transition-colors font-bold">保存并同步</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-emerald-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1">
                  <User className="w-5 h-5 text-emerald-600" />
                  编辑学生与走班关联
                </h3>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">学生姓名</label>
                    <input
                      type="text"
                      value={editingStudent.name}
                      onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">选考组合</label>
                    <input
                      type="text"
                      value={editingStudent.electiveCombo}
                      onChange={e => setEditingStudent({ ...editingStudent, electiveCombo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-slate-600 mb-1">请假/特殊备注</label>
                  <input
                    type="text"
                    value={editingStudent.note || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, note: e.target.value })}
                    placeholder="例如：因病请假三天，或隔离观察..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">参与走班班级 (用逗号分隔多个班级代码)</label>
                  <input
                    type="text"
                    value={editingStudent.classes.join(', ')}
                    onChange={e => {
                      const str = e.target.value;
                      const arr = str.split(',').map(s => s.trim()).filter(Boolean);
                      setEditingStudent({ ...editingStudent, classes: arr });
                    }}
                    placeholder="例如：C001, C002"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                  <button onClick={() => setEditingStudent(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-bold">取消</button>
                  <button onClick={handleSaveStudent} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-md shadow-emerald-200 transition-colors font-bold">保存并同步</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD TEACHER MODAL */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1">
                  <Users className="w-5 h-5 text-blue-600" />
                  添加/聘任新任教师规制
                </h3>
                <button onClick={() => setShowAddTeacherModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTeacherSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-600 mb-1">姓名</label>
                  <input 
                    type="text" 
                    required 
                    value={newTeacherName} 
                    onChange={e => setNewTeacherName(e.target.value)}
                    placeholder="例如: 邓稼先" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">主授科目</label>
                    <select 
                      value={newTeacherSubject} 
                      onChange={e => setNewTeacherSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="语文">语文</option>
                      <option value="数学">数学</option>
                      <option value="英语">英语</option>
                      <option value="物理">物理</option>
                      <option value="化学">化学</option>
                      <option value="生物">生物</option>
                      <option value="政治">政治</option>
                      <option value="历史">历史</option>
                      <option value="地理">地理</option>
                      <option value="体育">体育</option>
                      <option value="通用">通用/劳动</option>
                      <option value="音乐">音乐</option>
                      <option value="美术">美术</option>
                      <option value="信息技术">信息技术</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">课时上限(节/周)</label>
                    <input 
                      type="number" 
                      required 
                      value={newTeacherWeeklyHours} 
                      onChange={e => setNewTeacherWeeklyHours(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">电话</label>
                  <input 
                    type="text" 
                    value={newTeacherPhone} 
                    onChange={e => setNewTeacherPhone(e.target.value)}
                    placeholder="选填" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">教研组部门</label>
                  <input 
                    type="text" 
                    value={newTeacherDept} 
                    onChange={e => setNewTeacherDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddTeacherModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-bold">取消</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-md shadow-blue-200 transition-colors font-bold">确认新增</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLASSROOM MODAL */}
      {showAddClassroomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-slate-800"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1">
                  <MapPin className="w-5 h-5 text-slate-800" />
                  申请新增走班教学空间
                </h3>
                <button onClick={() => setShowAddClassroomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddClassroomSubmit} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-600 mb-1">教室名称</label>
                  <input 
                    type="text" 
                    required 
                    value={newClassroomName} 
                    onChange={e => setNewClassroomName(e.target.value)}
                    placeholder="例如: 综合楼化学实验室302" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">功能类型</label>
                    <select 
                      value={newClassroomType} 
                      onChange={e => setNewClassroomType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-slate-800"
                    >
                      <option value="ordinary">普通教室</option>
                      <option value="lab">实验研究室</option>
                      <option value="media">多媒体机房</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">容量上限(学生人数)</label>
                    <input 
                      type="number" 
                      required 
                      value={newClassroomCapacity} 
                      onChange={e => setNewClassroomCapacity(parseInt(e.target.value) || 45)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">承载科目</label>
                  <select 
                    value={newClassroomSubject} 
                    onChange={e => setNewClassroomSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="语文">语文</option>
                    <option value="数学">数学</option>
                    <option value="英语">英语</option>
                    <option value="物理">物理</option>
                    <option value="化学">化学</option>
                    <option value="生物">生物</option>
                    <option value="通用">通用/劳动</option>
                    <option value="音乐">音乐</option>
                    <option value="美术">美术</option>
                    <option value="信息技术">信息技术</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAddClassroomModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-bold">取消</button>
                  <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded shadow-md transition-colors font-bold">确认增设</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. JSON IMPORT/EXPORT MODAL */}
      {showJSONModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                教学排课数据 JSON 导入与本地备份
              </h3>
              <button 
                onClick={() => setShowJSONModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                系统采用 100% 本地运行。您可以在此处将当前的全部教师、教室、授课分工及课表网格数据打包导出，复制为 JSON 字符串保存备份，或粘贴之前导出的 JSON 数据流来批量重置初始化排课底座。
              </p>
              
              {jsonError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}
              
              <form onSubmit={handleJSONImportSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700">JSON 数据流编辑与贴入区 (可自由复制或粘贴覆盖)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(jsonRawText);
                          alert("📋 已成功将当前 JSON 数据复制到您的系统剪贴板。");
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded transition-colors"
                      >
                        📋 复制 JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([jsonRawText], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `智能排课系统_数据备份_${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded transition-colors"
                      >
                        ⬇️ 下载 JSON 备份文件
                      </button>
                    </div>
                  </div>
                  <textarea
                    required
                    value={jsonRawText}
                    onChange={e => setJsonRawText(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-[10px] bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="在此处贴入干净的 JSON 备份数据..."
                  />
                </div>
                
                <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClearAllCache}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors font-bold text-xs animate-pulse hover:animate-none"
                  >
                    🗑️ 清空所有本地缓存
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setShowJSONModal(false)} 
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-bold text-xs"
                    >
                      取消
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors font-bold text-xs"
                    >
                      确认覆盖导入
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DIALOG MODAL: CONFLICTS DIAGNOSTICS */}
      {showConflictsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-left">
                <AlertTriangle className={`w-5 h-5 shrink-0 ${hasCriticalConflicts ? 'text-rose-500' : hasDiagnosticWarnings ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">智能排课诊断反馈</h3>
                  <p className="text-[10px] text-slate-400 font-medium">硬冲突、资源负载、课时口径与数据完整性分层检测</p>
                </div>
              </div>
              <button
                onClick={() => setShowConflictsModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-left flex-1">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasCriticalConflicts ? 'bg-rose-50 text-rose-600' : hasDiagnosticWarnings ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">当前校验诊断状态</h4>
                    <p className="text-[10px] text-slate-500">硬冲突不再与 warning 混算，避免误判排课状态</p>
                  </div>
                </div>
                <div className="text-right">
                  {hasCriticalConflicts ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      {criticalConflicts.length} 处硬冲突 / {warningConflicts.length} 条资源提醒 / {preferenceDiagnostics.length} 条偏好诊断
                    </span>
                  ) : hasDiagnosticWarnings ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      0 处硬冲突 / {warningConflicts.length} 条资源提醒 / {preferenceDiagnostics.length} 条偏好诊断
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      硬冲突与提醒均为 0
                    </span>
                  )}
                </div>
              </div>

              {conflicts.length > 0 ? (
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {conflicts.map((c) => (
                    <div 
                      key={c.id} 
                      className={`p-3.5 rounded-xl border flex gap-3 transition-colors ${
                        c.severity === 'critical' 
                          ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50' 
                          : 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {c.severity === 'critical' ? (
                          <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">
                            !
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">
                            i
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase ${
                            c.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {c.severity === 'critical' ? '硬冲突' : '诊断提醒'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 mt-1.5 leading-relaxed">{c.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : preferenceDiagnostics.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">硬冲突与诊断提醒均为 0</h4>
                  <p className="text-[11px] text-slate-400 mt-1">当前教师、教室、课时口径与学生走班基础数据未发现异常。</p>
                </div>
              ) : null}

              {preferenceDiagnostics.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900">偏好诊断</h4>
                    <span className="text-[10px] font-bold text-slate-500">
                      {preferenceCriticalDiagnostics.length} 条严重 / {preferenceWarningDiagnostics.length} 条提醒
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[26vh] overflow-y-auto pr-1">
                    {preferenceDiagnostics.map(item => (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border flex gap-3 transition-colors ${
                          item.severity === 'critical'
                            ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50'
                            : 'bg-sky-50/40 border-sky-100 hover:bg-sky-50/70'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black ${item.severity === 'critical' ? 'bg-rose-500' : 'bg-sky-500'}`}>
                            {item.severity === 'critical' ? '!' : 'i'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase ${item.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'}`}>
                              {item.severity === 'critical' ? '严重偏好' : '偏好提醒'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">{item.ruleName}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 mt-1.5 leading-relaxed">{item.message}</p>
                          {item.suggestedAction && (
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{item.suggestedAction}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowConflictsModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
