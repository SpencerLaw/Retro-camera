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
      
      // Animate claw
      if (clawArmRef.current) {
        clawArmRef.current.style.height = '120px';
        await new Promise(r => setTimeout(r, 300));
        clawArmRef.current.style.height = '30px';
        await new Promise(r => setTimeout(r, 150));
      }

      newGroups[targetGroupId].members.push(student);
      setGroups([...newGroups]);
      
      // Auto scroll to bottom during animation if needed
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      
      await new Promise(r => setTimeout(r, 100));
    }

    setCurrentPickingName(null);
    setIsAnimating(false);
  };

  const handleExport = () => {
    let text = "--- 分組名單 (Grouping Results) ---

";
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

  const clearNames = () => {
    if (window.confirm("確定要清空名單嗎？Clear list?")) {
      setNames("");
      setGroups([]);
    }
  };

  return (
    <div className="group-maker-app">
      <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 p-2 sm:p-3 rounded-full bg-white/95 border-2 sm:border-3 border-blue-500 text-blue-500 shadow-xl hover:scale-110 transition-all"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="group-maker-container">
        <h1 className="group-maker-title">The Claw! 隨機分組器</h1>
        
        <div className="input-section">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm sm:text-base">
              <Users size={20} />
              <span>學生名單 (支持批量複製)</span>
            </div>
            <button onClick={clearNames} className="clear-btn flex items-center gap-1">
              <Trash2 size={14} /> 清空
            </button>
          </div>
          <textarea 
            placeholder="張小明, 王小美, 李大華..."
            value={names}
            onChange={(e) => setNames(e.target.value)}
            disabled={isAnimating}
          />
          <div className="controls">
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-700 text-sm">組數：</label>
              <input 
                type="number" 
                className="num-input" 
                min={2} 
                max={50} 
                value={numGroups}
                onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                disabled={isAnimating}
              />
            </div>
            <button 
              className="start-btn flex items-center gap-2"
              onClick={handleStartGrouping}
              disabled={isAnimating || !names.trim()}
            >
              <Play size={18} fill="white" /> {isAnimating ? "分組中..." : "開始抓取！"}
            </button>
          </div>
        </div>

        <div className="claw-machine">
          <div className="claw-arm" ref={clawArmRef}></div>
          {currentPickingName && (
            <div className="alien-ball">
              {currentPickingName.slice(0, 4)}
            </div>
          )}
          {!currentPickingName && !isAnimating && (
            <div className="flex gap-4 opacity-30">
              <div className="alien-ball">?</div>
              <div className="alien-ball">?</div>
            </div>
          )}
        </div>

        <div className="groups-scroll-area" ref={scrollAreaRef}>
          {groups.length > 0 && (
            <div className="results-container">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-600">分組結果</h2>
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full font-bold shadow-md hover:bg-green-600 text-sm transition-all"
                >
                  <Download size={16} /> 導出 TXT
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
    </div>
  );
};