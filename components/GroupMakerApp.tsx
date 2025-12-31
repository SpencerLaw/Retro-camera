import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, RefreshCcw, Download, Play, Trash2 } from 'lucide-react';
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
  isPicked: boolean;
}

export const GroupMakerApp: React.FC = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [balls, setBalls] = useState<BallData[]>([]);
  const [currentPickingName, setCurrentPickingName] = useState<string | null>(null);
  
  const clawArmRef = useRef<HTMLDivElement>(null);
  const ballPitRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  // Initialize balls when names change or manually reset
  useEffect(() => {
    const list = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (list.length > 0 && !isAnimating) {
      const newBalls = list.map(name => ({
        name,
        x: Math.random() * 300 + 50,
        y: Math.random() * 200 + 50,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        isPicked: false
      }));
      setBalls(newBalls);
    }
  }, [names, isAnimating]);

  // Ball Physics Animation
  const animateBalls = () => {
    setBalls(prevBalls => {
      return prevBalls.map(ball => {
        if (ball.isPicked) return ball;

        let newX = ball.x + ball.vx;
        let newY = ball.y + ball.vy;

        // Bounce off walls
        if (newX < 0 || newX > 380) ball.vx *= -1;
        if (newY < 0 || newY > 350) ball.vy *= -1;

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
      alert("人數不足！");
      return;
    }

    setIsAnimating(true);
    setGroups([]);
    
    // Reset all balls to pit
    const resetBalls = balls.map(b => ({
      ...b,
      isPicked: false,
      vx: (Math.random() - 0.5) * 15, // Increase speed
      vy: (Math.random() - 0.5) * 15
    }));
    setBalls(resetBalls);

    const shuffled = [...resetBalls].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `第 ${i + 1} 組`,
      members: []
    }));

    for (let i = 0; i < shuffled.length; i++) {
      const targetBall = shuffled[i];
      const targetGroupId = i % numGroups;

      // 1. Move claw down
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '250px';
        await new Promise(r => setTimeout(r, 400));
      }

      // 2. Pick the ball
      setCurrentPickingName(targetBall.name);
      setBalls(prev => prev.map(b => b.name === targetBall.name ? { ...b, isPicked: true } : b));

      // 3. Move claw up
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '40px';
        await new Promise(r => setTimeout(r, 300));
      }

      // 4. Add to group
      newGroups[targetGroupId].members.push(targetBall.name);
      setGroups([...newGroups]);
      setCurrentPickingName(null);

      await new Promise(r => setTimeout(r, 100));
    }

    setIsAnimating(false);
  };

  return (
    <div className="group-maker-app">
      <button onClick={() => navigate('/')} className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white border-3 border-blue-500 text-blue-500 shadow-xl">
        <ArrowLeft size={24} />
      </button>

      <div className="group-maker-container">
        {/* Left: Ball Pit and Controls */}
        <div className="left-panel">
          <h1 className="group-maker-title">三眼怪抽獎分組機</h1>
          
          <div className="input-section">
            <textarea 
              placeholder="輸入名單（換行或逗號隔開）..."
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <div className="flex gap-4 items-center justify-center">
              <label className="font-bold">組數:</label>
              <input 
                type="number" className="num-input" 
                value={numGroups} onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
              <button className="start-btn" onClick={handleStartGrouping} disabled={isAnimating || !names.trim()}>
                {isAnimating ? "正在抓取..." : "開始抽獎！"}
              </button>
            </div>
          </div>

          <div className="ball-pit" ref={ballPitRef}>
            <div className="claw-arm" ref={clawArmRef}>
              {currentPickingName && (
                <div className="alien-ball" style={{ position: 'absolute', bottom: '-45px', left: '-20px' }}>
                  {currentPickingName.slice(0, 4)}
                </div>
              )}
            </div>
            {balls.map((ball, i) => (
              !ball.isPicked && (
                <div 
                  key={i}
                  className={`alien-ball ${isAnimating ? 'ball-rolling' : ''}`}
                  style={{
                    left: `${ball.x}px`,
                    top: `${ball.y}px`,
                    backgroundColor: `hsl(${(i * 45) % 360}, 70%, 60%)`
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
          <h2 className="text-2xl font-bold text-blue-600 mb-4 text-center">分組結果</h2>
          <div className="groups-scroll-area">
            <div className="groups-display">
              {groups.map(group => (
                <div key={group.id} className="group-bucket">
                  <h3>{group.name}</h3>
                  <div className="flex flex-wrap">
                    {group.members.map((m, idx) => (
                      <span key={idx} className="member-tag">{m}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
