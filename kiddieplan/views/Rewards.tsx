
import React from 'react';
import { Child, Reward, UserRole } from '../types';
import { Gift, Heart, Sparkles, Award, Star } from 'lucide-react';

interface RewardsProps {
  child: Child;
  updateChild: (id: string, updates: Partial<Child>) => void;
  rewards: Reward[];
  role: UserRole;
}

const Rewards: React.FC<RewardsProps> = ({ child, updateChild, rewards, role }) => {
  const handleRedeem = (reward: Reward) => {
    if (role === 'parent') {
      alert('家长不能换奖励哦，这是给小朋友的礼物～');
      return;
    }
    if (child.points >= reward.pointsCost) {
      if (confirm(`确定要花 ${reward.pointsCost} 币兑换 "${reward.name}" 吗？`)) {
        updateChild(child.id, { points: child.points - reward.pointsCost });
        alert('🎉 兑换成功！快去找爸爸妈妈领取奖励吧！');
      }
    } else {
      alert('积分还没攒够呢，再坚持一下下就好啦！');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="sketch-card p-6 bg-[#FF6B81]/60 relative">
        <div className="tape"></div>
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-black opacity-50 mb-1">我的成长积分池</div>
          <div className="flex items-center gap-2">
            <Star className="text-white fill-white" size={24} />
            <div className="text-5xl font-handwriting text-[#3E2723]">{child.points.toFixed(1)}</div>
          </div>
          <div className="mt-3 text-[10px] font-bold bg-white/40 px-3 py-1 rounded-full border border-[#3E2723]/20">
            继续加油，解锁更多惊喜！
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-handwriting text-2xl flex items-center gap-2 text-[#3E2723]">
          <Gift size={24} className="text-[#FF8095]" /> 梦想兑换站
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {rewards.map(reward => (
            <div
              key={reward.id}
              onClick={() => handleRedeem(reward)}
              className="sketch-card p-4 bg-white flex flex-col items-center gap-3 cursor-pointer group hover:bg-[#FFF5E1]"
            >
              <div className="text-5xl group-hover:scale-110 transition-transform">{reward.icon}</div>
              <div className="text-center">
                <div className="font-bold text-xs line-clamp-1">{reward.name}</div>
                <div className="text-[10px] font-black text-red-500 mt-1">{reward.pointsCost} CP</div>
              </div>
              <button className={`w-full py-1.5 sketch-button text-[10px] font-bold ${child.points >= reward.pointsCost ? 'bg-[#FFB6C1]' : 'bg-gray-100 text-gray-400 opacity-50'}`}>
                {child.points >= reward.pointsCost ? '立即换取' : '分不够哟'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Rewards;
