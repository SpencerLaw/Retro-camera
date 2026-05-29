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
  RotateCcw
} from 'lucide-react';
import { 
  Role, 
  Teacher, 
  Classroom, 
  TeachingClass, 
  Student, 
  ScheduleItem, 
  Conflict, 
  SubstituteRecommendation 
} from './types';
import { detectConflicts, getSubstituteRecommendations } from './courseSchedulerLogic';
import { 
  INITIAL_TEACHERS, 
  INITIAL_CLASSROOMS, 
  INITIAL_TEACHING_CLASSES, 
  INITIAL_STUDENTS, 
  generatePrepopulatedSchedules 
} from './mockData';
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

export default function App() {
  // Application Data States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  
  // Loading & View Controls
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'board' | 'management'>('board');
  const [selectedGrade, setSelectedGrade] = useState<string>('高二');
  const [mgmtSubTab, setMgmtSubTab] = useState<'teachers' | 'assignments' | 'students'>('teachers');

  // Base Data Edit States
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Filter states for Schedule Grid
  const [combinationFilter, setCombinationFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  // Interactive Cell States
  const [selectedCell, setSelectedCell] = useState<ScheduleItem | null>(null);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);
  const [substituteData, setSubstituteData] = useState<{ item: ScheduleItem; recommendations: SubstituteRecommendation[] } | null>(null);
  
  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [showAddClassroomModal, setShowAddClassroomModal] = useState<boolean>(false);
  const [showSubstituteDialog, setShowSubstituteDialog] = useState<boolean>(false);
  const [showJSONModal, setShowJSONModal] = useState<boolean>(false);
  const [showConflictsModal, setShowConflictsModal] = useState<boolean>(false);
  const [jsonRawText, setJsonRawText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  
  // Modals Form Data
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('语文');
  const [newTeacherWeeklyHours, setNewTeacherWeeklyHours] = useState(16);
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('综合组');

  const [newClassroomName, setNewClassroomName] = useState('');
  const [newClassroomType, setNewClassroomType] = useState<'ordinary'|'lab'|'media'>('ordinary');
  const [newClassroomCapacity, setNewClassroomCapacity] = useState(45);
  const [newClassroomSubject, setNewClassroomSubject] = useState('物理');

  // Load defaults or saved states
  const fetchData = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const savedData = localStorage.getItem('course_scheduler_real_data');
      if (savedData && JSON.parse(savedData).teachers?.length >= 100 && JSON.parse(savedData).schedules?.length >= 400) {
        const parsed = JSON.parse(savedData);
        setTeachers(parsed.teachers || []);
        setClassrooms(parsed.classrooms || []);
        setTeachingClasses(parsed.teachingClasses || []);
        setStudents(parsed.students || []);
        setSchedules(parsed.schedules || []);
        
        const initialConflicts = detectConflicts(
          parsed.schedules || [], 
          parsed.teachers || [], 
          parsed.classrooms || [], 
          parsed.teachingClasses || [], 
          parsed.students || [], 
          { hardStudentConflict: true, hardTeacherConflict: true, hardClassroomConflict: true, allowTeacherPrefRelaxation: false, allowClassroomLoadRelaxation: false }
        );
        setConflicts(initialConflicts);
      } else {
        const initialTeachers = JSON.parse(JSON.stringify(INITIAL_TEACHERS));
        const initialClassrooms = JSON.parse(JSON.stringify(INITIAL_CLASSROOMS));
        const initialTeachingClasses = JSON.parse(JSON.stringify(INITIAL_TEACHING_CLASSES));
        const initialStudents = JSON.parse(JSON.stringify(INITIAL_STUDENTS));
        const initialSchedules = generatePrepopulatedSchedules(initialTeachers, initialClassrooms, initialTeachingClasses);

        setTeachers(initialTeachers);
        setClassrooms(initialClassrooms);
        setTeachingClasses(initialTeachingClasses);
        setStudents(initialStudents);
        setSchedules(initialSchedules);
        
        const initialConflicts = detectConflicts(
          initialSchedules, 
          initialTeachers, 
          initialClassrooms, 
          initialTeachingClasses, 
          initialStudents, 
          { hardStudentConflict: true, hardTeacherConflict: true, hardClassroomConflict: true, allowTeacherPrefRelaxation: false, allowClassroomLoadRelaxation: false }
        );
        setConflicts(initialConflicts);
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

  // Save to localStorage when state changes
  useEffect(() => {
    if (!loading && teachers.length > 0) {
      const dataToSave = {
        teachers,
        classrooms,
        teachingClasses,
        students,
        schedules
      };
      localStorage.setItem('course_scheduler_real_data', JSON.stringify(dataToSave));
    }
  }, [teachers, classrooms, teachingClasses, students, schedules, loading]);

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

        setTeachers(initialTeachers);
        setClassrooms(initialClassrooms);
        setTeachingClasses(initialTeachingClasses);
        setStudents(initialStudents);
        setSchedules(initialSchedules);
        setSelectedCell(null);
        setSubstituteData(null);
        setShowSubstituteDialog(false);
        
        updateConflicts(initialSchedules, initialTeachers, initialClassrooms, initialTeachingClasses, initialStudents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenJSONModal = () => {
    setJsonError('');
    const exportData = {
      teachers,
      classrooms,
      teachingClasses,
      students,
      schedules
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
      
      setTeachers(parsed.teachers);
      setClassrooms(parsed.classrooms);
      setTeachingClasses(parsed.teachingClasses);
      setStudents(parsed.students || []);
      setSchedules(parsed.schedules);
      
      updateConflicts(
        parsed.schedules,
        parsed.teachers,
        parsed.classrooms,
        parsed.teachingClasses,
        parsed.students || []
      );
      
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

  const getCellConflicts = (day: number, period: number) => {
    return conflicts.filter(c => c.affectedSlots.some(s => s.day === day && s.period === period));
  };

  // Substitute Recommend Trigger
  const handleSelectCell = async (item: ScheduleItem) => {
    setSelectedCell(item);
    setSubstituteData(null);
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
    setSubstituteLoading(false);
  };

  // Confirm Substitute Substitute Action
  const handleApplySubstitute = async (substituteTeacherId: string) => {
    if (!selectedCell) return;
    const substituteTeacher = teachers.find(t => t.id === substituteTeacherId);
    if (!substituteTeacher) return;

    if (window.confirm('确定要将 [' + selectedCell.teachingClassName + '] 的原定老师 [' + selectedCell.teacherName + '] 临时调整为 [' + substituteTeacher.name + '] 老师吗？')) {
      const newSchedules = schedules.map(s => {
        if (s.id === selectedCell.id) {
          return {
            ...s,
            teacherId: substituteTeacherId,
            teacherName: substituteTeacher.name,
            isTemp: true
          };
        }
        return s;
      });

      setSchedules(newSchedules);
      setSelectedCell(null);
      setSubstituteData(null);
      setShowSubstituteDialog(false);
      updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students);
      alert('代课调优成功应用，课表排期已热更新！');
    }
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
          isTemp: false
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
      phone: newTeacherPhone || '13800000000',
      email: 'new_teacher@school.edu.cn',
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

  const gradeTeachers = getGradeTeachers();
  const gradeTeachingClasses = getGradeTeachingClasses();
  const gradeStudents = getGradeStudents();
  const gradeScheduleCount = schedules.filter(s => s.teachingClassName.startsWith(selectedGrade)).length;
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  const warningConflicts = conflicts.filter(c => c.severity === 'warning');
  const hasCriticalConflicts = criticalConflicts.length > 0;
  const hasDiagnosticWarnings = warningConflicts.length > 0;
  const diagnosticSummary = `${criticalConflicts.length} 处硬冲突 / ${warningConflicts.length} 条提醒`;
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
      detail: `${warningConflicts.length} 条提醒 · ${selectedGrade}课表 ${gradeScheduleCount} 节`,
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      className: hasCriticalConflicts ? 'border-rose-100 bg-rose-50/70 text-rose-900' : 'border-amber-100 bg-amber-50/70 text-amber-900'
    }
  ];
  const managementTableShellClass = 'management-table-shell bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0';
  const managementTableScrollClass = 'management-table-scroll min-h-0 overflow-x-auto overflow-y-visible';

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
      <header id="main_header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-8">
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

          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('board')}
              className={`font-semibold text-sm h-16 flex items-center px-3 transition-colors ${activeTab === 'board' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              动态排课主看板
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`font-semibold text-sm h-16 flex items-center px-3 transition-colors ${activeTab === 'management' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              学校教学分工与基础数据
            </button>
          </nav>
        </div>

        {/* SYSTEM ACTIONS & HEADER CONTROLS */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenJSONModal}
            title="JSON 数据导入与导出备份"
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>💾 导入/导出 JSON</span>
          </button>
          {hasCriticalConflicts ? (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课硬冲突详情"
              className="px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors animate-pulse hover:animate-none"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{criticalConflicts.length} 处硬冲突 · {warningConflicts.length} 条提醒</span>
            </button>
          ) : hasDiagnosticWarnings ? (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课诊断提醒"
              className="px-3 py-1.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>0 处硬冲突 · {warningConflicts.length} 条提醒</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConflictsModal(true)}
              title="查看排课诊断详情"
              className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>硬冲突与提醒均为 0</span>
            </button>
          )}

          <div className="bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            2026学期 · 第15周
          </div>

          <button
            onClick={handleResetData}
            title="重置为默认数据"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </header>

      {/* THREE SECTION WORKFLOW LAYOUT */}
      {activeTab === 'board' && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          
          {/* MIDDLE SECTION: MAIN VIEW TIMETABLE GRID */}
          <main id="main_grid" className="scheduler-board-scroll flex-1 p-6 flex flex-col min-w-0 overflow-y-auto">
            
            {/* VIEW TITLE AND ACTIVE FILTERS HEADBOARD */}
            <div className="scheduler-app-topbar scheduler-board-appbar flex justify-between items-end shrink-0">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{getActiveFilterLabel()}</h2>
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
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  采用一键自动排课+手动微调保障。排上课表项代表走班制上课组织，包含行政班与教学班时间。
                </p>
              </div>

              {/* GRID INTERACTIVE FILTERS */}
              <div className="flex items-center gap-2">
                <div className="bg-white rounded-lg border border-slate-200 p-1 flex items-center space-x-1 shadow-xs">
                  
                  {/* Subject filter selector */}
                  <select 
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
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

                  {/* Combination filter */}
                  <select 
                    value={combinationFilter}
                    onChange={(e) => setCombinationFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="all">所有选修组合/类型</option>
                    <option value="物化生">物化生 组 (高二复合)</option>
                    <option value="物化地">物化地 组</option>
                    <option value="历政地">历政地 组</option>
                    <option value="普通班">普通班</option>
                  </select>

                  {/* Teacher focus filter */}
                  <select 
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="all">所有任课教师</option>
                    {getGradeTeachers().map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subjects.join('/')})</option>
                    ))}
                  </select>

                  {/* Classroom lock focus */}
                  <select 
                    value={classroomFilter}
                    onChange={(e) => setClassroomFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="all">所有备课/走班教室</option>
                    {getGradeClassrooms().map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {/* Reset dropdown filters */}
                  {(subjectFilter !== 'all' || combinationFilter !== 'all' || teacherFilter !== 'all' || classroomFilter !== 'all') && (
                    <button 
                      onClick={() => {
                        setSubjectFilter('all');
                        setCombinationFilter('all');
                        setTeacherFilter('all');
                        setClassroomFilter('all');
                      }}
                      className="p-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded font-bold"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TIMETABLE DYNAMIC LAYOUT: THE GEOMETRIC GRID */}
            <div className="scheduler-timetable-shell bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs min-w-[700px]">
              
              {/* Columns Header (Monday - Friday) */}
              <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50/80 shrink-0 select-none">
                <div className="p-3 border-r border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-400">
                  时刻节段
                </div>
                {DAYS.map((day) => {
                  return (
                    <div 
                      key={day.num} 
                      className="p-3 border-r last:border-r-0 border-slate-200 text-center flex flex-col items-center justify-center"
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
              <div className="scheduler-timetable-rows divide-y divide-slate-100">
                {PERIODS_METADATA.map((periodMeta, pIdx) => {
                  
                  if (periodMeta.type === 'break') {
                    return (
                      <div key={`spacer-${pIdx}`} className="grid grid-cols-6 h-10 bg-slate-50/50 hover:bg-slate-50 text-slate-400 border-b border-slate-200">
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

                  if (periodMeta.type === 'lunch') {
                    return (
                      <div key={`spacer-${pIdx}`} className="grid grid-cols-6 h-9 bg-slate-100/50 text-slate-400 border-b border-slate-200">
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

                  return (
                    <div key={`period-row-${periodMeta.num}`} className="grid grid-cols-6 border-b border-slate-100" style={{gridAutoRows: '1fr'}}>
                      <div className={`p-2 border-r border-slate-200 text-center flex flex-col justify-center items-center shrink-0 ${pc.bg} ${pc.border}`}>
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
                            className={`border-r last:border-r-0 border-slate-200 ${cellConflicts.length > 0 ? 'bg-orange-50/20' : 'bg-transparent'}`}
                          >
                            {cellItems.length > 0 ? (
                              <div className={`p-1 flex flex-col gap-1 ${periodScrollbarClass} ${hasMany ? 'max-h-[320px] overflow-y-auto' : ''}`}>
                                {cellItems.map((item) => {
                                  const isSelected = selectedCell && selectedCell.id === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      onClick={() => handleSelectCell(item)}
                                      className={`p-1.5 rounded text-left cursor-pointer transition-all shrink-0 ${getSubjectColorClass(item.subject, item.isFinished, item.isTemp)} ${isSelected ? 'ring-2 ring-blue-600 shadow-md' : 'hover:shadow-xs'}`}
                                    >
                                      <div className="font-bold text-[11px] leading-tight truncate">
                                        {item.subject} · {item.teacherName}
                                      </div>
                                      <div className="text-[9px] text-slate-600/80 truncate mt-0.5">
                                        {item.teachingClassName}
                                      </div>
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
              </div>
            </div>
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
                      <span className="font-bold text-slate-700">{selectedCell.teacherName}</span>
                    </div>
                  </div>
                  {selectedCell.isTemp && (
                    <div className="mt-2 text-[10px] text-orange-600 font-bold">ℹ️ 该课程经历过手动微调。</div>
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
                              const disabled = rec.hasConflictOnChosenSlot || rec.hasLoadConflict || rec.hasAvailabilityConflict || rec.suitabilityScore === 0;
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

      {/* ALTERNATIVE VIEW: MANAGEMENT SCREEN */}
      {activeTab === 'management' && (
        <main id="data_management" className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-slate-50 text-left w-full">
          {/* Scrollable overview area */}
          <div className="scheduler-app-topbar management-header px-6 pt-4 pb-2 shrink-0 border-b border-slate-200/80">
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
                        <td className="p-3 border-r border-slate-100 font-semibold text-slate-700">{t.maxWeeklyHours} 节/周</td>
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
                      onChange={e => setNewTeacherWeeklyHours(parseInt(e.target.value) || 16)}
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
                      {criticalConflicts.length} 处硬冲突 / {warningConflicts.length} 条提醒
                    </span>
                  ) : hasDiagnosticWarnings ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      0 处硬冲突 / {warningConflicts.length} 条提醒
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
              ) : (
                <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">硬冲突与诊断提醒均为 0</h4>
                  <p className="text-[11px] text-slate-400 mt-1">当前教师、教室、课时口径与学生走班基础数据未发现异常。</p>
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
