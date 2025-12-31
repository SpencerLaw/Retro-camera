import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, RefreshCcw, Download, Play } from 'lucide-react';
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

  const handleStartGrouping = async () => {
    const studentList = names.split(/[\n,，、\s]+/).filter(n => n.trim() !== "");
    if (studentList.length < numGroups) {
      alert("學生人數不能少於組數！Students must be more than groups!");
      return;
    }

    setIsAnimating(true);
    setGroups([]);
    
    // Shuffle names
    const shuffled = [...studentList].sort(() => Math.random() - 0.5);
    
    // Temporary groups
    const newGroups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
      id: i + 1,
      name: `Group ${i + 1}`,
      members: []
    }));

    // Animation loop
    for (let i = 0; i < shuffled.length; i++) {
      const student = shuffled[i];
      const targetGroupId = i % numGroups;
      
      setCurrentPickingName(student);
      
      // Animate claw (simulated)
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '200px';
        await new Promise(r => setTimeout(r, 500));
        clawArmRef.current.style.height = '50px';
        await new Promise(r => setTimeout(r, 300));
      }

      newGroups[targetGroupId].members.push(student);
      setGroups([...newGroups]);
      await new Promise(r => setTimeout(r, 200));
    }

    setCurrentPickingName(null);
    setIsAnimating(false);
  };

  const handleExport = () => {
    let text = "--- 分組名單 (Grouping Results) ---\
\n";
    groups.forEach(g => {
      text += `${g.name}: ${g.members.join(", ")}\n`;
    });
    
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "groups.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="group-maker-app">
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white/95 border-3 border-blue-500 text-blue-500 shadow-xl hover:scale-110 transition-all"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="group-maker-container">
        <h1 className="group-maker-title">The Claw! 隨機分組器</h1>
        
        <div className="input-section">
          <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold">
            <Users size={24} />
            <span>輸入學生名單 (姓名間用換行或逗號隔開)</span>
          </div>
          <textarea 
            placeholder="張小明, 王小美, 李大華..."
            value={names}
            onChange={(e) => setNames(e.target.value)}
            disabled={isAnimating}
          />
          <div className="controls">
            <label className="font-bold text-gray-700">分成幾組？</label>
            <input 
              type="number" 
              className="num-input" 
              min={2} 
              max={20} 
              value={numGroups}
              onChange={(e) => setNumGroups(parseInt(e.target.value))}
              disabled={isAnimating}
            />
            <button 
              className="start-btn flex items-center gap-2"
              onClick={handleStartGrouping}
              disabled={isAnimating || !names.trim()}
            >
              <Play fill="white" /> {isAnimating ? "分組中..." : "開始抓取！"}
            </button>
          </div>
        </div>

        <div className="claw-machine">
          <div className="claw-arm" ref={clawArmRef}></div>
          {currentPickingName && (
            <div className="alien-ball">
              {currentPickingName}
            </div>
          )}
          {!currentPickingName && !isAnimating && (
            <div className="flex gap-4 opacity-30">
              <div className="alien-ball">?</div>
              <div className="alien-ball">?</div>
              <div className="alien-ball">?</div>
            </div>
          )}
        </div>

        {groups.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-blue-600">分組結果</h2>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-bold shadow-lg hover:bg-green-600 transition-all"
              >
                <Download size={18} /> 導出結果
              </button>
            </div>
            <div className="groups-display">
              {groups.map(group => (
                <div key={group.id} className="group-bucket">
                  <h3>{group.name}</h3>
                  <div className="flex flex-wrap justify-center">
                    {group.members.map((member, i) => (
                      <span key={i} className="member-tag">{member}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
