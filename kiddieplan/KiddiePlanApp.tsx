import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './styles.css';
import { UserRole } from './types';
import ParentPortal from './views/ParentPortal';
import ChildPortal from './views/ChildPortal';
import { getDeviceId, getDeviceInfo } from './utils/licenseManager';
import { Users, User, Lock, ArrowLeft, Heart, Sparkles, BookOpen } from 'lucide-react';

const KiddiePlanApp: React.FC = () => {
  const [portal, setPortal] = useState<'selection' | 'parent' | 'child'>('selection');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('kp_token'));
  const [role, setRole] = useState<UserRole | null>(localStorage.getItem('kp_role') as UserRole);
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 自动登录逻辑
  useEffect(() => {
    if (token && role) {
      setPortal(role);
      setIsAuthenticated(true);
    }
  }, [token, role]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const action = portal === 'parent' ? 'parent_auth' : 'child_auth';
      const payload: any = { action, code: authCode };

      if (portal === 'parent') {
        payload.deviceId = getDeviceId();
        payload.deviceInfo = getDeviceInfo();
      }

      const res = await fetch('/api/kiddieplan/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        localStorage.setItem('kp_token', result.token);
        localStorage.setItem('kp_role', result.role);
        setToken(result.token);
        setRole(result.role);
        setIsAuthenticated(true);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kp_token');
    localStorage.removeItem('kp_role');
    setToken(null);
    setRole(null);
    setIsAuthenticated(false);
    setPortal('selection');
    setAuthCode('');
  };

  // 1. 初始选择界面
  if (portal === 'selection') {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 space-y-12 animate-in fade-in duration-700 overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="mesh-bg">
          <div className="mesh-blob bg-pastel-pink -top-20 -left-20 w-[400px] h-[400px]"></div>
          <div className="mesh-blob bg-pastel-blue top-1/4 -right-20 w-[350px] h-[350px]" style={{ animationDelay: '-2s' }}></div>
          <div className="mesh-blob bg-pastel-yellow -bottom-20 left-1/4 w-[450px] h-[450px]" style={{ animationDelay: '-4s' }}></div>
          <div className="mesh-blob bg-pastel-purple top-1/2 left-[-100px] w-[300px] h-[300px]" style={{ animationDelay: '-1s' }}></div>
        </div>

        <div className="text-center space-y-4 animate-float">
          <div className="relative inline-block">
            <div className="absolute -top-12 -right-12 text-6xl drop-shadow-sm">🍬</div>
            <h1 className="text-7xl font-candy bg-gradient-to-r from-[#E0C3FC] to-[#FFDEE9] bg-clip-text text-transparent drop-shadow-sm">
              星梦奇旅
            </h1>
          </div>
          <p className="text-macaron opacity-40 font-bold tracking-[0.2em] text-xs uppercase">Sweet Dreams & Better Habits</p>
        </div>

        <div className="grid grid-cols-1 gap-8 w-full max-w-sm relative z-10">
          <button
            onClick={() => setPortal('parent')}
            className="kawaii-card bg-pastel-pink/80 group hover:scale-[1.02] transition-all overflow-hidden border-none p-1"
          >
            <div className="p-10 flex flex-col items-center gap-6 relative z-10">
              <div className="w-24 h-24 bg-white/90 rounded-[40px] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                <Users size={48} className="text-[#FFDEE9]" />
              </div>
              <span className="text-3xl font-candy text-macaron">家长管理端</span>
            </div>
          </button>

          <button
            onClick={() => setPortal('child')}
            className="kawaii-card bg-pastel-yellow/80 group hover:scale-[1.02] transition-all overflow-hidden border-none p-1"
          >
            <div className="p-10 flex flex-col items-center gap-6 relative z-10">
              <div className="w-24 h-24 bg-white/90 rounded-[40px] flex items-center justify-center shadow-lg group-hover:-rotate-6 transition-transform">
                <User size={48} className="text-[#F9F1A5] drop-shadow-sm" />
              </div>
              <span className="text-3xl font-candy text-macaron">孩子执行端</span>
            </div>
          </button>
        </div>

        <Link to="/" className="text-macaron opacity-30 text-sm font-bold flex items-center gap-2 hover:opacity-100 transition-opacity mt-8">
          <ArrowLeft size={16} /> 返回大厅
        </Link>
      </div>
    );
  }

  // 2. 授权验证界面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 space-y-6 animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
        <div className="mesh-bg opacity-40">
          <div className="mesh-blob bg-pastel-purple -top-20 -right-20 w-[400px] h-[400px]"></div>
          <div className="mesh-blob bg-pastel-pink -bottom-20 -left-20 w-[400px] h-[400px]"></div>
        </div>

        <button
          onClick={() => setPortal('selection')}
          className="absolute top-8 left-8 w-14 h-14 kawaii-button bg-white text-macaron"
        >
          <ArrowLeft size={28} />
        </button>

        <div className="kawaii-card bg-white/60 p-10 w-full max-w-sm space-y-8 relative overflow-hidden">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 bg-white rounded-[30px] mx-auto flex items-center justify-center mb-6 shadow-sm border-2 border-white animate-float">
              {portal === 'parent' ? <Lock size={32} className="text-[#E0C3FC]" /> : <Sparkles size={32} className="text-[#F9F1A5]" />}
            </div>
            <h2 className="text-4xl font-candy text-macaron">
              {portal === 'parent' ? '家长验证' : '输入房间码'}
            </h2>
            <p className="text-[10px] text-macaron opacity-30 font-bold tracking-widest uppercase">Secret Entrance Only</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="relative">
              <input
                type={portal === 'parent' ? 'password' : 'text'}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                placeholder={portal === 'parent' ? '授权码 (XM_xxxx)' : '4位房间码'}
                maxLength={portal === 'parent' ? 20 : 4}
                className="w-full bg-white/80 rounded-[25px] px-6 py-5 text-center text-3xl font-candy text-macaron focus:ring-4 focus:ring-[#E0C3FC]/20 transition-all border-none shadow-sm outline-none"
                autoFocus
              />
            </div>
            {error && <p className="text-[#FF8BA0] text-xs text-center font-bold px-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full kawaii-button py-5 text-white font-bold text-xl active:scale-95 transition-all disabled:opacity-50 ${portal === 'parent' ? 'bg-pastel-purple text-white' : 'bg-pastel-yellow text-macaron'}`}
            >
              {loading ? '梦境传送中...' : '开始奇幻之旅'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. 授权成功后的主体界面
  return (
    <div className="min-h-screen relative flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="mesh-bg opacity-30">
        <div className="mesh-blob bg-pastel-pink top-[-50px] right-[-50px] w-64 h-64"></div>
        <div className="mesh-blob bg-pastel-blue bottom-[-50px] left-[-50px] w-80 h-80"></div>
      </div>
      {portal === 'parent' ? (
        <ParentPortal token={token!} onLogout={handleLogout} />
      ) : (
        <ChildPortal token={token!} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default KiddiePlanApp;
