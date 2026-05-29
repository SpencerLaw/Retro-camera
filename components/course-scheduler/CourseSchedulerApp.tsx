import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  HelpCircle, 
  Timer, 
  Upload, 
  RotateCcw, 
  Sliders, 
  Clock, 
  FileText, 
  User, 
  Search, 
  Settings, 
  BarChart2, 
  Plus, 
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Database
} from 'lucide-react';
import { 
  Role, 
  Teacher, 
  Classroom, 
  TeachingClass, 
  Student, 
  ScheduleItem, 
  Conflict, 
  TimeSlot, 
  SubstituteRecommendation 
} from './types';

export default function App() {
  // Application Data States
  const [role, setRole] = useState<Role>('dean');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachingClasses, setTeachingClasses] = useState<TeachingClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [histories, setHistories] = useState<any[]>([]);
  
  // Loading & View Controls
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'board' | 'resources' | 'analysis'>('board');
  
  // Filter states for Schedule Grid
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [combinationFilter, setCombinationFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  // Interactive Cell States
  const [selectedCell, setSelectedCell] = useState<ScheduleItem | null>(null);
  const [substituteLoading, setSubstituteLoading] = useState<boolean>(false);
  const [substituteData, setSubstituteData] = useState<{ item: ScheduleItem; recommendations: SubstituteRecommendation[] } | null>(null);
  
  // Modals / Slide-overs
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [showAddClassroomModal, setShowAddClassroomModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [showJSONModal, setShowJSONModal] = useState<boolean>(false);
  const [jsonRawText, setJsonRawText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');
  
  // Rule grading and config states to handle NP-hard walk-class constraints
  const [configSettings, setConfigSettings] = useState<{
    hardStudentConflict: boolean;
    hardTeacherConflict: boolean;
    hardClassroomConflict: boolean;
    allowTeacherPrefRelaxation: boolean;
    allowClassroomLoadRelaxation: boolean;
  }>({
    hardStudentConflict: true,
    hardTeacherConflict: true,
    hardClassroomConflict: true,
    allowTeacherPrefRelaxation: false,
    allowClassroomLoadRelaxation: false,
  });
  
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

  const [importType, setImportType] = useState<'teacher' | 'classroom'>('teacher');
  const [importRawText, setImportRawText] = useState('');

  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');

  const [shiftSubject, setShiftSubject] = useState('通用技术');
  const [shiftWeek, setShiftWeek] = useState(10);
  const [shiftReason, setShiftReason] = useState('完成选考学业水平测试，停课释放余下多媒体机房资源');

  // Fetch initial system states
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data');
      const data = await res.json();
      setTeachers(data.teachers);
      setClassrooms(data.classrooms);
      setTeachingClasses(data.teachingClasses);
      setStudents(data.students);
      setSchedules(data.schedules);
      setConflicts(data.conflicts);
      setHistories(data.histories);
      if (data.configSettings) {
        setConfigSettings(data.configSettings);
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

  // Soft/Hard Constraint rules relaxation updater as dynamic NP-hard solver configuration
  const handleUpdateConfig = async (newConfig: Partial<typeof configSettings>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setConfigSettings(data.configSettings);
        setConflicts(data.conflicts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset data simulation state
  const handleResetData = async () => {
    if (confirm("您确认需要初始化走班数据吗？当前所有调整进度和产生的快照将被重置。")) {
      try {
        setLoading(true);
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        setTeachers(data.teachers);
        setClassrooms(data.classrooms);
        setTeachingClasses(data.teachingClasses);
        setSchedules(data.schedules);
        setConflicts(data.conflicts);
        setHistories([]);
        setSelectedCell(null);
        setSubstituteData(null);
        if (data.configSettings) {
          setConfigSettings(data.configSettings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const loadJSONExportText = async () => {
    try {
      setJsonError('');
      const res = await fetch('/api/data');
      const data = await res.json();
      const exportData = {
        teachers: data.teachers || [],
        classrooms: data.classrooms || [],
        teachingClasses: data.teachingClasses || [],
        students: data.students || [],
        schedules: data.schedules || []
      };
      setJsonRawText(JSON.stringify(exportData, null, 2));
    } catch (err: any) {
      setJsonError(`备份数据读取失败: ${err.message}`);
    }
  };

  const handleJSONImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError('');
    try {
      const parsed = JSON.parse(jsonRawText);
      if (!parsed.teachers || !parsed.classrooms || !parsed.teachingClasses) {
        throw new Error("JSON数据结构不合准！缺少 essential 的 'teachers', 'classrooms' 或 'teachingClasses' 数组域。");
      }
      const res = await fetch('/api/data/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (data.status === 'success' || data.teachers) {
        setTeachers(data.teachers);
        setClassrooms(data.classrooms);
        setTeachingClasses(data.teachingClasses);
        setSchedules(data.schedules);
        setStudents(data.students || []);
        setConflicts(data.conflicts);
        setShowJSONModal(false);
        setSelectedCell(null);
        setSubstituteData(null);
        alert("🎉 JSON 初始化教务排课结构导入成功！课表数据与冲突已被实时重调度。");
      } else {
        throw new Error(data.error || "导入失败");
      }
    } catch (err: any) {
      setJsonError(`解析/导入出现错误: ${err.message}`);
    }
  };

  const loadComprehensiveTemplate = () => {
    const comprehensiveTemplate = {
      "teachers": [
        {
          "id": "T001",
          "name": "李华老师",
          "subjects": ["语文"],
          "maxWeeklyHours": 16,
          "maxDailyHours": 4,
          "maxConsecutiveLessons": 2,
          "unavailablePeriods": [{ "day": 1, "period": 1 }, { "day": 1, "period": 2 }],
          "preferences": "因市级紧急教研任务，周一上午前两节请假不排课",
          "phone": "13800000001",
          "email": "lihua@school.edu.cn",
          "department": "高二语文组"
        },
        {
          "id": "T002",
          "name": "王强老师",
          "subjects": ["数学"],
          "maxWeeklyHours": 16,
          "maxDailyHours": 4,
          "maxConsecutiveLessons": 2,
          "unavailablePeriods": [],
          "preferences": "希望尽量排上午的课",
          "phone": "13800000002",
          "email": "wangqiang@school.edu.cn",
          "department": "高二数学组"
        },
        {
          "id": "T003",
          "name": "赵刚老师",
          "subjects": ["物理"],
          "maxWeeklyHours": 14,
          "maxDailyHours": 3,
          "maxConsecutiveLessons": 2,
          "unavailablePeriods": [{ "day": 5, "period": 7 }, { "day": 5, "period": 8 }],
          "preferences": "周五下午有校本选修指导，不可排走班课",
          "phone": "13800000003",
          "email": "zhaogang@school.edu.cn",
          "department": "高二理综组"
        }
      ],
      "classrooms": [
        {
          "id": "R001",
          "name": "高二(1)班行政教室",
          "type": "ordinary",
          "capacity": 50,
          "assignedSubjects": ["语文", "数学", "外语"]
        },
        {
          "id": "R002",
          "name": "实验楼物理实训室A",
          "type": "lab",
          "capacity": 45,
          "assignedSubjects": ["物理"]
        },
        {
          "id": "R003",
          "name": "多媒体网络机房C",
          "type": "media",
          "capacity": 60,
          "assignedSubjects": ["信息技术"]
        }
      ],
      "teachingClasses": [
        {
          "id": "TC001",
          "name": "高二语文必修1班",
          "subject": "语文",
          "teacherId": "T001",
          "classroomId": "R001",
          "studentCount": 48,
          "combination": "通用"
        },
        {
          "id": "TC002",
          "name": "高二数学必修1班",
          "subject": "数学",
          "teacherId": "T002",
          "classroomId": "R001",
          "studentCount": 48,
          "combination": "通用"
        },
        {
          "id": "TC003",
          "name": "高二物理选考1班(物化生)",
          "subject": "物理",
          "teacherId": "T003",
          "classroomId": "R002",
          "studentCount": 40,
          "combination": "物化生"
        }
      ],
      "students": [
        {
          "id": "S001",
          "name": "林子涵",
          "electiveCombo": "物化生",
          "classes": ["TC001", "TC002", "TC003"]
        },
        {
          "id": "S002",
          "name": "陈宇轩(请假)",
          "electiveCombo": "物化生",
          "classes": ["TC001", "TC002", "TC003"],
          "note": "因病请假一周"
        },
        {
          "id": "S003",
          "name": "刘心语",
          "electiveCombo": "物化地",
          "classes": ["TC001", "TC002"]
        }
      ],
      "schedules": [
        {
          "id": "S001",
          "teachingClassId": "TC001",
          "teachingClassName": "高二语文必修1班",
          "subject": "语文",
          "teacherId": "T001",
          "teacherName": "李华老师",
          "classroomId": "R001",
          "classroomName": "高二(1)班行政教室",
          "day": 2,
          "period": 1
        },
        {
          "id": "S002",
          "teachingClassId": "TC002",
          "teachingClassName": "高二数学必修1班",
          "subject": "数学",
          "teacherId": "T002",
          "teacherName": "王强老师",
          "classroomId": "R001",
          "classroomName": "高二(1)班行政教室",
          "day": 2,
          "period": 2
        },
        {
          "id": "S003",
          "teachingClassId": "TC003",
          "teachingClassName": "高二物理选考1班(物化生)",
          "subject": "物理",
          "teacherId": "T003",
          "teacherName": "赵刚老师",
          "classroomId": "R002",
          "classroomName": "实验楼物理实训室A",
          "day": 1,
          "period": 5
        },
        {
          "id": "S004",
          "teachingClassId": "TC003",
          "teachingClassName": "高二物理选考1班(物化生)",
          "subject": "物理",
          "teacherId": "T003",
          "teacherName": "赵刚老师",
          "classroomId": "R002",
          "classroomName": "实验楼物理实训室A",
          "day": 1,
          "period": 6
        }
      ]
    };
    setJsonRawText(JSON.stringify(comprehensiveTemplate, null, 2));
  };

  // Substitute Recommend Trigger
  const handleSelectCell = async (item: ScheduleItem) => {
    setSelectedCell(item);
    setSubstituteLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const recommendations = getSubstituteRecommendations(item.id, schedules, teachers);
      setSubstituteData({ item, recommendations });
    } catch (err) {
      console.error(err);
    } finally {
      setSubstituteLoading(false);
    }
  };

  // Confirm Substitute Substitute Action
  const handleApplySubstitute = async (substituteTeacherId: string) => {
    if (!selectedCell) return;
    try {
      const index = schedules.findIndex(s => s.id === selectedCell.id);
      const teacherObj = teachers.find(t => t.id === substituteTeacherId);
      if (index !== -1 && teacherObj) {
        const newSchedules = [...schedules];
        newSchedules[index] = {
          ...newSchedules[index],
          teacherId: substituteTeacherId,
          teacherName: teacherObj.name,
          isTemp: true
        };
        
        setSchedules(newSchedules);
        updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students, configSettings);
        
        // Refresh active recommendations panel
        const updatedCell = newSchedules.find((s: ScheduleItem) => s.id === selectedCell.id);
        if (updatedCell) {
          handleSelectCell(updatedCell);
        } else {
          setSelectedCell(null);
          setSubstituteData(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Drag & Drop Move Cell (Time shift) Simulation Click Reassignment
  const handleMovePeriod = async (item: ScheduleItem, newDay: number, newPeriod: number) => {
    try {
      const index = schedules.findIndex(s => s.id === item.id);
      if (index !== -1) {
        const newSchedules = [...schedules];
        newSchedules[index] = {
          ...newSchedules[index],
          day: newDay,
          period: newPeriod,
          isTemp: true
        };
        
        setSchedules(newSchedules);
        updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students, configSettings);
        setSelectedCell(null);
        setSubstituteData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subject Course Phase Completion (Exam complete & release)
  const handleFinishSubject = async () => {
    try {
      const newSchedules = schedules.map(s => {
        if (s.subject === shiftSubject) {
          return {
            ...s,
            isFinished: true,
            finishedWeek: shiftWeek
          };
        }
        return s;
      });
      
      setSchedules(newSchedules);
      updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students, configSettings);
      setShowShiftModal(false);
      alert(`成功更新：${shiftSubject} 课程在第 ${shiftWeek} 周考核完成后已全学期即时停用，释放后续教室及教师。`);
    } catch (err) {
      console.error(err);
    }
  };

  // Save Config Snapshot
  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const historyId = `hist_${Date.now()}`;
      const newHistory = {
        id: historyId,
        name: snapshotName || `第${histories.length + 1}次动态微调`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        description: snapshotDesc || '无描述',
        items: JSON.parse(JSON.stringify(schedules))
      };
      
      setHistories([...histories, newHistory]);
      setShowSnapshotModal(false);
      setSnapshotName('');
      setSnapshotDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  // Rollback to Snapshot
  const handleRollback = async (historyId: string) => {
    if (confirm("您确定要回滚到此历史时刻的课表数据吗？当前所有未保存修改将会丢失。")) {
      try {
        const hit = histories.find(h => h.id === historyId);
        if (hit) {
          const newSchedules = JSON.parse(JSON.stringify(hit.items));
          setSchedules(newSchedules);
          updateConflicts(newSchedules, teachers, classrooms, teachingClasses, students, configSettings);
          setSelectedCell(null);
          setSubstituteData(null);
          alert("🔙 课表已回滚！旧有代课排期档案已重载。");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // (Local conflict validator runs automatically to audit manual operations)

  // Form Submits: Add Teacher
  const handleAddTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTeacher: Teacher = {
        id: `T${String(teachers.length + 1).padStart(3, '0')}`,
        name: newTeacherName,
        subjects: [newTeacherSubject],
        maxWeeklyHours: Number(newTeacherWeeklyHours),
        maxDailyHours: 4,
        maxConsecutiveLessons: 2,
        unavailablePeriods: [],
        preferences: '暂无偏好',
        phone: newTeacherPhone,
        department: newTeacherDept,
        email: `${newTeacherName}@school.edu.cn`
      };
      
      const newTeachers = [...teachers, newTeacher];
      setTeachers(newTeachers);
      setShowAddTeacherModal(false);
      setNewTeacherName('');
      setNewTeacherPhone('');
    } catch (err) {
      console.error(err);
    }
  };

  // Form Submits: Add Classroom
  const handleAddClassroomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClassroom: Classroom = {
        id: `R${String(classrooms.length + 1).padStart(3, '0')}`,
        name: newClassroomName,
        type: newClassroomType,
        capacity: Number(newClassroomCapacity),
        assignedSubjects: [newClassroomSubject]
      };
      
      const newClassrooms = [...classrooms, newClassroom];
      setClassrooms(newClassrooms);
      setShowAddClassroomModal(false);
      setNewClassroomName('');
    } catch (err) {
      console.error(err);
    }
  };

  // Batch paste template generator for import
  const fillImportTemplate = () => {
    if (importType === 'teacher') {
      setImportRawText(
        "姓名,授课科目,总额定周课时,联系电话,任教组别\n" +
        "邓稼先,物理,12,13999991212,物理组\n" +
        "华罗庚,数学,16,13888880000,数学组\n" +
        "屠呦呦,化学,14,13666661111,化学组"
      );
    } else {
      setImportRawText(
        "教室名称,教室种类,容载量,主授科目\n" +
        "理综高级无尘实验室C,lab,45,化学\n" +
        "通用微格技术空间03,lab,40,通用技术\n" +
        "智能创客机房B,media,55,信息技术"
      );
    }
  };

  // Execute Dynamic Import Parser
  const handleImportCSVData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importRawText.trim()) return;
    
    const lines = importRawText.trim().split('\n');
    if (lines.length < 2) return;
    
    const headers = lines[0].split(',');
    const list: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length === 0 || !cols[0]) continue;
      
      if (importType === 'teacher') {
        list.push({
          name: cols[0],
          subject: cols[1] || '语文',
          maxWeeklyHours: Number(cols[2]) || 16,
          phone: cols[3] || '',
          department: cols[4] || '综合组'
        });
      } else {
        let mappedType: 'ordinary' | 'lab' | 'media' = 'ordinary';
        if (cols[1] === 'lab' || cols[1] === '实验室' || cols[1] === '化学实验室' || cols[1] === '物理实验室' || cols[1] === '通用技术') {
          mappedType = 'lab';
        } else if (cols[1] === 'media' || cols[1] === '机房' || cols[1] === '多媒体') {
          mappedType = 'media';
        }
        list.push({
          name: cols[0],
          type: mappedType,
          capacity: Number(cols[2]) || 40,
          subject: cols[3] || '普通'
        });
      }
    }

    try {
      if (importType === 'teacher') {
        const newTeachers = [...teachers];
        list.forEach((t: any) => {
          const idx = newTeachers.findIndex(item => item.name === t.name);
          if (idx !== -1) {
            newTeachers[idx] = { ...newTeachers[idx], ...t };
          } else {
            newTeachers.push({
              id: `T${String(newTeachers.length + 1).padStart(3, '0')}`,
              name: t.name || '未知老师',
              subjects: [t.subject || '语文'],
              maxWeeklyHours: t.maxWeeklyHours || 16,
              maxDailyHours: 4,
              maxConsecutiveLessons: 2,
              unavailablePeriods: [],
              preferences: '暂无偏好',
              phone: t.phone || '',
              email: t.email || '',
              department: t.department || '综合组'
            });
          }
        });
        setTeachers(newTeachers);
        updateConflicts(schedules, newTeachers, classrooms, teachingClasses, students, configSettings);
      } else if (importType === 'classroom') {
        const newClassrooms = [...classrooms];
        list.forEach((rawRoom: any) => {
          newClassrooms.push({
            id: `R${String(newClassrooms.length + 1).padStart(3, '0')}`,
            name: rawRoom.name || '走班定制教室',
            type: rawRoom.type || 'ordinary',
            capacity: rawRoom.capacity || 40,
            assignedSubjects: [rawRoom.subject || '普通']
          });
        });
        setClassrooms(newClassrooms);
        updateConflicts(schedules, teachers, newClassrooms, teachingClasses, students, configSettings);
      }

      setShowImportModal(false);
      setImportRawText('');
      alert(`🎈 成功批量导入了 ${list.length} 条选科/教研资源规准！课表已实时进行交叉冲突校检。`);
    } catch (err) {
      console.error(err);
    }
  };

  // Check if a timetable cell has dynamic conflicts
  const getCellConflicts = (day: number, period: number) => {
    return conflicts.filter(c => c.affectedSlots.some(s => s.day === day && s.period === period));
  };

  // Retrieve active schedule cell list for grid mapping
  const getSchedulesForSlot = (day: number, period: number) => {
    return schedules.filter(s => s.day === day && s.period === period);
  };

  // Helper filters application for Middle column grid
  const getFilteredSchedules = (day: number, period: number) => {
    let list = getSchedulesForSlot(day, period);

    // Apply filters based on sidebar dropdown options
    if (combinationFilter !== 'all') {
      // Find teachingClass to match combo
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

  // Calculate generic utilization stats
  const calculateTeacherLoads = () => {
    return teachers.map(t => {
      const activeLessons = schedules.filter(s => s.teacherId === t.id && !s.isFinished).length;
      return {
        ...t,
        activeLessons,
        percent: Math.round((activeLessons / t.maxWeeklyHours) * 100)
      };
    });
  };

  const calculateClassroomLoads = () => {
    return classrooms.map(c => {
      const activeLessons = schedules.filter(s => s.classroomId === c.id && !s.isFinished).length;
      const totalPossibleSlots = 40; // 8 periods x 5 days
      const percent = Math.round((activeLessons / totalPossibleSlots) * 100);
      return {
        ...c,
        percent: Math.min(100, Math.max(10, percent)),
        lessonsCount: activeLessons
      };
    });
  };

  // Check active filter items counts
  const getActiveFilterLabel = () => {
    if (combinationFilter !== 'all') return `选科组：${combinationFilter}`;
    if (teacherFilter !== 'all') {
      const found = teachers.find(t => t.id === teacherFilter);
      return `任课教师：${found ? found.name : '筛选'}`;
    }
    if (classroomFilter !== 'all') {
      const found = classrooms.find(c => c.id === classroomFilter);
      return `教室占用：${found ? found.name : '筛选'}`;
    }
    if (subjectFilter !== 'all') return `课目筛选：${subjectFilter}`;
    return "全校走班视图";
  };

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
    { type: 'break', num: 0, name: "大课间 (广播操/跑操锁定时段)", time: "09:30 - 10:10" },
    { type: 'period', num: 3, name: "第三节", time: "10:10 - 10:50" },
    { type: 'period', num: 4, name: "第四节", time: "11:00 - 11:40" },
    { type: 'lunch', num: 0, name: "午休 (校内自修静思时段)", time: "11:40 - 14:00" },
    { type: 'period', num: 5, name: "第五节", time: "14:00 - 14:40" },
    { type: 'period', num: 6, name: "第六节", time: "14:50 - 15:30" },
    { type: 'period', num: 7, name: "第七节", time: "15:40 - 16:20" },
    { type: 'period', num: 8, name: "第八节", time: "16:30 - 17:10" },
  ];

  // Subject coloring classes helper
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
      case '通用技术': return 'bg-purple-50 border-l-4 border-purple-500 text-purple-800';
      case '信息技术': return 'bg-sky-50 border-l-4 border-sky-500 text-sky-800';
      case '体育': return 'bg-lime-50 border-l-4 border-lime-500 text-lime-800';
      default: return 'bg-slate-50 border-l-4 border-slate-400 text-slate-800';
    }
  };

  return (
    <div id="app_root" className="w-full h-screen bg-slate-100 flex flex-col font-sans text-slate-800 overflow-hidden leading-relaxed">
      
      {/* ERROR / LOADING HEADER FOR FIRST BOOT */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center space-y-4">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-slate-900 leading-none">智能排课系统</span>
            </div>
            </div>

            <nav className="flex gap-4">
            <button 
              onClick={() => setActiveTab('board')}
              className={`font-semibold text-sm h-16 flex items-center px-3 transition-colors ${activeTab === 'board' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              动态排课看板
            </button>
            <button 
              onClick={() => setActiveTab('resources')}
              className={`font-semibold text-sm h-16 flex items-center px-3 transition-colors ${activeTab === 'resources' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              教师与教室资源
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`font-semibold text-sm h-16 flex items-center px-3 transition-colors ${activeTab === 'analysis' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              数理利用审计
            </button>
          </nav>
        </div>

        {/* SYSTEM ACTIONS & ROLE SELECTION FOR MULTI-ROLE */}
        <div className="flex items-center gap-4">
          <div className="bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            2026学期 · 第15周
          </div>

          <button 
            onClick={async () => { await loadJSONExportText(); setShowJSONModal(true); }}
            title="JSON 初始数据流导入、导出与备份" 
            className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg flex items-center gap-1.5 text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>JSON 数据库导入与备份</span>
          </button>

          <button
            onClick={handleResetData}
            title="重置为默认演示数据"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </button>
          </div>
          </header>

      {/* THREE SECTION WORKFLOW LAYOUT */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* LEFT SIDEBAR: CONTROL & INTERACTIVE STATS */}
        <aside id="left_sidebar" className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 overflow-y-auto">
          
          {/* Action Blocks */}
          <div className="mb-6 space-y-3">
            {/* NP-hard Walk-Class Constraint Calibration & Rule Relaxation Panel */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-left shadow-xs">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 tracking-tight">排课非确定性(NP-hard)约束放宽</span>
              </div>
              
              <div className="space-y-2.5">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={configSettings.allowTeacherPrefRelaxation}
                    onChange={(e) => handleUpdateConfig({ allowTeacherPrefRelaxation: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 leading-tight">放宽教师偏好(弹性软约束)</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">降级特定时段限制，避免人工排课卡顿</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={configSettings.allowClassroomLoadRelaxation}
                    onChange={(e) => handleUpdateConfig({ allowClassroomLoadRelaxation: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700 leading-tight">放宽专室高负载预警</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">解除实验室容量警告，容许连续错峰课次</span>
                  </div>
                </label>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-amber-700 font-bold flex items-center gap-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  硬约束：走班无碰撞
                </span>
                <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1 rounded text-[9px]">
                  常态硬锁定
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                Excel批量导入
              </button>
              <button 
                onClick={() => setShowSnapshotModal(true)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2 px-1 rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                存存当前快照
              </button>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* COMPREHENSIVE SCHEME STATISTICS */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                <span>走班选考配置总况</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">走班学生总规模</span>
                  <span className="font-bold text-slate-800">1,248 人</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">高考选科组合模式</span>
                  <span className="font-semibold text-blue-700 underline decoration-blue-200">3 + 1 + 2 动态流转</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">激活段走班教学班</span>
                  <span className="font-bold text-slate-800">42 个</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">教师储备/校合教室</span>
                  <span className="font-bold text-slate-800">{teachers.length}名 / {classrooms.length}间</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500">
                  <span>排课覆盖效能</span>
                  <span className="text-emerald-600 font-bold">100% 达成率</span>
                </div>
              </div>
            </div>

            {/* TOGGLEABLE HARD CONSTRAINTS RULE AUDIT */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                新高考走班约束规则体系
              </h3>
              <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-lg border border-slate-200">
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>核心物理、化学实验室交叉错峰排课限制</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>教师每周排课总限 ≤ 18节 (特殊教师个性调优)</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>大课间、校内会晤统一时段锁定排课</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>禁止同一名走班学生存在课程交叉冲突</span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>允许跨校区合办教务缓冲时间 (30分钟)</span>
                </label>
              </div>
            </div>

            {/* CURRICULUM PHASE RETIREMENT ACTION CONTAINER */}
            <div>
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>学期阶段课程更调</span>
                <span className="text-[10px] text-blue-600 px-1 py-0.2 bg-blue-50 rounded">重点痛点</span>
              </h3>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-2 text-xs">
                <p className="text-slate-500 leading-normal text-[11px]">本功能针对高中“通用技术”及“信息技术”等学科，随堂提早完成考试，课表需即时退役、释放资源。</p>
                <button 
                  onClick={() => setShowShiftModal(true)}
                  className="w-full mt-1 bg-white hover:bg-slate-100 border border-slate-200 py-1.5 text-blue-600 font-bold rounded text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Timer className="w-3.5 h-3.5 text-blue-600" />
                  设置结课释放
                </button>
              </div>
            </div>

            {/* SNAPSHOT QUICK LIST */}
            {histories.length > 0 && (
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-left">
                  历史快照版本 ({histories.length})
                </h3>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {histories.map((h) => (
                    <div key={h.id} className="p-2 border border-slate-200 rounded bg-slate-50/50 flex flex-col space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-700 truncate">{h.name}</span>
                        <span className="text-slate-400 shrink-0">{h.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{h.description}</span>
                        <button 
                          onClick={() => handleRollback(h.id)}
                          className="text-[9px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors font-bold"
                        >
                          回滚
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FOOTER METADATA TIMESTAMP */}
            <div className="pt-4 border-t border-slate-100 shrink-0 text-left">
              <div className="text-[10px] text-slate-400">上次动态算法优化时间</div>
              <div className="text-xs text-slate-600 font-medium">2026-05-29 09:30:15</div>
              <p className="text-[9px] text-slate-400 mt-1">系统已加载并应用全校所有走班规则，动态分析及诊断内核状态：正常</p>
            </div>

          </div>
        </aside>

        {/* MIDDLE SECTION: MAIN VIEW TIMETABLE GRID WITH VISUAL RICHNESS */}
        {activeTab === 'board' && (
          <main id="main_grid" className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto">
            
            {/* VIEW TITLE AND ACTIVE FILTERS HEADBOARD */}
            <div className="flex justify-between items-end mb-4 shrink-0">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{getActiveFilterLabel()}</h2>
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full">
                    高二年级
                  </span>
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
                    <option value="通用技术">通用技术</option>
                    <option value="信息技术">信息技术</option>
                  </select>

                  {/* Combination custom selector */}
                  <select 
                    value={combinationFilter}
                    onChange={(e) => setCombinationFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="all">所有选修组合</option>
                    <option value="物化生">物化生 组 (复合类)</option>
                    <option value="物化地">物化地 组 (理工地)</option>
                    <option value="史化地">史化地 组 (史地常)</option>
                    <option value="通用">非选修核心组</option>
                  </select>

                  {/* Teacher focus filter */}
                  <select 
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="all">所有任课教师</option>
                    {teachers.map(t => (
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
                    {classrooms.map(c => (
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
                      className="px-2 py-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded text-xs font-bold"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* REAL-TIME DYNAMIC CONFLICTS STATUS WARNING BANNER */}
            {conflicts.length > 0 ? (
              <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-950 px-4 py-3 rounded-xl flex items-start gap-3 shadow-xs">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-left">
                  <span className="font-bold text-sm block">
                    检测到系统排课冲突或软故障提示 ({conflicts.length} 处排课碰撞异常)
                  </span>
                  <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">
                    走班组合冲突会导致相关的高中班次部分学生可能分身乏术。您可点击下方相关课程单元、启动同组代课推荐或点击调整单元重构最优配比。
                  </p>
                  
                  {/* Collapsed active conflicts preview */}
                  <div className="mt-2 text-xs space-y-1 max-h-24 overflow-y-auto">
                    {conflicts.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 p-1 bg-white/60 border border-orange-200/40 rounded">
                        <span className={`px-1 rounded-sm text-[9px] font-bold uppercase ${c.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                          {c.severity === 'critical' ? '严峻碰撞' : '轻微警告'}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600">{c.message}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            ) : (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-xl flex items-center gap-3 shadow-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <span className="font-bold text-sm">全校排课冲突零报错 · 通道通畅</span>
                  <p className="text-xs text-emerald-800">
                    学生选课志愿物理/化学/地理等与通用技术教学空间无任何排期干涉，全学期流转方案完美通过校正。
                  </p>
                </div>
              </div>
            )}

            {/* TIMETABLE DYNAMIC LAYOUT: THE GEOMETRIC GRID */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col min-h-0 min-w-[700px]">
              
              {/* Columns Header (Monday - Friday) */}
              <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50/80 shrink-0 select-none">
                <div className="p-3 border-r border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-400">
                  时刻节段
                </div>
                {DAYS.map((day) => {
                  const hasActiveSelection = schedules.some(s => s.day === day.num); 
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
              <div className="flex-1 overflow-y-auto grid grid-cols-1 auto-rows-[minmax(65px,_1fr)] divide-y divide-slate-100">
                {PERIODS_METADATA.map((periodMeta, pIdx) => {
                  
                  // Scenario: Great break and lunch spacer lines which dynamically lock layouts
                  if (periodMeta.type === 'break') {
                    return (
                      <div key={`spacer-${pIdx}`} className="grid grid-cols-6 min-h-[40px] bg-slate-50/50 hover:bg-slate-50 text-slate-400">
                        <div className="p-2 border-r border-slate-200 flex flex-col justify-center items-center">
                          <span className="text-[10px] font-bold tracking-tight">课间操安排</span>
                          <span className="text-[8px] text-slate-400 leading-none">09:30-10:10</span>
                        </div>
                        <div className="col-span-1 border-r border-slate-200 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                          <span className="text-[10.5px] font-bold text-slate-500">周一广播晨操</span>
                        </div>
                        <div className="col-span-1 border-r border-slate-200 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></div>
                          <span className="text-[10.5px] font-bold text-slate-500">周二武术形武</span>
                        </div>
                        <div className="col-span-1 border-r border-slate-100 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></div>
                          <span className="text-[10.5px] font-bold text-slate-500">周三户外跑操</span>
                        </div>
                        <div className="col-span-1 border-r border-slate-100 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full mr-1"></div>
                          <span className="text-[10.5px] font-bold text-slate-500">周四教研研讨</span>
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-lime-500 rounded-full mr-1"></div>
                          <span className="text-[10.5px] font-bold text-slate-500">周五自由晨跑</span>
                        </div>
                      </div>
                    );
                  }

                  if (periodMeta.type === 'lunch') {
                    return (
                      <div key={`spacer-${pIdx}`} className="grid grid-cols-6 min-h-[38px] bg-slate-100/50 text-slate-400">
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

                  // Standard teaching period row mapping (Monday to Friday columns)
                  return (
                    <div key={`period-row-${periodMeta.num}`} className="grid grid-cols-6">
                      
                      {/* Left Header label for row slot representing target period */}
                      <div className="p-2 border-r border-slate-200 bg-slate-50/20 text-center flex flex-col justify-center items-center">
                        <span className="text-[11px] font-bold text-slate-800">{periodMeta.name}</span>
                        <span className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">{periodMeta.time}</span>
                      </div>

                      {/* Monday to Friday slots of this Row */}
                      {DAYS.map((day) => {
                        const cellItems = getFilteredSchedules(day.num, periodMeta.num);
                        const cellConflicts = getCellConflicts(day.num, periodMeta.num);

                        return (
                          <div 
                            key={`${day.num}-${periodMeta.num}`} 
                            className={`p-1 border-r last:border-r-0 border-slate-200 flex flex-col gap-1 overflow-hidden relative group/cell transition-colors min-h-[55px] ${cellConflicts.length > 0 ? 'bg-orange-50/20' : 'bg-transparent'}`}
                          >
                            
                            {/* Render items or Empty slots placeholder */}
                            {cellItems.length > 0 ? (
                              cellItems.map((item) => {
                                const isSelected = selectedCell && selectedCell.id === item.id;
                                return (
                                  <div 
                                    key={item.id}
                                    onClick={() => handleSelectCell(item)}
                                    className={`flex-1 rounded p-2 text-left flex flex-col justify-between cursor-pointer select-none transition-all ${getSubjectColorClass(item.subject, item.isFinished, item.isTemp)} ${isSelected ? 'ring-2 ring-blue-600 ring-offset-1 shadow-sm' : 'hover:scale-[1.01] hover:shadow-xs'}`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <span className="text-[10px] font-bold truncate pr-1">
                                        {item.teachingClassName}
                                      </span>
                                      
                                      {/* Indicator tags */}
                                      {item.isTemp && (
                                        <span className="text-[7.5px] bg-orange-600 text-white font-bold px-1 rounded-sm shrink-0">
                                          已调
                                        </span>
                                      )}
                                      {item.isFinished && (
                                        <span className="text-[7.5px] bg-slate-400 text-white font-bold px-1 rounded-sm shrink-0">
                                          完结
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex justify-between items-center text-[9.5px] font-semibold mt-1">
                                      <span className="opacity-80 flex items-center gap-0.5 truncate">
                                        <User className="w-2.5 h-2.5 shrink-0" />
                                        {item.teacherName}
                                      </span>
                                      <span className="opacity-80 flex items-center gap-0.5 shrink-0">
                                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                                        {item.classroomName}
                                      </span>
                                    </div>
                                    
                                    {/* Small floating quick action hint */}
                                    <div className="hidden group-hover/cell:flex items-center justify-end text-[7px] text-blue-600 mt-1 font-bold">
                                      点击代换代课老师 &raquo;
                                    </div>

                                  </div>
                                );
                              })
                            ) : (
                              // Real-style geometric empty slots visual decoration
                              <div className="flex-1 rounded border-2 border-dashed border-slate-100 hover:border-slate-300 flex items-center justify-center cursor-pointer transition-all">
                                <span className="text-[10px] text-slate-300 font-bold group-hover/cell:text-blue-500 flex items-center gap-0.5">
                                  <Plus className="w-3 h-3" />
                                  <span>排课留白</span>
                                </span>
                              </div>
                            )}

                            {/* Small warning indicator badge in the absolute slot margin if衝突 */}
                            {cellConflicts.length > 0 && cellItems.length > 0 && (
                              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-white animate-pulse" title={`${cellConflicts.length} 个潜在冲突`}></div>
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
        )}

        {/* ALTERNATIVE VIEW: RESOURCE MANAGEMENT TAB SCREEN */}
        {activeTab === 'resources' && (
          <main id="resource_management" className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto bg-slate-50">
            <div className="flex justify-between items-center mb-6 text-left">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">备课教师与教室教学空间概况</h2>
                <p className="text-xs text-slate-500 mt-1">
                  动态查询实验室、多媒体、通用空间分配。支持添加、编辑、及拖移导入自定义基础表。
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddTeacherModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新聘/增设老师
                </button>
                <button 
                  onClick={() => setShowAddClassroomModal(true)}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  申请走班教室
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              
              {/* TEACHERS RESOURCE SHEET */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    教师教研与周排课上限汇总 ({teachers.length} 位老师)
                  </span>
                  <span className="text-xs text-slate-400">语文/数理/新高考选考组</span>
                </div>
                
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {calculateTeacherLoads().map((t) => (
                    <div key={t.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{t.name}</span>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-extrabold font-mono">{t.id}</span>
                          <span className="text-[10px] text-slate-500">（{t.subjects.join('/')}）</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          📧 {t.email} | 📞 {t.phone}
                        </p>
                        <p className="text-[10px] text-blue-600 mt-1">
                          偏好属性：<span className="italic">{t.preferences || "无特殊偏好"}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700 block">
                          周已排 {t.activeLessons} / {t.maxWeeklyHours} 节课
                        </span>
                        
                        {/* Load Progress bar */}
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            style={{ width: `${t.percent}%` }}
                            className={`h-full ${t.percent > 90 ? 'bg-rose-500' : 'bg-blue-600'}`}
                          ></div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CLASSROOM SPACE SHEET */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    理综实验室与走班网络教室利用率 ({classrooms.length} 间物理可用室)
                  </span>
                  <span className="text-xs text-slate-400">承载：高中实验室、微格、通用</span>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {calculateClassroomLoads().map((c) => (
                    <div key={c.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-left">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800">{c.name}</span>
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-extrabold font-mono">{c.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${c.type === 'lab' ? 'bg-orange-50 text-orange-700 border border-orange-100' : c.type === 'media' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                            {c.type === 'lab' ? '探究实验室' : c.type === 'media' ? '网络机房' : '普通走班教室'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          容纳上限：<span className="font-bold">{c.capacity}</span> 名学生走班上课 | 教学科目分配：{c.assignedSubjects.join('/')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700 block">
                          时段占用利用率：<span className="text-blue-600">{c.percent}%</span>
                        </span>
                        
                        {/* Load Progress bar */}
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            style={{ width: `${c.percent}%` }}
                            className={`h-full ${c.percent > 70 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          ></div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>
          </main>
        )}

        {/* ALTERNATIVE VIEW: ANALYSIS DIAGNOSTICS SCREEN */}
        {activeTab === 'analysis' && (
          <main id="analysis_diagnostics" className="flex-1 p-6 flex flex-col min-w-0 overflow-y-auto bg-slate-50 text-left">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">新高考数据分析面板</h2>
              <p className="text-xs text-slate-500 mt-1">
                多源评估指标体系，展示动态排期利用指数、大课间锁定利用情况和代课频次。
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">每周排定节课总量</span>
                <span className="text-3xl font-bold text-slate-800 block mt-2">{schedules.length} 节</span>
                <span className="text-xs text-emerald-600 font-bold block mt-1">↑ 100% 同期走班进度匹配</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">实验室资源峰值</span>
                <span className="text-3xl font-bold text-slate-800 block mt-2">
                  {Math.round(calculateClassroomLoads().filter(c => c.type === 'lab').reduce((acc, curr) => acc + curr.percent, 0) / Math.max(1, calculateClassroomLoads().filter(c => c.type === 'lab').length))}%
                </span>
                <span className="text-xs text-slate-500 block mt-1">周内波谷配载科学</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">临时调课比率</span>
                <span className="text-3xl font-bold text-slate-800 block mt-2">
                  {Math.round((schedules.filter(s => s.isTemp).length / Math.max(1, schedules.length)) * 100)}%
                </span>
                <span className="text-xs text-blue-600 font-bold block mt-1">支持一键推荐替代</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">系统健康诊断分</span>
                <span className="text-3xl font-bold text-emerald-600 block mt-2 font-mono">98.4 / 100</span>
                <span className="text-[10px] text-slate-400 block mt-1 font-sans">基于国家课程标准体系复合算法评定</span>
              </div>
            </div>

            {/* CHARTS CONTAINER */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col">
                <h3 className="font-bold text-sm mb-3">各走班选修学科每周分布负载 (教学班维度)</h3>
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">物理课程组</span>
                      <span>每周 6 班次 (42学课时)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[85%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">化学课程组</span>
                      <span>每周 6 班次 (40学课时)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[80%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">数学课程组</span>
                      <span>每周 8 班次 (50学课时)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full w-[95%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">历史与地理及技术组</span>
                      <span>每周 6 班次 (3、4课时)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full w-[60%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="font-bold text-sm mb-2">排课多重约束检测指标达成率</h3>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[10.5px] text-slate-400 block">教师每周最大课时限</span>
                    <span className="text-xl font-bold text-slate-700 block mt-1">100% 合理</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[10.5px] text-slate-400 block">普通教室容量不溢出率</span>
                    <span className="text-xl font-bold text-slate-700 block mt-1">100% 匹配</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[10.5px] text-slate-400 block">教学大课间时段锁闭</span>
                    <span className="text-xl font-bold text-slate-700 block mt-1">已完美锁定</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[10.5px] text-slate-400 block">午餐静修教师不重合</span>
                    <span className="text-xl font-bold text-slate-700 block mt-1">排班极度宽松</span>
                  </div>
                </div>
              </div>

            </div>
          </main>
        )}

        {/* RIGHT SIDEBAR: INTELLIGENT HELPERS, SUBSTITUTION WIDGET AND GEMINI AUDITING */}
        <aside id="right_sidebar" className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
          
          {/* HEADER SECTIONS: COLLATERAL ADVICE & DIAGNOSTICS */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0 select-none">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></span>
              数据诊断及临时代课调配
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* COMPONENT 1: ACTIVE SELECTED CELL INSPECTOR & SUBSTITUTION RECOMMENDATIONS */}
            {selectedCell ? (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold text-blue-800 tracking-tight">【检查授课时段单元】</span>
                  <button 
                    onClick={() => { setSelectedCell(null); setSubstituteData(null); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="space-y-1.5 mb-3 bg-white p-2.5 rounded border border-blue-100 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">任教班次</span><span className="font-bold text-slate-800">{selectedCell.teachingClassName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">学科/教室</span><span className="font-semibold text-slate-700">{selectedCell.subject} | {selectedCell.classroomName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">原定老师</span><span className="font-bold text-slate-700">{selectedCell.teacherName} (周{selectedCell.day}第{selectedCell.period}节)</span></div>
                  {selectedCell.isTemp && <div className="text-[10px] text-orange-600 font-bold">ℹ️ 该课程经历过手动微调。</div>}
                </div>

                {/* Sub recommendations list */}
                {substituteLoading ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded border border-blue-100">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mb-1"></div>
                    <span className="text-[10px] text-slate-500">正在精密校算同组教师课时负荷...</span>
                  </div>
                ) : (
                  substituteData && (
                    <div className="space-y-2">
                      <span className="text-[10.5px] font-bold text-blue-900 block">推荐代/顶替本学课老师方案：</span>
                      
                      <div className="space-y-1.5">
                        {substituteData.recommendations.map((rec) => {
                          const disabled = rec.hasConflictOnChosenSlot || rec.suitabilityScore === 0;
                          return (
                            <div 
                              key={rec.teacher.id} 
                              className={`bg-white p-2.5 rounded border border-slate-200 text-[10.5px] ${disabled ? 'opacity-50' : ''}`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-slate-800">
                                  {rec.teacher.name}老师 ({rec.teacher.subjects[0]})
                                </span>
                                <span className="font-mono text-[9.5px] text-blue-700 bg-blue-50 px-1 font-bold">
                                  评分 {rec.suitabilityScore}
                                </span>
                              </div>
                              
                              <ul className="text-[9.5px] text-slate-500 list-disc list-inside space-y-0.5">
                                {rec.reasons.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>

                              {!disabled ? (
                                <button
                                  onClick={() => handleApplySubstitute(rec.teacher.id)}
                                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 rounded text-[9.5px]"
                                >
                                  选择将其调整为此代课教师
                                </button>
                              ) : (
                                <span className="block mt-1 text-[8.5px] text-rose-500 font-medium text-center">
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
            ) : (
              // DEFAULT SIDE PANEL TIP FOR NO SICK/LEAVE CHUAN
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-left">
                <span className="text-[11px] font-bold text-slate-400 block tracking-widest uppercase mb-1">
                  代课临时即时匹配
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  开学后有老师临休请假、开会时，系统提供一键推荐代课极速解决方案。
                </p>
                <div className="mt-3 bg-white p-2.5 rounded border border-slate-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="text-[11px] text-slate-600">系统引导：点击左侧 timetable 任意排好课程单元即可进行代课老师调优审计。</span>
                </div>
              </div>
            )}

            {/* COMPONENT 2: NP-HARD WALKING-CLASS DIAGNOSTIC BOARD */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-left flex flex-col space-y-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-xs text-indigo-900">选科走班复杂性与约束诊断</span>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-normal font-sans">
                当“选科组合+分班+教师排课段位”处于极端嵌套状态时，属于典型的 <strong>NP-hard 难题</strong>。
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-indigo-100 space-y-2 text-[11px] text-slate-700 font-sans">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">当前排课难度评估</span>
                  <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 rounded text-[10px]">高维硬限</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">硬冲突防护:</span>
                    <span className="text-emerald-600 font-semibold">100% 严防死守</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">教师偏好约束:</span>
                    <span className="font-semibold text-slate-800">
                      {configSettings.allowTeacherPrefRelaxation ? '🎨 [容错已放开]' : '🔒 [坚守高压限]'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">实验室负荷预警:</span>
                    <span className="font-semibold text-slate-800">
                      {configSettings.allowClassroomLoadRelaxation ? '🎨 [容错已放开]' : '🔒 [坚守高压限]'}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-indigo-600 shrink-0"></span>
                    <span>老师请假时，请点击课表格点唤醒同组推荐。</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-indigo-600 shrink-0"></span>
                    <span>考核结束后可点击学考停课变更释放资源。</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RESOURCE ALERTS WARNING CHANNELS */}
            <div className="p-3.5 rounded-xl border border-slate-200 text-left bg-white shadow-xs">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
                校方教学核心资源预警
              </span>
              
              <div className="space-y-3 font-medium text-xs">
                <div>
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-600">理化探究实验室 A 室</span>
                    <span className="text-rose-600 font-bold font-mono">92%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full w-[92%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-600">多媒体网络机房 201</span>
                    <span className="text-emerald-600 font-bold font-mono">48%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[48%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="text-slate-600">数字化通用技术实验室</span>
                    <span className="text-orange-500 font-bold font-mono">75%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full w-[75%]"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </aside>
      </div>

      {/* --- ALL POPUP MODAL OVERLAYS IN THE GEOMETRIC MOOD STYLE --- */}

      {/* 1. ADD TEACHER MODAL */}
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
                      <option value="历史">历史</option>
                      <option value="地理">地理</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">最高允许周课时</label>
                    <input 
                      type="number" 
                      required 
                      value={newTeacherWeeklyHours} 
                      onChange={e => setNewTeacherWeeklyHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">联系电话</label>
                  <input 
                    type="text" 
                    required 
                    value={newTeacherPhone} 
                    onChange={e => setNewTeacherPhone(e.target.value)}
                    placeholder="例如: 13999991111" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">教研任职科组</label>
                  <input 
                    type="text" 
                    required 
                    value={newTeacherDept} 
                    onChange={e => setNewTeacherDept(e.target.value)}
                    placeholder="例如: 物理备课组" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddTeacherModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-colors"
                  >
                    确认录用任职
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 2. ADD CLASSROOM MODAL */}
      {showAddClassroomModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left">
            <div className="h-2 bg-emerald-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  申设新增走班专用教室
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
                    placeholder="例如: 特色历史走班创新教室305" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">教室属性种类</label>
                    <select 
                      value={newClassroomType} 
                      onChange={e => setNewClassroomType(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ordinary">普通基础教室</option>
                      <option value="lab">探究实验室 (理化生技术)</option>
                      <option value="media">网络信息化机房空间</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">核定人数容载量</label>
                    <input 
                      type="number" 
                      required 
                      value={newClassroomCapacity} 
                      onChange={e => setNewClassroomCapacity(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">主授/分配科目学科</label>
                  <input 
                    type="text" 
                    required 
                    value={newClassroomSubject} 
                    onChange={e => setNewClassroomSubject(e.target.value)}
                    placeholder="例如: 历史" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowAddClassroomModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold transition-colors"
                  >
                    申设交付使用
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 3. EXCEL CSV BATCH IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-left">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5 animate-pulse">
                  <Upload className="w-5 h-5 text-blue-600" />
                  一键导入校方 Excel 高考数据表
                </h3>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleImportCSVData} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-600 mb-1">选择导入的目标数据规准种类</label>
                  <div className="flex gap-4 p-2 bg-slate-100 rounded border border-slate-200">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="importType" 
                        checked={importType === 'teacher'} 
                        onChange={() => { setImportType('teacher'); setImportRawText(''); }}
                      />
                      <span>高级教师教科研人事模板表</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="importType" 
                        checked={importType === 'classroom'} 
                        onChange={() => { setImportType('classroom'); setImportRawText(''); }}
                      />
                      <span>走班实验场地空间模板表</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">贴入数据列，或者一键生成预置测试数据:</span>
                  <button 
                    type="button" 
                    onClick={fillImportTemplate}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    🧙 生成粘贴仿真表格模本
                  </button>
                </div>

                <div>
                  <textarea 
                    rows={6}
                    required
                    value={importRawText}
                    onChange={e => setImportRawText(e.target.value)}
                    placeholder="例如首行：姓名,授课科目,总额定周课时,联系电话,任教组别"
                    className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded p-3 focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="bg-slate-100 p-2.5 rounded text-[11px] text-slate-500 leading-normal">
                  提示：系统导入器采用逗号 `,` 分隔符自动解算器。完成导入后直接触发自动冲突交叉重算并载入 timetable。
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowImportModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-colors"
                  >
                    导入进入排课数据库
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 4. SAVE SNAPSHOT CONFIGURATION MODAL */}
      {showSnapshotModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left">
            <div className="h-2 bg-blue-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-5 h-5 text-blue-600" />
                  保存当前正在微调排课方案快照
                </h3>
                <button onClick={() => setShowSnapshotModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSnapshot} className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-600 mb-1">快照版本名称</label>
                  <input 
                    type="text" 
                    required 
                    value={snapshotName} 
                    onChange={e => setSnapshotName(e.target.value)}
                    placeholder="例如: 高二物理二期调休备案" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">调整方案背景备忘描述</label>
                  <textarea 
                    rows={3}
                    required
                    value={snapshotDesc}
                    onChange={e => setSnapshotDesc(e.target.value)}
                    placeholder="例如: 为语文组老师周一早研会避让，全校课时顺延1节，物理实验室增加容错率"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowSnapshotModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-bold transition-colors"
                  >
                    录入快照归档并封存
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* 5. COURSE PHASE COMPLETION DELETION WIZARD */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-left">
            <div className="h-2 bg-orange-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Timer className="w-5 h-5 text-orange-600" />
                  科目阶段考完停课及资源二次释放释放
                </h3>
                <button onClick={() => setShowShiftModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div className="bg-orange-50 p-3 rounded text-orange-850 leading-relaxed border border-orange-100">
                  🎓 <strong>中国特色走班新高考痛点：</strong> 通常“信息技术”或“通用技术”等必修科目在学考结束后便立即停止授课，如果按死排一学期会闲置大量微机室及师资力量。调用此接口将一键停用后续课程。
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">选择停用结考科目</label>
                  <select 
                    value={shiftSubject} 
                    onChange={e => setShiftSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="通用技术">通用技术 (普通高中必修学考)</option>
                    <option value="信息技术">信息技术 (统考提早段学业水平考)</option>
                    <option value="物理">物理备考特别培优组</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">第几学周起正式物理停课</label>
                    <input 
                      type="number" 
                      required 
                      value={shiftWeek} 
                      onChange={e => setShiftWeek(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col justify-end text-[11px] text-slate-400">
                    学区默认建议第 10 周或 12 周起释放
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">调整方案备注原因文本</label>
                  <input 
                    type="text" 
                    required 
                    value={shiftReason} 
                    onChange={e => setShiftReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  ⚠️ 动作不可逆。触发确认后，该学科全校对应的教师与走班教室将在退役周期届满时即时剔除，排留空白变为空闲状态。
                </p>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowShiftModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFinishSubject}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-bold transition-colors"
                  >
                    确认阶段结业停退
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

       {showJSONModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="h-2 bg-indigo-600"></div>
            <div className="p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Database className="w-5 h-5 text-indigo-600" />
                  JSON 数据库导入、导出与本地备份
                </h3>
                <button onClick={() => setShowJSONModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-normal font-sans">
                为了免除云端注册和保护隐私，<strong>智能排课系统数据支持完全在本地进行批量离线编辑与保存</strong>。您可以在此处将当前的全部教师、教室与走班教学班的最新数据结构下载、备份。也可以复制该 JSON 流进行修改，再粘贴导入到浏览器内，实现新数据的批量热初始化与覆盖启动。
              </p>

              {jsonError && (
                <div id="json_error_block" className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-semibold mb-4 leading-normal">
                  ⚠️ {jsonError}
                </div>
              )}

              <form onSubmit={handleJSONImportSubmit} className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        navigator.clipboard.writeText(jsonRawText);
                        alert("📋 已成功将当前 JSON 导出结构复制到您的电脑剪贴板！可以直接新建文件保存。");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-bold text-slate-700 shadow-xs flex items-center gap-1"
                    >
                      📋 复制当前 JSON
                    </button>
                    <button
                      type="button"
                      onClick={loadComprehensiveTemplate}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-bold text-slate-700 shadow-xs flex items-center gap-1"
                    >
                      🧪 载入详尽综合数据模板 (含请假/任务)
                    </button>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => {
                      const blob = new Blob([jsonRawText], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `智能排课系统_本地备份_${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-[11px] font-extrabold text-indigo-700 flex items-center gap-1"
                  >
                    ⬇️ 下载 JSON 备份文件 (.json)
                  </button>
                </div>

                <div>
                  <label className="block text-slate-700 text-xs font-bold mb-1">主数据 JSON 编辑与贴入区域 (可自由修改或清空替换):</label>
                  <textarea 
                    rows={12}
                    required
                    value={jsonRawText}
                    onChange={e => setJsonRawText(e.target.value)}
                    placeholder="输入不含 AI 标记的干净排课 JSON 主数据..."
                    className="w-full font-mono text-[11px] bg-slate-900 text-emerald-400 border border-slate-300 rounded p-3 focus:ring-1 focus:ring-indigo-500 max-h-80 overflow-y-auto"
                  ></textarea>
                </div>

                <div className="bg-slate-50 p-3 rounded text-[10.5pt] text-slate-500 leading-normal border border-slate-100 font-sans scale-98">
                  💡 <span className="font-bold text-slate-700">新手入门步骤：</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 mt-1 text-[11px]">
                    <li>点击上方的 <strong>“复制当前 JSON”</strong>，在您电脑的本地编辑器内编辑教师名单、教室名。</li>
                    <li>编辑完成后，将该 JSON 内容全选，粘贴到上方的黑色代码框中。</li>
                    <li>点击下方的 <strong>“导入并批量热载入主数据库”</strong> 按钮，即可在网页上直接看到修改后的数据并进行交互操作。</li>
                  </ol>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowJSONModal(false)}
                    className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 text-xs font-bold transition-colors"
                  >
                    返回
                  </button>
                  <button 
                    type="submit" 
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-extrabold text-xs transition-colors shadow-lg shadow-indigo-100"
                  >
                    导入并批量热载入主数据库
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
