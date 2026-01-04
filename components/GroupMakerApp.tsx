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
  const cabinetRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<BallData[]>([]); 
  const [names, setNames] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [balls, setBalls] = useState<BallData[]>([]);
  const [currentPicking, setCurrentPicking] = useState<{name: string, color: string} | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [clawState, setClawState] = useState({ height: 40, x: 50, isGrabbing: false, shake: 0 });
  const requestRef = useRef<number>();

  const studentCount = useMemo(() => {
    return names.split(/[ ,，、\s]+/).filter(n => n.trim() !== "").length;
  }, [names]);

  const colors = ['#FFB7C5', '#A4EBF3', '#C1E1C1', '#FDFD96', '#C3B1E1', '#FF6961', '#FFD1DC', '#B4E7CE'];

  // Initialize balls
  useEffect(() => {
    if (!isAnimating) {
      const list = names.split(/[ ,，、\s]+/).filter(n => n.trim() !== "");
      const width = cabinetRef.current?.clientWidth || window.innerWidth * 0.6;
      const height = cabinetRef.current?.clientHeight || 600;
      
      const newBalls = list.map((name, i) => ({
        name,
        x: Math.random() * (width - 150) + 75,
        y: height - 120 - (Math.random() * 50),
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: colors[i % colors.length],
        isPicked: false,
        angle: Math.random() * 360
      }));
      setBalls(newBalls);
      ballsRef.current = newBalls;
    }
  }, [names, isAnimating]);

  const animate = () => {
    if (!cabinetRef.current) return;
    const width = cabinetRef.current.clientWidth;
    const height = cabinetRef.current.clientHeight;

    const nextBalls = ballsRef.current.map(ball => {
      if (ball.isPicked) return ball;
      let nx = ball.x + ball.vx;
      let ny = ball.y + ball.vy;
      let nvx = ball.vx;
      let nvy = ball.vy;

      if (nx < 60) { nx = 60; nvx = Math.abs(nvx) * 0.8; }
      else if (nx > width - 60) { nx = width - 60; nvx = -Math.abs(nvx) * 0.8; }
      
      if (ny < 60) { ny = 60; nvy = Math.abs(nvy) * 0.8; }
      else if (ny > height - 100) { ny = height - 100; nvy = -Math.abs(nvy) * 0.8; }

      nvy += 0.15;
      return { ...ball, x: nx, y: ny, vx: nvx, vy: nvy, angle: ball.angle + nvx * 2 };
    });

    ballsRef.current = nextBalls;
    setBalls(nextBalls);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isAnimating) requestRef.current = requestAnimationFrame(animate);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isAnimating]);

  const handleDownloadAll = () => {
    if (groups.length === 0) return;
    const textContent = groups.map(g => `${g.name} (${g.members.length}人):\n${g.members.join(', ')}`).join('\n\n');
    const blob = new Blob([textContent], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `分组结果_${new Date().toLocaleTimeString()}.txt`;
    link.click();
  };

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
      
      const targetBall = ballsRef.current.find(b => b.name === name);
      const cabinetWidth = cabinetRef.current?.clientWidth || 800;
      const targetXPercent = targetBall ? (targetBall.x / cabinetWidth) * 100 : 50;
      const targetHeight = targetBall ? targetBall.y - 110 : 450;

      // 1. Move claw horizontally
      setClawState(prev => ({ ...prev, x: targetXPercent, height: 40, isGrabbing: false }));
      await new Promise(r => setTimeout(r, 800));

      // 2. Drop Claw
      setClawState(prev => ({ ...prev, height: targetHeight, isGrabbing: false }));
      await new Promise(r => setTimeout(r, 600));
      
      // 3. Grab Action
      setClawState(prev => ({ ...prev, isGrabbing: true, shake: 5 }));
      setCurrentPicking({ name, color });
      ballsRef.current = ballsRef.current.map(b => b.name === name ? { ...b, isPicked: true } : b);
      setBalls([...ballsRef.current]);
      await new Promise(r => setTimeout(r, 500));

      // 4. Lift & Center
      setClawState(prev => ({ ...prev, height: 40, x: 50, shake: 2 }));
      await new Promise(r => setTimeout(r, 1000));

      // 5. Release
      setClawState(prev => ({ ...prev, isGrabbing: false, shake: 0 }));
      newGroups[i % numGroups].members.push(name);
      setGroups([...newGroups]);
      await new Promise(r => setTimeout(r, 300));
      
      setCurrentPicking(null);
      await new Promise(r => setTimeout(r, 300));
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
              <button onClick={() => setNames("")} className="start-btn-arcade" style={{fontSize: '1.2rem', padding: '8px 20px', background: '#FF6961'}}>{t('home.groupMaker.clearBtn')}</button>
            </div>
          </div>
        </div>

        {/* 2. Toy Claw Machine */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🎈 {t('home.groupMaker.actionTitle')}</div>
          <div className="machine-cabinet" ref={cabinetRef}>
            <div className="claw-container" style={{ left: `${clawState.x}%`, transform: `translateX(-50%) translateY(${clawState.shake}px)`, transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s ease-in' }}>
              <div className="claw-cable" style={{ height: clawState.height }}></div>
              <ClawSVG isGrabbing={clawState.isGrabbing} pickedBallName={currentPicking?.name || null} ballColor={currentPicking?.color} />
            </div>
            {balls.map((ball) => !ball.isPicked && (
              <div key={ball.name} className="alien-ball" style={{ background: ball.color, transform: `translate3d(${ball.x}px, ${ball.y}px, 0) rotate(${ball.angle}deg)` }}>{ball.name.slice(0, 3)}</div>
            ))}
          </div>
          <div className="machine-controls">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border-4 border-white shadow-sm flex-1">
              <span className="font-black text-gray-500 text-xl">{t('home.groupMaker.groupCount')}</span>
              <input type="number" className="w-20 p-1 rounded-xl text-center font-black text-pink-500 text-2xl outline-none bg-gray-50" value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)} disabled={isAnimating} />
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
            {groups.length > 0 && (
              <div className="p-4 bg-white border-t-4 border-yellow-200">
                <button onClick={handleDownloadAll} className="w-full py-3 bg-yellow-400 text-white rounded-xl font-black text-xl shadow-md hover:bg-yellow-500 active:translate-y-1 transition-all">
                  📥 下载全部
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal moved outside the grid container to ensure it sits on top of everything */}
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

      <button onClick={() => navigate('/')} className="home-back-btn"><ArrowLeft size={40} strokeWidth={5} /></button>
    </div>
  );
};
