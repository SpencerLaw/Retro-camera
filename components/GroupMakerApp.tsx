import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Download, Play, Trash2 } from 'lucide-react';
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
  
  const clawArmRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  // Colors for balls
  const colors = [
    '#FF6B6B', '#48DBFB', '#1DD1A1', '#FECA57', '#5F27CD', 
    '#FF9FF3', '#00D2D3', '#54A0FF', '#576574', '#EE5253'
  ];

  // Initialize balls
  useEffect(() => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (list.length > 0 && !isAnimating) {
      const newBalls = list.map((name, i) => ({
        name,
        x: Math.random() * 300 + 30,
        y: Math.random() * 200 + 30,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        color: colors[i % colors.length],
        isPicked: false
      }));
      setBalls(newBalls);
    } else if (list.length === 0) {
      setBalls([]);
    }
  }, [names, isAnimating]);

  // Physics loop
  const animateBalls = () => {
    setBalls(prevBalls => {
      return prevBalls.map(ball => {
        if (ball.isPicked) return ball;

        let newX = ball.x + ball.vx;
        let newY = ball.y + ball.vy;

        // Wall collisions
        if (newX < 5 || newX > 360) ball.vx *= -1;
        if (newY < 5 || newY > 350) ball.vy *= -1;

        return { ...ball, x: newX, y: newY };
      });
    });
    requestRef.current = requestAnimationFrame(animateBalls);
  };

  useEffect(() => {
    if (isAnimating) {
      requestRef.current = requestAnimationFrame(animateBalls);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
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
    
    // Shuffle and Prepare
    const shuffled = [...balls].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `${t('home.groupMaker.groupNamePrefix')} ${i + 1} ${t('home.groupMaker.groupNameSuffix')}`,
      members: []
    }));

    // Start high speed rolling
    setBalls(prev => prev.map(b => ({
      ...b,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20
    })));

    for (let i = 0; i < shuffled.length; i++) {
      const targetBall = shuffled[i];
      const targetGroupId = i % numGroups;

      // Animation: Claw Drop
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '280px';
        await new Promise(r => setTimeout(r, 400));
      }

      // Action: Pick Ball
      setCurrentPickingName(targetBall.name);
      setBalls(prev => prev.map(b => b.name === targetBall.name ? { ...b, isPicked: true } : b));

      // Animation: Claw Rise
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '40px';
        await new Promise(r => setTimeout(r, 300));
      }

      // Update State
      newGroups[targetGroupId].members.push(targetBall.name);
      setGroups([...newGroups]);
      setCurrentPickingName(null);

      await new Promise(r => setTimeout(r, 150));
    }

    setIsAnimating(false);
  };

  const handleExport = () => {
    let text = `--- ${t('home.groupMaker.results')} ---\n\n`;
    groups.forEach(g => {
      text += `${g.name}: ${g.members.join(", ")}\n`;
    });
    const blob = new Blob([text], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "group_results.txt";
    link.click();
  };

  return (
    <div className="group-maker-app">
      <button 
        onClick={() => navigate('/')} 
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white border-4 border-pink-400 text-pink-500 shadow-xl hover:scale-110 transition-all"
      >
        <ArrowLeft size={28} strokeWidth={3} />
      </button>

      <div className="group-maker-container">
        {/* Left: Input & Machine */}
        <div className="left-panel">
          <h1 className="group-maker-title">{t('home.groupMaker.title')}</h1>
          
          <div className="input-section">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-yellow-800 flex items-center gap-2">
                <Users size={18} /> {t('home.groupMaker.results')}
              </span>
              <button 
                onClick={() => setNames("")} 
                className="text-xs font-bold px-3 py-1 bg-red-400 text-white rounded-full hover:bg-red-500"
              >
                {t('home.groupMaker.clearBtn')}
              </button>
            </div>
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <div className="flex flex-col gap-3 mt-3">
              <div className="flex items-center justify-center gap-3">
                <span className="font-bold text-yellow-900">{t('home.groupMaker.groupCount')}</span>
                <input 
                  type="number" className="w-16 p-2 rounded-xl border-3 border-yellow-400 text-center font-bold"
                  value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                  disabled={isAnimating}
                />
              </div>
              <button 
                className="start-btn" 
                onClick={handleStartGrouping} 
                disabled={isAnimating || !names.trim()}
              >
                {isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}
              </button>
            </div>
          </div>

          <div className="ball-pit">
            <div className="claw-arm" ref={clawArmRef}>
              {currentPickingName && (
                <div 
                  className="alien-ball" 
                  style={{ 
                    position: 'absolute', bottom: '-55px', left: '-18px',
                    backgroundColor: colors[Math.floor(Math.random() * colors.length)]
                  }}
                >
                  {currentPickingName.slice(0, 4)}
                </div>
              )}
            </div>
            {balls.map((ball, i) => (
              !ball.isPicked && (
                <div 
                  key={i}
                  className="alien-ball"
                  style={{
                    left: `${ball.x}px`,
                    top: `${ball.y}px`,
                    backgroundColor: ball.color
                  }}
                >
                  {ball.name.slice(0, 2)}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Right: Results */}
        <div className="right-panel">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-800">{t('home.groupMaker.results')} ✨</h2>
            {groups.length > 0 && (
              <button 
                onClick={handleExport} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full font-bold shadow-md hover:bg-blue-600 transition-all text-sm"
              >
                <Download size={16} /> {t('home.groupMaker.exportBtn')}
              </button>
            )}
          </div>
          <div className="groups-scroll-area">
            {groups.length > 0 ? (
              <div className="groups-display">
                {groups.map(group => (
                  <div key={group.id} className="group-bucket">
                    <h3>{group.name}</h3>
                    <div className="flex flex-wrap justify-center">
                      {group.members.map((m, idx) => (
                        <span key={idx} className="member-tag">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-green-600/40 gap-4">
                <Play size={80} strokeWidth={3} className="opacity-20" />
                <p className="font-bold italic text-xl">{t('home.groupMaker.waitingMsg')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};