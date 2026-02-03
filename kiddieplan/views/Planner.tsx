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
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-4 kawaii-button font-candy text-xl transition-all shadow-xl ${view === v ? 'bg-[#F8E4D9] text-[#8B6F47] border-white scale-110' : 'bg-white/60 text-[#8B6F47]/40 border-transparent'}`}
          >
            {v === 'week' ? '本周图纸' : '梦想航线'}
          </button>
        ))}
      </div>

      {
        view === 'week' ? (
          <div className="kawaii-card p-10 bg-white/40 border-white shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-[#D6E6F2] rounded-[28px] flex items-center justify-center shadow-xl border-4 border-white animate-float-kawaii">
                <Calendar size={28} className="text-[#8B6F47]" />
              </div>
              <div>
                <h3 className="font-candy text-4xl text-[#8B6F47] tracking-tight">七日梦想航志</h3>
                <p className="text-[11px] font-bold text-[#B8A89A] opacity-80 uppercase tracking-[0.4em]">Weekly Magic Tracker</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {weekDays.map((day, idx) => (
                <div key={day} className="kawaii-card bg-white p-6 flex justify-between items-center group cursor-pointer hover:bg-[#FFF9C4]/30 border-white shadow-lg transition-all hover:translate-x-3">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-[28px] flex items-center justify-center font-candy text-white shadow-xl border-4 border-white ${idx < 3 ? 'bg-[#FADAD1]' : 'bg-[#F8E4D9]'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-[#8B6F47] opacity-30 uppercase tracking-[0.3em]">{day}</div>
                      <div className="font-bold text-[#8B6F47] text-xl">
                        {idx === 0 ? '重点：奇幻作业挑战' : idx === 6 ? '重点：梦幻岛远足' : '常规探索日'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={22} className="text-[#8B6F47] opacity-10 group-hover:opacity-100 group-hover:text-[#F8E4D9] transition-all" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="kawaii-card p-12 bg-white/40 border-white shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-[#FADAD1] rounded-[28px] flex items-center justify-center shadow-xl border-4 border-white animate-float-kawaii">
                <Map size={28} className="text-[#8B6F47]" />
              </div>
              <div>
                <h3 className="font-candy text-4xl text-[#8B6F47] tracking-tight">梦想进阶航线</h3>
                <p className="text-[11px] font-bold text-[#B8A89A] opacity-80 uppercase tracking-[0.4em]">Future Magic Roadmap</p>
              </div>
            </div>

            {/* Connection Line - Warm Glow */}
            <div className="absolute top-32 bottom-20 left-[67px] w-3 bg-[#F8E4D9]/20 rounded-full shadow-inner"></div>

            <div className="space-y-12 relative">
              {[
                { title: '阶段一：奇才萌动', detail: '完成所有寒假作业第一阶段', icon: <Flag size={18} />, color: '#FFF0D9' },
                { title: '阶段二：梦想起飞', detail: '每日增加30分钟英语听力', icon: <Sparkles size={18} />, color: '#FADAD1' },
                { title: '阶段三：全能旅人', detail: '如果坚持打卡，周末去游乐园！', icon: <Gift size={18} />, color: '#D6E6F2' },
              ].map((milestone, idx) => (
                <div key={idx} className="flex gap-8 items-start relative z-10">
                  <div className={`w-16 h-16 kawaii-card ${idx === 0 ? milestone.color : 'bg-white'} flex items-center justify-center shrink-0 shadow-2xl border-4 border-white animate-float-kawaii translate-x-[-4px]`} style={{ backgroundColor: idx === 0 ? '' : milestone.color as string, animationDelay: `${idx * 0.3}s` }}>
                    <div className="text-[#8B6F47]">{milestone.icon}</div>
                  </div>
                  <div className="pt-3 space-y-1">
                    <h4 className="font-candy text-2xl text-[#8B6F47]">{milestone.title}</h4>
                    <p className="text-[11px] text-[#B8A89A] font-bold leading-relaxed uppercase tracking-wider">{milestone.detail}</p>
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
