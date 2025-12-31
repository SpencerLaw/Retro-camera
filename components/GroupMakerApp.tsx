import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, RefreshCcw, Download, Play, Trash2 } from 'lucide-react';
import './GroupMakerStyles.css';

interface Group {
  id: number;
  name: string;
  members: string[];
}

export const GroupMakerApp: React.FC = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(2);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPickingName, setCurrentPickingName] = useState<string | null>(null);
  const clawArmRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleStartGrouping = async () => {
    const studentList = names.split(/[
,，、\s]+/).filter(n => n.trim() !== "");
    if (studentList.length < numGroups) {
      alert("學生人數不能少於組數！Students must be more than groups!");
      return;
    }

    setIsAnimating(true);
    setGroups([]);
    
    const shuffled = [...studentList].sort(() => Math.random() - 0.5);
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `第 ${i + 1} 組`,
      members: []
    }));

    for (let i = 0; i < shuffled.length; i++) {
      const student = shuffled[i];
      const targetGroupId = i % numGroups;
      setCurrentPickingName(student);
      
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '80px';
        await new Promise(r => setTimeout(r, 200));
        clawArmRef.current.style.height = '20px';
        await new Promise(r => setTimeout(r, 100));
      }

      newGroups[targetGroupId].members.push(student);
      setGroups([...newGroups]);
      
      // Auto scroll down during animation
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      
      await new Promise(r => setTimeout(r, 50));
    }

    setCurrentPickingName(null);
    setIsAnimating(false);
  };

  const handleExport = () => {
    let text = "--- 分組名單 ---\n\n";
    groups.forEach(g => {
      text += `${g.name}: ${g.members.join(", ")}\n`;
    });
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "grouping_results.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="group-maker-app">
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-white/95 border-2 border-blue-500 text-blue-500 shadow-xl hover:scale-110"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="group-maker-container">
        <h1 className="group-maker-title">The Claw! 隨機分組器</h1>
        
        {/* Top Section: Fixed */}
        <div className="top-section">
          <div className="input-section">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Users size={18} />
                <span>學生名單</span>
              </div>
              <button onClick={() => setNames("")} className="clear-btn">清空</button>
            </div>
            <textarea 
              placeholder="貼入學生名單..."
              value={names}
              onChange={(e) => setNames(e.target.value)}
              disabled={isAnimating}
            />
            <div className="controls">
              <label className="font-bold text-gray-700 text-sm">組數：</label>
              <input 
                type="number" 
                className="num-input" 
                min={2} max={50} 
                value={numGroups}
                onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
              <button 
                className="start-btn"
                onClick={handleStartGrouping}
                disabled={isAnimating || !names.trim()}
              >
                {isAnimating ? "分組中..." : "開始抓取！"}
              </button>
            </div>
          </div>

          <div className="claw-machine">
            <div className="claw-arm" ref={clawArmRef}></div>
            {currentPickingName ? (
              <div className="alien-ball">{currentPickingName.slice(0, 4)}</div>
            ) : (
              <div className="flex gap-2 opacity-20">
                <div className="alien-ball">?</div>
                <div className="alien-ball">?</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Scrollable Area */}
        <div className="groups-scroll-area" ref={scrollAreaRef}>
          {groups.length > 0 ? (
            <div className="results-container">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-600">分組結果</h2>
                <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full font-bold text-sm">
                  <Download size={14} /> 導出
                </button>
              </div>
              <div className="groups-display">
                {groups.map(group => (
                  <div key={group.id} className="group-bucket">
                    <h3>{group.name}</h3>
                    <div className="flex flex-wrap">
                      {group.members.map((m, i) => (
                        <span key={i} className="member-tag">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
              等待分組... Waiting for grouping...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
