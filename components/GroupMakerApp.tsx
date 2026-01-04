import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Download, Play, Trash2, LayoutGrid, X } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import './GroupMakerStyles.css';

interface Group {
  id: number;
  name: string;
  members: string[];
}

interface BallData {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isPicked: boolean;
}

export const GroupMakerApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [names, setNames] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [balls, setBalls] = useState<BallData[]>([]);
  const [currentPickingName, setCurrentPickingName] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const clawArmRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  const colors = ['#FF6B6B', '#48DBFB', '#1DD1A1', '#FECA57', '#5F27CD', '#FF9FF3', '#00D2D3', '#54A0FF'];

  useEffect(() => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (!isAnimating) {
      setBalls(list.map((name, i) => ({
        name,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color: colors[i % colors.length],
        isPicked: false
      })));
    }
  }, [names, isAnimating]);

  const animateBalls = () => {
    setBalls(prev => prev.map(ball => {
      if (ball.isPicked) return ball;
      let newX = ball.x + ball.vx;
      let newY = ball.y + ball.vy;
      if (newX < 10 || newX > 380) ball.vx *= -1;
      if (newY < 10 || newY > 300) ball.vy *= -1;
      return { ...ball, x: newX, y: newY };
    }));
    requestRef.current = requestAnimationFrame(animateBalls);
  };

  useEffect(() => {
    if (isAnimating) requestRef.current = requestAnimationFrame(animateBalls);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAnimating]);

  const handleStartGrouping = async () => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (list.length < numGroups) {
      alert(t('home.groupMaker.errorLow'));
      return;
    }

    setIsAnimating(true);
    setGroups([]);
    
    const shuffledBalls = [...balls].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `${t('home.groupMaker.groupNamePrefix')} ${i + 1} ${t('home.groupMaker.groupNameSuffix')}`,
      members: []
    }));

    // High speed rolling
    setBalls(prev => prev.map(b => ({ ...b, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, isPicked: false })));

    for (let i = 0; i < shuffledBalls.length; i++) {
      const target = shuffledBalls[i];
      const gid = i % numGroups;

      if (clawArmRef.current) {
        clawArmRef.current.style.height = '280px';
        await new Promise(r => setTimeout(r, 300));
      }

      setCurrentPickingName(target.name);
      setBalls(prev => prev.map(b => b.name === target.name ? { ...b, isPicked: true } : b));

      if (clawArmRef.current) {
        clawArmRef.current.style.height = '40px';
        await new Promise(r => setTimeout(r, 200));
      }

      newGroups[gid].members.push(target.name);
      setGroups([...newGroups]);
      setCurrentPickingName(null);
      await new Promise(r => setTimeout(r, 50));
    }
    setIsAnimating(false);
  };

  return (
    <div className="group-maker-app">
      <button onClick={() => navigate('/')} className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white border-4 border-pink-400 text-pink-500 shadow-xl hover:scale-110 transition-transform">
        <ArrowLeft size={28} strokeWidth={3} />
      </button>

      <div className="group-maker-container">
        {/* Panel 1: Name Registry */}
        <div className="factory-panel left-panel">
          <div className="panel-header">📝 {t('home.groupMaker.inputPlaceholder')?.split('...')[0] || 'Name List'}</div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <button onClick={() => setNames("")} className="clear-btn">{t('home.groupMaker.clearBtn')}</button>
          </div>
        </div>

        {/* Panel 2: The Machine Hub */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🏗️ ACTION CENTER</div>
          <div className="machine-cabinet">
            <div className="claw-arm" ref={clawArmRef}>
              {currentPickingName && (
                <div className="alien-ball" style={{ position: 'absolute', bottom: '-60px', left: '-20px', background: '#FFD700' }}>
                  {currentPickingName.slice(0, 4)}
                </div>
              )}
            </div>
            {balls.map((ball, i) => !ball.isPicked && (
              <div key={i} className="alien-ball" style={{ left: ball.x, top: ball.y, background: ball.color }}>
                {ball.name.slice(0, 2)}
              </div>
            ))}
          </div>
          <div className="machine-controls">
            <div className="flex items-center justify-center gap-4 bg-white/20 p-2 rounded-2xl mb-2">
              <span className="font-bold text-white text-lg">{t('home.groupMaker.groupCount')}</span>
              <input 
                type="number" className="w-20 p-2 rounded-xl border-none text-center font-black text-blue-600 outline-none"
                value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
            </div>
            <button className="start-btn" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>
              {isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}
            </button>
          </div>
        </div>

        {/* Panel 3: Delivery Station (Results) */}
        <div className="factory-panel right-panel">
          <div className="panel-header flex justify-between items-center px-6">
            <span>📦 {t('home.groupMaker.results')}</span>
            {groups.length > 0 && (
              <button onClick={() => {
                const text = groups.map(g => `${g.name}: ${g.members.join(", ")}`).join("\n");
                const blob = new Blob([text], {type: 'text/plain'});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'groups.txt';
                link.click();
              }} className="bg-white/30 hover:bg-white/50 p-2 rounded-full transition-colors text-green-900">
                <Download size={20} />
              </button>
            )}
          </div>
          <div className="results-content">
            {groups.length > 0 ? (
              <div className="groups-grid">
                {groups.map(group => (
                  <div key={group.id} className="group-card-compact" onClick={() => setSelectedGroup(group)}>
                    <div className="group-avatar-stack">
                      {group.members.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="group-avatar">
                          {m.slice(0, 1).toUpperCase()}
                        </div>
                      ))}
                      {group.members.length > 3 && (
                        <div className="group-avatar" style={{background: '#BDBDBD', color: 'white'}}>
                          +{group.members.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="group-name">{group.name}</div>
                    <div className="group-count">{group.members.length} <Users size={12} className="inline"/></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-green-800/30 gap-4">
                <LayoutGrid size={80} strokeWidth={3} />
                <p className="font-bold italic text-xl text-center px-4">{t('home.groupMaker.waitingMsg')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Group Details */}
      {selectedGroup && (
        <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedGroup(null)}>
              <X size={28} strokeWidth={3} />
            </button>
            <div className="modal-header">
              <h2 className="modal-title">{selectedGroup.name}</h2>
              <p className="text-gray-500 font-bold">{selectedGroup.members.length} Members</p>
            </div>
            <div className="modal-body">
              {selectedGroup.members.map((member, idx) => (
                <span key={idx} className="member-chip-large">
                  {member}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};