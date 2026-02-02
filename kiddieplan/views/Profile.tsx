
import React from 'react';
import { Child, UserRole } from '../types';
import { Users, ChevronRight, Heart, Smile, Plus, LogOut } from 'lucide-react';

interface ProfileProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  role: UserRole;
}

const Profile: React.FC<ProfileProps> = ({ children, selectedChildId, onSelectChild }) => {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="sketch-card p-6 bg-white">
        <div className="tape"></div>
        <h3 className="font-handwriting text-2xl mb-6 text-center">我们的家</h3>

        <div className="flex justify-around items-center">
          {children.map(child => (
            <button 
              key={child.id}
              onClick={() => onSelectChild(child.id)}
              className={`flex flex-col items-center gap-2 transition-all ${selectedChildId === child.id ? 'scale-110' : 'opacity-40 grayscale'}`}
            >
              <div className={`w-16 h-16 sketch-card overflow-hidden ${selectedChildId === child.id ? 'border-[#FFD95A]' : ''}`}>
                 <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-black">{child.name}</span>
              {selectedChildId === child.id && <Smile size={12} className="text-[#FFD95A]" />}
            </button>
          ))}
          {children.length < 3 && (
            <button className="flex flex-col items-center gap-2 opacity-30">
               <div className="w-16 h-16 sketch-card border-dashed flex items-center justify-center">
                  <Plus size={24} />
               </div>
               <span className="text-xs font-black">添加</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {[
          { icon: <Heart className="text-[#FF6969]" />, label: '家长寄语', color: 'bg-[#FFE5E5]' },
          { icon: <Smile className="text-[#FFD95A]" />, label: '我的成就记录', color: 'bg-[#FFF9E1]' },
          { icon: <LogOut className="text-gray-400" />, label: '退出登录', color: 'bg-gray-50' },
        ].map((item, idx) => (
          <div key={idx} className={`sketch-card p-4 flex items-center justify-between cursor-pointer hover:translate-x-1 transition-all ${item.color}`}>
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 sketch-card bg-white flex items-center justify-center">
                  {item.icon}
               </div>
               <span className="font-bold text-sm">{item.label}</span>
            </div>
            <ChevronRight size={18} className="opacity-20" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
