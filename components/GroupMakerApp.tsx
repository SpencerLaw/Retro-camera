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
  const rotation = isGrabbing ? 10 : 35;
  return (
    <div className="relative">
      <div className="claw-svg-wrapper">
        <svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="plasticBody" cx="30%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="60%" stopColor="#e6efff" stopOpacity="1" />
              <stop offset="100%" stopColor="#b0c4de" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a2f5ff" stopOpacity="1" />
              <stop offset="60%" stopColor="#40c4ff" stopOpacity="1" />
              <stop offset="100%" stopColor="#0091ea" stopOpacity="1" />
            </radialGradient>
            <linearGradient id="softPad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffcc80" stopOpacity="1" />
              <stop offset="100%" stopColor="#ff9800" stopOpacity="1" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
              <feOffset dx="0" dy="5" result="offsetblur"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <g transform="translate(200, 180)" filter="url(#softShadow)">
            <path d="M-10,-180 Q-15,-140 -10,-100 Q-15,-60 -10,-20 L10,-20 Q15,-60 10,-100 Q15,-140 10,-180" fill="none" stroke="#78909c" strokeWidth="8" strokeLinecap="round"/>
            <g transform="translate(0, -20) scale(0.8)"><path d="M-20,0 Q-30,40 0,70 Q30,40 20,0 Z" fill="url(#plasticBody)"/></g>
            <circle cx="0" cy="0" r="50" fill="url(#plasticBody)"/>
            <circle cx="0" cy="0" r="30" fill="#29b6f6"/>
            <circle cx="0" cy="0" r="24" fill="url(#glowBlue)"/>
            <ellipse cx="-10" cy="-10" rx="6" ry="4" fill="white" opacity="0.8" transform="rotate(-45)"/>
            <g transform={`rotate(${rotation})`}>
                <g transform="translate(-45, 20) rotate(15)">
                    <path d="M-10,-20 C-40,-10 -50,50 -20,80 C0,90 20,80 30,50 C40,20 20,-30 -10,-20 Z" fill="url(#plasticBody)"/>
                    <ellipse cx="-15" cy="65" rx="10" ry="14" fill="url(#softPad)" transform="rotate(-10)"/>
                    <path d="M-15,10 Q-30,30 -20,60" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
                </g>
            </g>
            <g transform={`scale(-1, 1) rotate(${rotation})`}>
                <g transform="translate(-45, 20) rotate(15)">
                    <path d="M-10,-20 C-40,-10 -50,50 -20,80 C0,90 20,80 30,50 C40,20 20,-30 -10,-20 Z" fill="url(#plasticBody)"/>
                    <ellipse cx="-15" cy="65" rx="10" ry="14" fill="url(#softPad)" transform="rotate(-10)"/>
                    <path d="M-15,10 Q-30,30 -20,60" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
                </g>
            </g>
            <path d="M-30,-30 Q-10,-50 20,-40" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.7"/>
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
    return names.split(/[
,，、\s]+/).filter(n => n.trim() !== "").length;
  }, [names]);

  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'];

  useEffect(() => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
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
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
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
      
      // 1. 下降 (Open claw)
      setClawState({ height: 400, isGrabbing: false, shake: 0 });
      await new Promise(r => setTimeout(r, 500));
      
      // 2. 闭合抓取
      setClawState({ height: 400, isGrabbing: true, shake: 5 });
      setCurrentPicking({ name, color });
      setBalls(prev => prev.map(b => b.name === name ? { ...b, isPicked: true } : b));
      await new Promise(r => setTimeout(r, 400));

      // 3. 提起
      setClawState({ height: 40, isGrabbing: true, shake: 0 });
      await new Promise(r => setTimeout(r, 600));

      // 4. 到顶释放
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
        {/* 1. 名单墙 */}
        <div className="factory-panel left-panel">
          <div className="panel-header">📝 {t('home.groupMaker.inputTitle')} <span className="header-badge">{studentCount}人</span></div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names} onChange={(e) => setNames(e.target.value)} disabled={isAnimating}
            />
            <div className="clear-btn-wrap">
              <button onClick={() => setNames("")} className="start-btn-arcade" style={{fontSize: '2rem'}}>{t('home.groupMaker.clearBtn')}</button>
            </div>
          </div>
        </div>

        {/* 2. 街机核心 (物理抓取动画) */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🕹️ {t('home.groupMaker.actionTitle')}</div>
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
            <div className="flex justify-between items-center bg-white/10 p-6 rounded-3xl border-4 border-white/20 mb-6">
              <span className="font-black text-white text-3xl">{t('home.groupMaker.groupCount')}</span>
              <input type="number" className="w-32 p-3 rounded-2xl text-center font-black text-blue-900 text-4xl outline-none" value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)} disabled={isAnimating} />
            </div>
            <button className="start-btn-arcade" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>{isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}</button>
          </div>
        </div>

        {/* 3. 结果展示墙 (物理填充且内部滚动) */}
        <div className="factory-panel right-panel">
          <div className="panel-header">📦 {t('home.groupMaker.results')}</div>
          <div className="delivery-station">
            <div className="results-scroll-area">
              <div className="groups-grid">
                {groups.map(group => (
                  <div key={group.id} className="group-tile" onClick={() => setSelectedGroup(group)}>
                    <div className="tile-icon">🗳️</div>
                    <div className="tile-name">{group.name}</div>
                    <div className="tile-count">{group.members.length}人</div>
                  </div>
                ))}
              </div>
            </div>
            {selectedGroup && (
              <div className="fixed-detail-view">
                <div className="detail-nav">
                  <button className="arcade-back-btn" onClick={() => setSelectedGroup(null)}><ChevronLeft size={45} strokeWidth={4} /> 返回</button>
                  <div className="text-right">
                    <span className="font-black text-5xl block">{selectedGroup.name}</span>
                    <span className="text-2xl font-bold bg-white/20 px-6 py-2 rounded-full">{selectedGroup.members.length}人</span>
                  </div>
                </div>
                <div className="member-scroll-list">
                  {selectedGroup.members.map((member, idx) => (
                    <div key={idx} className="member-tile">{member}</div>
                  ))}
                </div>
                <div className="detail-actions">
                   <button onClick={() => {
                      const text = `${selectedGroup.name}:\n${selectedGroup.members.join("\n")}`;
                      const blob = new Blob([text], {type: 'text/plain'});
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `${selectedGroup.name}.txt`;
                      link.click();
                   }} className="start-btn-arcade" style={{fontSize: '2.5rem'}}>导出本组名单</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => navigate('/')} className="home-back-btn shadow-2xl hover:scale-110 active:scale-90 transition-all"><ArrowLeft size={55} strokeWidth={5} /></button>
    </div>
  );
};
