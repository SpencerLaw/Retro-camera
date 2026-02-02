import React, { useState, useEffect, useMemo } from 'react';
import './styles.css';
import { AppTab, Child, AppState, Task } from './types';
import { INITIAL_CHILDREN, INITIAL_REWARDS, DEFAULT_TASKS } from './constants';
import Dashboard from './views/Dashboard';
import Rewards from './views/Rewards';
import Profile from './views/Profile';
import Planner from './views/Planner';
import {
  Home,
  CalendarDays,
  Gift,
  User,
  Lock,
  Smile,
  Sparkles
} from 'lucide-react';

const KiddiePlanApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showPinGate, setShowPinGate] = useState(false);
  const [pin, setPin] = useState('');

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('kiddieplan_handdrawn_state');
    if (saved) return JSON.parse(saved);
    return {
      children: INITIAL_CHILDREN,
      selectedChildId: INITIAL_CHILDREN[0].id,
      rewards: INITIAL_REWARDS,
      role: 'child'
    };
  });

  useEffect(() => {
    localStorage.setItem('kiddieplan_handdrawn_state', JSON.stringify(state));
  }, [state]);

  const selectedChild = useMemo(() =>
    state.children.find(c => c.id === state.selectedChildId) || state.children[0]
    , [state]);

  const toggleRole = () => {
    if (state.role === 'child') {
      setShowPinGate(true);
    } else {
      setState(prev => ({ ...prev, role: 'child' }));
      setActiveTab('home');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '2025') {
      setState(prev => ({ ...prev, role: 'parent' }));
      setShowPinGate(false);
      setPin('');
    } else {
      alert('密码不对哦，请家长来开锁～');
      setPin('');
    }
  };

  const updateChild = (childId: string, updates: Partial<Child>) => {
    setState(prev => ({
      ...prev,
      children: prev.children.map(c => c.id === childId ? { ...c, ...updates } : c)
    }));
  };

  const toggleTask = (taskId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentSchedule = selectedChild.schedules.find(s => s.date === todayStr);
    let newSchedules = [...selectedChild.schedules];
    let pointsChange = 0;

    if (!currentSchedule) {
      const newTasks: Task[] = DEFAULT_TASKS.map((t, idx) => ({
        ...t, id: `t-${todayStr}-${idx}`, completed: false
      } as Task));
      const taskIndex = newTasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        newTasks[taskIndex].completed = true;
        pointsChange = newTasks[taskIndex].points;
      }
      newSchedules.push({ date: todayStr, tasks: newTasks });
    } else {
      const scheduleIndex = newSchedules.findIndex(s => s.date === todayStr);
      const updatedTasks = currentSchedule.tasks.map(t => {
        if (t.id === taskId) {
          const newState = !t.completed;
          pointsChange = newState ? t.points : -t.points;
          return { ...t, completed: newState };
        }
        return t;
      });
      newSchedules[scheduleIndex] = { ...currentSchedule, tasks: updatedTasks };
    }

    updateChild(selectedChild.id, {
      schedules: newSchedules,
      points: Math.max(0, selectedChild.points + pointsChange)
    });
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative overflow-hidden">
      {/* 顶部孩子选择条 - 只有家长模式或特定状态下显示 */}
      <div className="px-6 pt-10 pb-2 flex justify-between items-end z-10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 sketch-card overflow-hidden">
            <img src={selectedChild.avatar} alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-handwriting text-[#4C3D3D]">
              {state.role === 'parent' ? '家长大人' : `${selectedChild.name}的本子`}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#FFD95A] px-2 py-0.5 rounded-full border border-[#4C3D3D] font-bold">
                {selectedChild.points.toFixed(1)} CP
              </span>
              {state.role === 'parent' && <Sparkles size={14} className="text-indigo-500" />}
            </div>
          </div>
        </div>
        <button
          onClick={toggleRole}
          className={`w-12 h-12 sketch-button flex items-center justify-center ${state.role === 'parent' ? 'bg-[#FFB1B1]' : 'bg-white'}`}
        >
          {state.role === 'parent' ? <Lock size={20} /> : <Lock size={20} className="opacity-40" />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pb-32 z-10 mt-4">
        {activeTab === 'home' && <Dashboard child={selectedChild} onToggleTask={toggleTask} role={state.role} />}
        {activeTab === 'plan' && <Planner child={selectedChild} updateChild={updateChild} role={state.role} />}
        {activeTab === 'rewards' && <Rewards child={selectedChild} updateChild={updateChild} rewards={state.rewards} role={state.role} />}
        {activeTab === 'me' && <Profile children={state.children} selectedChildId={state.selectedChildId} onSelectChild={(id) => setState(prev => ({ ...prev, selectedChildId: id }))} role={state.role} />}
      </main>

      {/* Tab Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="bg-white border-[3px] border-[#4C3D3D] rounded-[25px] p-2 flex justify-around items-center shadow-[0_6px_0px_#4C3D3D]">
          <button
            onClick={() => setActiveTab('home')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'home' ? 'tab-active' : 'text-gray-400'}`}
          >
            <Home size={24} />
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'plan' ? 'tab-active' : 'text-gray-400'}`}
          >
            <CalendarDays size={24} />
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'rewards' ? 'tab-active' : 'text-gray-400'}`}
          >
            <Gift size={24} />
          </button>
          <button
            onClick={() => setActiveTab('me')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'me' ? 'tab-active' : 'text-gray-400'}`}
          >
            <User size={24} />
          </button>
        </div>
      </nav>

      {/* PIN GATE */}
      {showPinGate && (
        <div className="fixed inset-0 z-[100] bg-[#4C3D3D]/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="sketch-card bg-white p-8 w-full max-w-xs flex flex-col items-center">
            <div className="tape"></div>
            <h2 className="text-xl font-handwriting mb-4">家长请解锁</h2>
            <form onSubmit={handlePinSubmit} className="w-full text-center">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="w-full bg-[#FFF9E1] border-2 border-[#4C3D3D] rounded-xl py-3 text-center text-xl focus:outline-none mb-4"
                placeholder="密码: 2025"
                maxLength={4}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPinGate(false)} className="flex-1 font-bold text-[#4C3D3D]/60 text-sm">取消</button>
                <button type="submit" className="flex-1 sketch-button bg-[#FFB1B1] py-2 font-bold">确认</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KiddiePlanApp;
