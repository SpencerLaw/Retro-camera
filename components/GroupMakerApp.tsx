import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, LayoutGrid, X, Trash2 } from 'lucide-react';
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
  rotation: number;
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
  const [clawState, setClawState] = useState<{height: number, isGrabbing: boolean}>({ height: 40, isGrabbing: false });
  
  const requestRef = useRef<number>();

  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'];

  // Init balloon balls
  useEffect(() => {
    const list = names.split(/[\n,，、\s]+/).filter(n => n.trim() !== "");
    if (!isAnimating) {
      setBalls(list.map((name, i) => ({
        name,
        x: Math.random() * 240 + 20,
        y: Math.random() * 200 + 100,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: colors[i % colors.length],
        isPicked: false,
        rotation: (Math.random() - 0.5) * 20
      })));
    }
  }, [names, isAnimating]);

  // Balloon bounce animation
  const animateBalls = () => {
    setBalls(prev => prev.map(ball => {
      if (ball.isPicked) return ball;
      let newX = ball.x + ball.vx;
      let newY = ball.y + ball.vy;
      let newVx = ball.vx;
      let newVy = ball.vy;

      // Bounce off walls with balloon feel
      if (newX < 10 || newX > 280) newVx *= -0.9;
      if (newY < 20 || newY > 320) newVy *= -0.9;
      
      // Floating effect
      newVy -= 0.05; // Gravity/Upward float
      if (newY < 30) newVy += 0.2; // Ceiling bounce

      return { 
        ...ball, 
        x: newX, 
        y: newY, 
        vx: newVx, 
        vy: newVy,
        rotation: ball.rotation + ball.vx * 0.5
      };
    }));
    requestRef.current = requestAnimationFrame(animateBalls);
  };

  useEffect(() => {
    if (isAnimating) requestRef.current = requestAnimationFrame(animateBalls);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAnimating]);

  const handleStartGrouping = async () => {
    const list = names.split(/[\n,，、\s]+/).filter(n => n.trim() !== "");
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

    // Start grouping sequence
    for (let i = 0; i < shuffledBalls.length; i++) {
      const target = shuffledBalls[i];
      const gid = i % numGroups;

      // 1. Drop claw
      setClawState({ height: 280, isGrabbing: false });
      await new Promise(r => setTimeout(r, 400));
      
      // 2. Grab
      setClawState({ height: 280, isGrabbing: true });
      setCurrentPickingName(target.name);
      setBalls(prev => prev.map(b => b.name === target.name ? { ...b, isPicked: true } : b));
      await new Promise(r => setTimeout(r, 300));

      // 3. Lift claw
      setClawState({ height: 40, isGrabbing: true });
      await new Promise(r => setTimeout(r, 400));

      // 4. Deliver
      newGroups[gid].members.push(target.name);
      setGroups([...newGroups]);
      setCurrentPickingName(null);
      setClawState({ height: 40, isGrabbing: false });
      await new Promise(r => setTimeout(r, 100));
    }
    setIsAnimating(false);
  };

  return (
    <div className="group-maker-app">
      <button onClick={() => navigate('/')} className="fixed top-8 left-8 z-[1001] p-5 rounded-full bg-white border-8 border-orange-500 text-orange-600 shadow-2xl hover:scale-110 active:scale-90 transition-all">
        <ArrowLeft size={35} strokeWidth={4} />
      </button>

      <div className="group-maker-container">
        {/* Panel 1: Registry */}
        <div className="factory-panel left-panel">
          <div className="panel-header">📝 {t('home.groupMaker.inputTitle')}</div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <button onClick={() => setNames("")} className="start-btn" style={{ fontSize: '1.2rem', padding: '15px', background: '#e67e22', boxShadow: '0 6px 0 #d35400' }}>
              <Trash2 size={20} className="inline mr-2" />
              {t('home.groupMaker.clearBtn')}
            </button>
          </div>
        </div>

        {/* Panel 2: Arcade Machine */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🕹️ {t('home.groupMaker.actionTitle')}</div>
          <div className="machine-cabinet">
            {/* The Claw */}
            <div className={`claw-container ${clawState.isGrabbing ? 'grabbing' : ''}`} style={{ top: 0 }}>
              <div className="claw-cable" style={{ height: clawState.height }}></div>
              <div className="claw-head">
                <div className="claw-hand">
                  <div className="claw-finger left"></div>
                  <div className="claw-finger right"></div>
                </div>
                {currentPickingName && (
                  <div className="alien-ball picked-ball" style={{ background: '#f1c40f', border: '4px solid #fff' }}>
                    {currentPickingName.slice(0, 4)}
                  </div>
                )}
              </div>
            </div>

            {/* Balloon Balls */}
            {balls.map((ball, i) => !ball.isPicked && (
              <div key={i} className="alien-ball" style={{ 
                left: ball.x, 
                top: ball.y, 
                background: ball.color,
                transform: `rotate(${ball.rotation}deg)` 
              }}>
                {ball.name.slice(0, 3)}
              </div>
            ))}
          </div>
          
          <div className="machine-controls">
            <div className="control-item">
              <span className="font-black text-white text-xl">{t('home.groupMaker.groupCount')}</span>
              <input 
                type="number" className="w-24 p-2 rounded-2xl border-none text-center font-black text-blue-600 text-2xl outline-none"
                value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
            </div>
            <button className="start-btn" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>
              {isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}
            </button>
          </div>
        </div>

        {/* Panel 3: Results */}
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
              }} className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white">
                <Download size={24} strokeWidth={3} />
              </button>
            )}
          </div>
          <div className="results-content">
            {groups.length > 0 ? (
              <div className="groups-grid">
                {groups.map(group => (
                  <div key={group.id} className="group-card" onClick={() => setSelectedGroup(group)}>
                    <div className="group-badge">{group.members.length}</div>
                    <div className="group-icon">🎒</div>
                    <div className="group-name">{group.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <LayoutGrid size={100} strokeWidth={3} />
                <p className="font-black italic text-2xl text-center px-6">{t('home.groupMaker.waitingMsg')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedGroup && (
        <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGroup(null)}>
              <X size={35} strokeWidth={4} />
            </button>
            <div className="text-center mb-8">
              <h2 className="text-5xl font-black text-orange-600 mb-2">{selectedGroup.name}</h2>
              <p className="text-2xl font-bold text-gray-500">{selectedGroup.members.length} {t('home.groupMaker.members')}</p>
            </div>
            <div className="flex flex-wrap justify-center bg-orange-50 p-6 rounded-[40px] border-4 border-dashed border-orange-200">
              {selectedGroup.members.map((member, idx) => (
                <div key={idx} className="member-tag">
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