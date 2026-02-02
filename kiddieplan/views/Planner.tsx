import React, { useState } from 'react';
import { Child, PlanningView } from '../types';
import { Calendar, ChevronRight, Sparkles, Map, Flag, Gift } from 'lucide-react';

interface PlannerProps {
  child: Child;
}

const Planner: React.FC<PlannerProps> = ({ child }) => {
  const [view, setView] = useState<PlanningView>('week');
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-10">
      {/* View Switcher */}
      <div className="flex gap-4">
        {(['week', 'future'] as const).map(v => (
          className = {`flex-1 py-3 kawaii-button font-candy text-lg transition-all ${view === v ? 'bg-[#D99C52] text-white shadow-lg scale-105' : 'bg-white/60 text-[#4D3A29]/40'}`}
        {v === 'week' ? '本周图纸' : '梦想航线'}
      </button>
        ))}
    </div>

      {
    view === 'week' ? (
      <div className="kawaii-card p-6 bg-white/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#D99C52] rounded-[15px] flex items-center justify-center shadow-sm">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-candy text-2xl text-[#4D3A29]">七日成长周刊</h3>
            <p className="text-[8px] font-bold text-[#D99C52] opacity-30 uppercase tracking-widest">Weekly Growth Map</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {weekDays.map((day, idx) => (
            <div key={day} className="kawaii-card bg-white p-4 flex justify-between items-center group cursor-pointer hover:bg-pastel-yellow/30 border-none shadow-sm transition-all hover:translate-x-1">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-[15px] flex items-center justify-center font-candy text-white shadow-sm ${idx < 3 ? 'bg-[#E29578]' : 'bg-[#D99C52]'}`}>
                  {idx + 1}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#4D3A29] opacity-30 uppercase tracking-widest">{day}</div>
                  <div className="font-bold text-[#4D3A29] text-sm">
                    {idx === 0 ? '重点：奇幻作业挑战' : idx === 6 ? '重点：梦幻岛远足' : '常规探索日'}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-macaron opacity-10 group-hover:opacity-100 group-hover:text-pastel-purple transition-all" />
            </div>
          ))}
        </div>
      </div>
    ) : (
    <div className="kawaii-card p-8 bg-white/60 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#E29578] rounded-[15px] flex items-center justify-center shadow-sm">
          <Map size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-candy text-2xl text-[#4D3A29]">梦想进阶航线</h3>
          <p className="text-[8px] font-bold text-[#D99C52] opacity-30 uppercase tracking-widest">Future Roadmap</p>
        </div>
      </div>

      {/* Connection Line */}
      <div className="absolute top-24 bottom-16 left-[51px] w-2 bg-[#D99C52]/5 rounded-full"></div>

      <div className="space-y-12 relative">
        {[
          { title: '阶段一：奇才萌动', detail: '完成所有寒假作业第一阶段', icon: <Flag size={14} />, color: 'bg-pastel-yellow' },
          { title: '阶段二：梦想起飞', detail: '每日增加30分钟英语听力', icon: <Sparkles size={14} />, color: 'bg-pastel-pink' },
          { title: '阶段三：全能旅人', detail: '如果坚持打卡，周末去游乐园！', icon: <Gift size={14} />, color: 'bg-pastel-blue' },
        ].map((milestone, idx) => (
          <div key={idx} className="flex gap-6 items-start relative z-10">
            <div className={`w-14 h-14 kawaii-card ${milestone.color} flex items-center justify-center shrink-0 shadow-lg border-4 border-white animate-float`} style={{ animationDelay: `${idx * 0.2}s` }}>
              <div className="text-white">{milestone.icon}</div>
            </div>
            <div className="pt-2">
              <h4 className="font-candy text-lg text-[#4D3A29]">{milestone.title}</h4>
              <p className="text-[10px] text-[#4D3A29]/60 mt-1 font-bold leading-relaxed">{milestone.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  }

    </div >
  );
};

export default Planner;
