
import React, { useState } from 'react';
import { Child, UserRole, PlanningView } from '../types';
import { PERIOD_LABELS, PERIOD_COLORS, DEFAULT_TASKS } from '../constants';
import { Calendar, ChevronRight, Sparkles, Map, Flag, Gift } from 'lucide-react';

interface PlannerProps {
  child: Child;
}

const Planner: React.FC<PlannerProps> = ({ child }) => {
  const [view, setView] = useState<PlanningView>('week');
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      {/* 视图切换 */}
      <div className="flex gap-2">
        {(['week', 'future'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 sketch-button font-handwriting text-lg ${view === v ? 'bg-[#FFD95A]' : 'bg-white'}`}
          >
            {v === 'week' ? '本周规划' : '未来展望'}
          </button>
        ))}
      </div>

      {view === 'week' ? (
        <div className="sketch-card p-5 bg-[#E5F9FF]">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="text-[#008BB1]" />
            <h3 className="font-handwriting text-2xl">七日成长周刊</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {weekDays.map((day, idx) => (
              <div key={day} className="sketch-card bg-white p-3 flex justify-between items-center group cursor-pointer hover:bg-[#FFF9E1]">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 sketch-button flex items-center justify-center font-bold ${idx < 3 ? 'bg-[#FFB1B1]' : 'bg-[#FFD95A]'}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-black opacity-40">{day}</div>
                    <div className="font-bold text-sm">
                      {idx === 0 ? '重点：作业大作战' : idx === 6 ? '重点：户外远足' : '常规打卡日'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="opacity-20 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sketch-card p-6 bg-[#F2E5FF] min-h-[400px] relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
            <Map className="text-[#6900FF]" />
            <h3 className="font-handwriting text-2xl">未来两周路线图</h3>
          </div>

          {/* 模拟路线图线条 */}
          <div className="absolute top-20 bottom-10 left-[40px] w-1 bg-[#4C3D3D]/10 rounded-full"></div>

          <div className="space-y-12 relative">
            {[
              { title: '本周：巩固期', detail: '完成所有寒假作业第一阶段', icon: <Flag size={14} />, color: 'bg-[#FFD95A]' },
              { title: '下周：提升期', detail: '每日增加30分钟英语听力', icon: <Sparkles size={14} />, color: 'bg-[#FFB1B1]' },
              { title: '未来：奖励期', detail: '如果坚持打卡，周末去游乐园！', icon: <Gift size={14} />, color: 'bg-[#B1EFFF]' },
            ].map((milestone, idx) => (
              <div key={idx} className="flex gap-4 items-start relative z-10">
                <div className={`w-12 h-12 sketch-card ${milestone.color} flex items-center justify-center shrink-0`}>
                  {milestone.icon}
                </div>
                <div className="pt-1">
                  <h4 className="font-black text-sm">{milestone.title}</h4>
                  <p className="text-[10px] text-[#4C3D3D]/60 mt-1 font-bold">{milestone.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Planner;
