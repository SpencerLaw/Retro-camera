import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, LayoutGrid, Trash2, ChevronLeft, Users } from 'lucide-react';
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
  const [clawState, setClawState] = useState({ height: 40, isGrabbing: false });
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // 计算实时人数
  const studentCount = useMemo(() => {
    return names.split(/[\n,，、\s]+/).filter(n => n.trim() !== "").length;
  }, [names]);

  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#fd79a8'];

  // 初始化气球
  useEffect(() => {
    const list = names.split(/[\n,，、\s]+/).filter(n => n.trim() !== "");
    if (!isAnimating) {
      setBalls(list.map((name, i) => ({
        name,
        x: Math.random() * 200 + 30,
        y: Math.random() * 150 + 100,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: colors[i % colors.length],
        isPicked: false
      })));
    }
  }, [names, isAnimating]);

  // 高性能动画帧
  const animate = (time: number) => {
    setBalls(prev => prev.map(ball => {
      if (ball.isPicked) return ball;
      
      let nx = ball.x + ball.vx;
      let ny = ball.y + ball.vy;
      let nvx = ball.vx;
      let nvy = ball.vy;

      // 边缘碰撞逻辑
      if (nx < 10 || nx > 240) nvx *= -0.9;
      if (ny < 30 || ny > 280) nvy *= -0.9;
      
      // 漂浮阻力
      nvy -= 0.04; 
      if (ny < 60) nvy += 0.12;

      return { ...ball, x: nx, y: ny, vx: nvx, vy: nvy };
    }));
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isAnimating) requestRef.current = requestAnimationFrame(animate);
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
    setSelectedGroup(null);
    
    const shuffledNames = [...list].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `${t('home.groupMaker.groupNamePrefix')}${i + 1}${t('home.groupMaker.groupNameSuffix')}`,
      members: []
    }));

    for (let i = 0; i < shuffledNames.length; i++) {
      const name = shuffledNames[i];
      const gid = i % numGroups;

      setClawState({ height: 260, isGrabbing: false });
      await new Promise(r => setTimeout(r, 400));
      
      setClawState({ height: 260, isGrabbing: true });
      setCurrentPickingName(name);
      setBalls(prev => prev.map(b => b.name === name ? { ...b, isPicked: true } : b));
      await new Promise(r => setTimeout(r, 300));

      setClawState({ height: 40, isGrabbing: true });
      await new Promise(r => setTimeout(r, 400));

      newGroups[gid].members.push(name);
      setGroups([...newGroups]);
      setCurrentPickingName(null);
      setClawState({ height: 40, isGrabbing: false });
      await new Promise(r => setTimeout(r, 50));
    }
    setIsAnimating(false);
  };

  return (
    <div className="group-maker-app">
      <button onClick={() => navigate('/')} className="fixed top-8 left-8 z-[100] p-4 rounded-full bg-white border-4 border-blue-400 text-blue-500 shadow-xl hover:scale-110 transition-all">
        <ArrowLeft size={28} strokeWidth={3} />
      </button>

      <div className="group-maker-container">
        {/* 左：名单输入 */}
        <div className="factory-panel left-panel">
          <div className="panel-header">
            📝 {t('home.groupMaker.inputTitle')}
            <span className="header-badge">{studentCount}人</span>
          </div>
          <div className="input-content">
            <textarea 
              placeholder={t('home.groupMaker.inputPlaceholder')}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <button onClick={() => setNames("")} className="start-btn" style={{ fontSize: '1rem', padding: '10px' }}>
               {t('home.groupMaker.clearBtn')}
            </button>
          </div>
        </div>

        {/* 中：动画区 */}
        <div className="factory-panel middle-panel">
          <div className="panel-header">🕹️ {t('home.groupMaker.actionTitle')}</div>
          <div className="machine-cabinet">
            <div className={`claw-container ${clawState.isGrabbing ? 'grabbing' : ''}`}>
              <div className="claw-cable" style={{ height: clawState.height }}></div>
              <div className="claw-head">
                <div className="claw-finger left"></div>
                <div className="claw-finger right"></div>
                {currentPickingName && (
                  <div className="alien-ball" style={{ position: 'absolute', bottom: '-45px', left: '-5px', background: '#f1c40f', width: '60px', height: '60px' }}>
                    {currentPickingName.slice(0, 4)}
                  </div>
                )}
              </div>
            </div>

            {balls.map((ball, i) => !ball.isPicked && (
              <div key={i} className="alien-ball" style={{ 
                background: ball.color,
                transform: `translate3d(${ball.x}px, ${ball.y}px, 0)` 
              }}>
                {ball.name.slice(0, 2)}
              </div>
            ))}
          </div>
          
          <div className="machine-controls">
            <div className="flex justify-between items-center bg-white/20 p-3 rounded-2xl">
              <span className="font-bold text-white">{t('home.groupMaker.groupCount')}</span>
              <input 
                type="number" className="w-16 p-1 rounded-lg text-center font-bold text-blue-800"
                value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
            </div>
            <button className="start-btn" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>
              {isAnimating ? t('home.groupMaker.runningBtn') : t('home.groupMaker.startBtn')}
            </button>
          </div>
        </div>

        {/* 右：固定布局结果/详情 */}
        <div className="factory-panel right-panel">
          <div className="panel-header">📦 {t('home.groupMaker.results')}</div>
          <div className="delivery-station">
            {/* 概览网格 */}
            <div className="results-scroll-area">
              {groups.length > 0 ? (
                <div className="groups-grid">
                  {groups.map(group => (
                    <div key={group.id} className="group-pod" onClick={() => setSelectedGroup(group)}>
                      <div className="pod-badge">{group.members.length}</div>
                      <span style={{fontSize: '2rem'}}>📦</span>
                      <div className="card-name">{group.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                  <LayoutGrid size={80} strokeWidth={2} />
                  <p className="font-bold text-center px-4">{t('home.groupMaker.waitingMsg')}</p>
                </div>
              )}
            </div>

            {/* 固定详情视图 (采用绝对定位覆盖在 station 之上) */}
            {selectedGroup && (
              <div className="detail-view">
                <div className="detail-header">
                  <button className="back-btn" onClick={() => setSelectedGroup(null)}>
                    <ChevronLeft size={20} />返回
                  </button>
                  <span className="font-black text-green-700">{selectedGroup.name}</span>
                  <span className="text-sm font-bold bg-green-100 px-2 py-1 rounded-lg">{selectedGroup.members.length}人</span>
                </div>
                <div className="member-list-fixed">
                  {selectedGroup.members.map((member, idx) => (
                    <div key={idx} className="member-card">{member}</div>
                  ))}
                </div>
                <div className="detail-footer">
                   <button onClick={() => {
                      const text = `${selectedGroup.name}:\n${selectedGroup.members.join("\n")}`;
                      const blob = new Blob([text], {type: 'text/plain'});
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `${selectedGroup.name}.txt`;
                      link.click();
                   }} className="w-full p-3 bg-blue-500 text-white rounded-2xl font-black shadow-lg">导出 TXT</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};