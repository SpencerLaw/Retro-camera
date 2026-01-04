import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
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
  angle: number;
}

const ClawSVG: React.FC<{ isGrabbing: boolean; pickedBallName: string | null; ballColor?: string }> = ({ isGrabbing, pickedBallName, ballColor }) => {
  const rotation = isGrabbing ? 8 : 32; // Tighter grab
  return (
    <div className="relative">
      <div className="claw-svg-wrapper">
        <svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="toyBody" cx="30%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="40%" stopColor="#FFB7C5" stopOpacity="1" />
              <stop offset="100%" stopColor="#FF85A1" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="toyJoint" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#4ECDC4" stopOpacity="1" />
            </radialGradient>
            <filter id="toyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
              <feOffset dx="0" dy="4" result="offsetblur"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          
          <g transform="translate(200, 180)" filter="url(#toyGlow)">
            {/* Main Joint Shell */}
            <circle cx="0" cy="0" r="48" fill="url(#toyBody)" stroke="white" strokeWidth="4"/>
            <circle cx="0" cy="0" r="28" fill="url(#toyJoint)"/>
            <circle cx="0" cy="0" r="15" fill="white" opacity="0.6"/>

            {/* Arms */}
            {[0, 120, 240].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <g transform={`rotate(${rotation})`}>
                   <g transform="translate(-15, 30)">
                      <path 
                        d="M0,0 Q-30,20 -25,80 Q-20,110 15,100 Q40,90 20,40 Z" 
                        fill="url(#toyBody)" 
                        stroke="white" 
                        strokeWidth="3"
                      />
                      {/* Rubber Grip Pad */}
                      <path d="M-10,85 Q0,95 10,85" fill="none" stroke="#FF6B6B" strokeWidth="6" strokeLinecap="round" opacity="0.8"/>
                   </g>
                </g>
              </g>
            ))}

            {/* Highlights */}
            <ellipse cx="-15" cy="-15" rx="10" ry="6" fill="white" opacity="0.4" transform="rotate(-45)"/>
          </g>
        </svg>
      </div>
      {pickedBallName && (
        <div className="alien-ball picked-ball-in-claw" style={{ background: ballColor || '#f1c40f' }}>
          {pickedBallName.slice(0, 4)}
        </div>
      )}
    </div>
  );
};

export const GroupMakerApp: React.FC = () => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [names, setNames] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [balls, setBalls] = useState<BallData[]>([]);
  const [currentPicking, setCurrentPicking] = useState<{name: string, color: string} | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [clawState, setClawState] = useState({ height: 40, isGrabbing: false, shake: 0 });
  const requestRef = useRef<number>();

  const studentCount = useMemo(() => {
    return names.split(/[ ,，、\s]+/).filter(n => n.trim() !== "").length;
  }, [names]);

  // Pastel / Cute Colors
  const colors = [
    '#FFB7C5', // Piggy Pink
    '#A4EBF3', // Sky Blue
    '#C1E1C1', // Pale Green
    '#FDFD96', // Pastel Yellow
    '#C3B1E1', // Lavender
    '#FF6961', // Salmon
    '#FFD1DC', // Pastel Pink
    '#B4E7CE'  // Mint
  ];

  useEffect(() => {
    const list = names.split(/[ ,，、\s]+/).filter(n => n.trim() !== "");
    if (!isAnimating) {
      setBalls(list.map((name, i) => ({
        name,
        x: Math.random() * 300 + 100,
        y: Math.random() * 200 + 200,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        color: colors[i % colors.length],
        isPicked: false,
        angle: Math.random() * 360
      })));
    }
  }, [names, isAnimating]);

  const animate = () => {
    setBalls(prev => prev.map(ball => {
      if (ball.isPicked) return ball;
      let nx = ball.x + ball.vx;
      let ny = ball.y + ball.vy;
      let nvx = ball.vx;
      let nvy = ball.vy;
      if (nx < 20 || nx > 450) nvx *= -0.95;
      if (ny < 50 || ny > 550) nvy *= -0.95;
      nvy -= 0.12; if (ny < 150) nvy += 0.35;
      return { ...ball, x: nx, y: ny, vx: nvx, vy: nvy, angle: ball.angle + nvx * 5 };
    }));
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isAnimating) requestRef.current = requestAnimationFrame(animate);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAnimating]);

  const handleStartGrouping = async () => {
    const list = names.split(/[ ,，、\s]+/).filter(n => n.trim() !== "");
    if (list.length < numGroups) {
      alert(t('home.groupMaker.errorLow'));
      return;
    }
    setIsAnimating(true);
    setGroups([]);
    setSelectedGroup(null);
    
    const shuffledNames = [...list].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `${t('home.groupMaker.groupNamePrefix')}${i + 1}${t('home.groupMaker.groupNameSuffix')}`,
      members: []
    }));

    for (let i = 0; i < shuffledNames.length; i++) {
      const name = shuffledNames[i];
      const color = colors[list.indexOf(name) % colors.length];
      
      // 1. Drop
      setClawState({ height: 400, isGrabbing: false, shake: 0 });
      await new Promise(r => setTimeout(r, 500));
      
      // 2. Grab
      setClawState({ height: 400, isGrabbing: true, shake: 5 });
      setCurrentPicking({ name, color });
      setBalls(prev => prev.map(b => b.name === name ? { ...b, isPicked: true } : b));
      await new Promise(r => setTimeout(r, 400));

      // 3. Lift
      setClawState({ height: 40, isGrabbing: true, shake: 0 });
      await new Promise(r => setTimeout(r, 600));

      // 4. Release at top
      setClawState({ height: 40, isGrabbing: false, shake: 0 });
      newGroups[i % numGroups].members.push(name);
      setGroups([...newGroups]);
      await new Promise(r => setTimeout(r, 200));
      
      setCurrentPicking(null);
      await new Promise(r => setTimeout(r, 100));
    }
    setIsAnimating(false);
  };

  return (
    <div className="group-maker-app">
      <div className="group-maker-container">
        {/* 1. Name List */}
        <div className="factory-panel left-panel">
          <div className="panel-header">📝 {t('home.groupMaker.inputTitle')} <span className="header-badge">{studentCount}</span></div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names} onChange={(e) => setNames(e.target.value)} disabled={isAnimating}
            />
            <div className="clear-btn-wrap">
              <button onClick={() => setNames("")} className="start-btn-arcade" style={{fontSize: '1.5rem', background: '#FF6961', padding: '10px'}}>{t('home.groupMaker.clearBtn')}</button>
            </div>
          </div>
        </div>

        {/* 2. Toy Claw Machine */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🎈 {t('home.groupMaker.actionTitle')}</div>
          <div className="machine-cabinet">
            <div className="claw-container" style={{ transform: `translateX(-50%) translateY(${clawState.shake}px)` }}>
              <div className="claw-cable" style={{ height: clawState.height }}></div>
              <ClawSVG isGrabbing={clawState.isGrabbing} pickedBallName={currentPicking?.name || null} ballColor={currentPicking?.color} />
            </div>
            {balls.map((ball, i) => !ball.isPicked && (
              <div key={i} className="alien-ball" style={{ background: ball.color, transform: `translate3d(${ball.x}px, ${ball.y}px, 0) rotate(${ball.angle}deg)` }}>{ball.name.slice(0, 3)}</div>
            ))}
          </div>
          <div className="machine-controls">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-4 border-white mb-2 shadow-sm">
              <span className="font-black text-gray-500 text-2xl">{t('home.groupMaker.groupCount')}</span>
              <input type="number" className="w-24 p-2 rounded-2xl text-center font-black text-pink-500 text-3xl outline-none bg-gray-50" value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)} disabled={isAnimating} />
            </div>
            <button className="start-btn-arcade" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>{isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}</button>
          </div>
        </div>

        {/* 3. Results */}
        <div className="factory-panel right-panel">
          <div className="panel-header">🎁 {t('home.groupMaker.results')}</div>
          <div className="delivery-station">
            <div className="results-scroll-area">
              <div className="groups-grid">
                {groups.map(group => (
                  <div key={group.id} className="group-tile" onClick={() => setSelectedGroup(group)}>
                    <div className="tile-icon">🐷</div>
                    <div className="tile-name">{group.name}</div>
                    <div className="tile-count">{group.members.length}</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedGroup && (
              <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-title">{selectedGroup.name}</div>
                    <button className="modal-close-btn" onClick={() => setSelectedGroup(null)}>✕</button>
                  </div>
                  
                  <div className="modal-body">
                    <div className="flex justify-between items-center mb-4 px-2">
                       <span className="text-xl text-pink-500 font-bold">小组成员</span>
                       <span className="bg-white text-pink-500 px-3 py-1 rounded-full text-sm border-2 border-pink-200 font-bold">{selectedGroup.members.length}人</span>
                    </div>
                    <div className="member-scroll-list">
                      {selectedGroup.members.map((member, idx) => (
                        <div key={idx} className="member-tile">{member}</div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-footer">
                     <button onClick={() => {
                        const text = `${selectedGroup.name}:\n${selectedGroup.members.join("\n")}`;
                        const blob = new Blob([text], {type: 'text/plain'});
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${selectedGroup.name}.txt`;
                        link.click();
                     }} className="start-btn-arcade" style={{fontSize: '1.2rem', padding: '12px 30px', background: '#4ECDC4'}}>导出本组名单</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => navigate('/')} className="home-back-btn"><ArrowLeft size={40} strokeWidth={5} /></button>
    </div>
  );
};
