
import React, { useMemo } from 'react';
import { Child, UserRole } from '../types';
import { DEFAULT_TASKS, PERIOD_LABELS, PERIOD_COLORS } from '../constants';
import { Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface DashboardProps {
  child: Child;
  onToggleTask: (id: string) => void;
  role: UserRole;
}

const Dashboard: React.FC<DashboardProps> = ({ child, onToggleTask }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedule = child.schedules.find(s => s.date === todayStr);

  const tasks = useMemo(() => {
    if (todaySchedule) return todaySchedule.tasks;
    return DEFAULT_TASKS.map((t, idx) => ({
      ...t, id: `t-${todayStr}-${idx}`, completed: false
    }));
  }, [todaySchedule, todayStr]);

  // 按时间排序
  const sortedTasks = [...tasks].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="sketch-card p-5 bg-[#F5EDE0]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-handwriting text-2xl flex items-center gap-2">
            <Clock size={20} /> 今日时刻表
          </h3>
          <span className="text-xs font-bold text-[#4C3D3D]/50 italic">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>

        {/* 纵向时间轴 */}
        <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#4C3D3D] before:border-dashed before:border-l">
          {sortedTasks.map((task, idx) => (
            <div key={task.id} className="relative">
              {/* 节点图标 */}
              <div className={`absolute left-[-31px] top-1 w-6 h-6 rounded-full border-2 border-[#3E2723] flex items-center justify-center bg-white z-10 transition-colors ${task.completed ? 'bg-[#FF6B81]' : ''}`}>
                {task.completed ? <CheckCircle2 size={12} strokeWidth={3} className="text-white" /> : <div className="w-1.5 h-1.5 bg-[#3E2723] rounded-full"></div>}
              </div>

              {/* 任务内容卡片 */}
              <div
                onClick={() => onToggleTask(task.id)}
                className={`sketch-card p-3 cursor-pointer hover:bg-[#FFF9E1] transition-all active:scale-95 ${task.completed ? 'opacity-60 bg-gray-50' : 'bg-white'}`}
              >
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-black opacity-40 mb-1">{task.timeSlot}</div>
                  <div className="text-[10px] font-bold bg-[#FFF5E1] px-1.5 py-0.5 rounded border border-[#5D4037]">+{task.points} CP</div>
                </div>
                <h4 className={`font-bold text-sm ${task.completed ? 'line-through' : ''}`}>{task.title}</h4>
                <div className="mt-1 flex gap-2">
                  <span className={`text-[8px] font-bold px-1 rounded border border-[#5D4037]/20 ${PERIOD_COLORS[task.period as keyof typeof PERIOD_COLORS]}`}>
                    {PERIOD_LABELS[task.period as keyof typeof PERIOD_LABELS]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sketch-card p-4 border-dashed bg-white/50 text-center italic text-xs font-bold">
        <div className="flex items-center justify-center gap-1">
          <AlertCircle size={14} className="text-[#FFB1B1]" />
          坚持就是胜利，加油哦！
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
