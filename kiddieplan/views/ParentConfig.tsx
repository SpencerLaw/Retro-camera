
import React, { useState } from 'react';
import { Child } from '../types';
import { Edit3, Plus, Calendar, Trash2, ArrowUpCircle, Sparkles } from 'lucide-react';

interface ParentConfigProps {
  children: Child[];
  selectedChild: Child;
  updateChild: (id: string, updates: Partial<Child>) => void;
}

const ParentConfig: React.FC<ParentConfigProps> = ({ selectedChild, updateChild }) => {
  const [bonusPoints, setBonusPoints] = useState('');

  const handleManualBonus = () => {
    const pts = parseFloat(bonusPoints);
    if (!isNaN(pts)) {
      updateChild(selectedChild.id, { points: selectedChild.points + pts });
      setBonusPoints('');
      alert(`奖励发放成功！`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="card-warm p-6 bg-white space-y-5">
        <h3 className="font-handwriting text-2xl flex items-center gap-2">
          <Sparkles className="text-[#5D403795A]" size={24} />
          快速加分
        </h3>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-[#4C3D3D]/50 ml-1">直接发放奖励 (可填负数扣除)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(e.target.value)}
              placeholder="10"
              className="flex-1 bg-[#FFF9E1] border-2 border-[#4C3D3D] rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
            <button
              onClick={handleManualBonus}
              className="btn-pink px-6 py-3 text-white flex items-center gap-2"
            >
              <ArrowUpCircle size={18} /> 确认
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="card-warm p-6 flex flex-col items-center gap-3 bg-[#E6E6FA9FF]">
          <div className="w-14 h-14 bg-white border-2 border-[#4C3D3D] rounded-2xl flex items-center justify-center text-[#008BB1]">
            <Calendar size={32} />
          </div>
          <span className="font-bold text-xs text-[#4C3D3D]">修改作息表</span>
        </button>
        <button className="card-warm p-6 flex flex-col items-center gap-3 bg-[#F2E5FF]">
          <div className="w-14 h-14 bg-white border-2 border-[#4C3D3D] rounded-2xl flex items-center justify-center text-[#6900FF]">
            <Plus size={32} />
          </div>
          <span className="font-bold text-xs text-[#4C3D3D]">新增挑战项</span>
        </button>
        <button className="card-warm p-6 flex flex-col items-center gap-3 bg-[#FFE5E5]">
          <div className="w-14 h-14 bg-white border-2 border-[#4C3D3D] rounded-2xl flex items-center justify-center text-[#FF6969]">
            <Edit3 size={32} />
          </div>
          <span className="font-bold text-xs text-[#4C3D3D]">奖品库编辑</span>
        </button>
        <button className="card-warm p-6 flex flex-col items-center gap-3 bg-gray-50">
          <div className="w-14 h-14 bg-white border-2 border-[#4C3D3D] rounded-2xl flex items-center justify-center text-slate-400">
            <Trash2 size={32} />
          </div>
          <span className="font-bold text-xs text-[#4C3D3D]">清空进度</span>
        </button>
      </div>

      <div className="card-warm p-4 bg-[#FFF9E1]/50 border-dashed">
        <p className="text-[#4C3D3D]/60 text-[10px] font-bold text-center italic">
          💡 小提示：每天给孩子一点自由支配的时间，
          寒假打卡会更有动力哦！
        </p>
      </div>
    </div>
  );
};

export default ParentConfig;
