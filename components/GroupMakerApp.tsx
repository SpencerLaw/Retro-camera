import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, LayoutGrid, X, Users, Trash2 } from 'lucide-react';
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

  const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fab1a0', '#00cec9', '#fd79a8'];

  useEffect(() => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (!isAnimating) {
      setBalls(list.map((name, i) => ({
        name,
        x: Math.random() * 250 + 20,
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
      if (newX < 10 || newX > 320) ball.vx *= -1;
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
      name: `${t('home.groupMaker.groupNamePrefix')}${i + 1}${t('home.groupMaker.groupNameSuffix')}`,
      members: []
    }));

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
      <button onClick={() => navigate('/')} className="fixed top-8 left-8 z-50 p-4 rounded-full bg-white border-4 border-pink-400 text-pink-500 shadow-2xl hover:scale-110 transition-transform active:scale-95">
        <ArrowLeft size={32} strokeWidth={4} />
      </button>

      <div className="group-maker-container">
        {/* Panel 1: Name Registry */}
        <div className="factory-panel left-panel">
          <div className="panel-header">📝 {t('home.groupMaker.inputTitle')}</div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <button onClick={() => setNames("")} className="pixar-btn clear-btn-pixar">
              <Trash2 size={20} className="inline mr-2" />
              {t('home.groupMaker.clearBtn')}
            </button>
          </div>
        </div>

        {/* Panel 2: The Machine Hub */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🏗️ {t('home.groupMaker.actionTitle')}</div>
          <div className="machine-cabinet">
            <div className="claw-arm" ref={clawArmRef}>
              {currentPickingName && (
                <div className="alien-ball" style={{ position: 'absolute', bottom: '-70px', left: '-22px', background: '#fdcb6e', border: '4px solid white', width: '70px', height: '70px' }}>
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
            <div className="flex items-center justify-between bg-white/30 p-4 rounded-3xl border-2 border-white/50">
              <span className="font-black text-white text-xl">{t('home.groupMaker.groupCount')}</span>
              <input 
                type="number" className="w-24 p-2 rounded-2xl border-none text-center font-black text-teal-600 text-2xl outline-none shadow-inner"
                value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
            </div>
            <button className="pixar-btn start-btn" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>
              {isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}
            </button>
          </div>
        </div>

        {/* Panel 3: Delivery Station (Results) */}
        <div className="factory-panel right-panel">
          <div className="panel-header">
             <span>📦 {t('home.groupMaker.results')}</span>
             {groups.length > 0 && (
              <button onClick={() => {
                const text = groups.map(g => `${g.name}: ${g.members.join(", ")}`).join("\n");
                const blob = new Blob([text], {type: 'text/plain'});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'groups.txt';
                link.click();
              }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                <Download size={24} strokeWidth={3} />
              </button>
            )}
          </div>
          <div className="results-content">
            {groups.length > 0 ? (
              <div className="groups-grid">
                {groups.map(group => (
                  <div key={group.id} className="group-card-compact" onClick={() => setSelectedGroup(group)}>
                    <div className="card-badge">{group.members.length}</div>
                    <div className="card-icon">🚀</div>
                    <div className="card-name">{group.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-teal-800/20 gap-4">
                <LayoutGrid size={100} strokeWidth={3} />
                <p className="font-black italic text-2xl text-center px-6">{t('home.groupMaker.waitingMsg')}</p>
              </div>
            )}
            {groups.length > 0 && (
              <button onClick={() => setGroups([])} className="pixar-btn clear-btn-pixar mt-6 w-full">
                <Trash2 size={20} className="inline mr-2" />
                {t('home.camera.clearAll') || 'Clear Results'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Group Details */}
      {selectedGroup && (
        <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedGroup(null)}>
              <X size={35} strokeWidth={4} />
            </button>
            <div className="modal-header">
              <h2 className="modal-title">{selectedGroup.name}</h2>
              <p className="modal-subtitle">{selectedGroup.members.length} {t('home.groupMaker.members')}</p>
            </div>
            <div className="modal-body">
              {selectedGroup.members.map((member, idx) => (
                <div key={idx} className="member-pill">
                  {member}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
