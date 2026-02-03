import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './styles.css';
import { UserRole } from './types';
import ParentPortal from './views/ParentPortal';
import ChildPortal from './views/ChildPortal';
import { getDeviceId, getDeviceInfo } from './utils/licenseManager';
import { User, Lock, ArrowLeft, Sparkles, Home } from 'lucide-react';

const KiddiePlanApp: React.FC = () => {
  const [portal, setPortal] = useState<'selection' | 'parent' | 'child'>(() => {
    // Check if we have an active session to restore
    const savedToken = localStorage.getItem('kp_token');
    const savedRole = localStorage.getItem('kp_role') as UserRole;
    return (savedToken && savedRole) ? savedRole : 'selection';
  });

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

  const handleSwitchRole = () => {
    // Just switch view, don't necessarily logout unless needed. 
    // But for safety and clarity, let's treat "Back to Home" as a full reset to selection
    // or we can keep session but just show selection. 
    // User request: "Back to Home button" -> likely wants to switch portals.
    setPortal('selection');

    // Optional: If they switch to selection, should we clear auth? 
    // If we don't clear auth, the useEffect will auto-redirect them back.
    // So we MUST clear auth state to stay on selection screen.
    handleLogout();
  };

  // 1. Initial Selection Screen - REBUILT for Full Screen Immersion
  if (portal === 'selection') {
    return (
      <div className="h-screen w-screen relative flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-700">
        {/* Full Screen Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[#F5EDE0]">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF8095] rounded-full blur-[120px] opacity-70 animate-float-slow"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-[#CBC3E3] rounded-full blur-[100px] opacity-70 animate-float-delayed"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] bg-[#FF6B81] rounded-full blur-[120px] opacity-60 animate-pulse-slow"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-16 w-full max-w-md px-6">
          <div className="text-center space-y-4 animate-float">
            <div className="relative inline-block">
              <div className="absolute -top-16 -right-16 text-8xl drop-shadow-md animate-bounce-slow">🍬</div>
              <h1 className="text-8xl font-candy bg-gradient-to-br from-[#FF6B81] to-[#FF8095] bg-clip-text text-transparent drop-shadow-sm select-none">
                星梦奇旅
              </h1>
            </div>
            <p className="text-[#5D4037] opacity-40 font-bold tracking-[0.4em] text-sm uppercase">Sweet Dreams & Better Habits</p>
          </div>

          <div className="grid grid-cols-2 gap-8 w-full">
            <button
              onClick={() => setPortal('parent')}
              className="group relative aspect-[4/5] perspective-1000"
            >
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xl rounded-[48px] shadow-[0_20px_50px_rgba(224,195,252,0.3)] border-4 border-white transition-all duration-500 group-hover:rotate-y-12 group-hover:scale-105 group-hover:bg-white/60"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#FF8095] to-[#fff] rounded-[36px] flex items-center justify-center shadow-lg border-4 border-white group-hover:animate-bounce-slow">
                  <Lock size={40} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-candy text-[#5D4037] tracking-wider">家长端</span>
              </div>
            </button>

            <button
              onClick={() => setPortal('child')}
              className="group relative aspect-[4/5] perspective-1000"
            >
              <div className="absolute inset-0 bg-white/70 backdrop-blur-xl rounded-[48px] shadow-[0_20px_50px_rgba(181,255,252,0.3)] border-4 border-white transition-all duration-500 group-hover:-rotate-y-12 group-hover:scale-105 group-hover:bg-white/60"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#E6E6FA] to-[#fff] rounded-[36px] flex items-center justify-center shadow-lg border-4 border-white group-hover:animate-bounce-slow">
                  <User size={40} className="text-[#5D4037]" strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-candy text-[#5D4037] tracking-wider">孩子端</span>
              </div>
            </button>
          </div>

          <Link to="/" className="text-[#5D4037]/30 text-xs font-bold flex items-center gap-2 hover:text-[#5D4037] transition-colors py-4 px-8 rounded-full hover:bg-white/30">
            <ArrowLeft size={14} /> 返回游戏大厅
          </Link>
        </div>
      </div>
    );
  }

  // 2. Auth Screen - Refined
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen relative flex flex-col items-center justify-center overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Background */}
        <div className="absolute inset-0 bg-[#F5EDE0]">
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[#FF6B81]/40 to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[60%] h-[60%] bg-gradient-to-tr from-[#CBC3E3]/40 to-transparent blur-3xl"></div>
        </div>

        <button
          onClick={() => setPortal('selection')}
          className="absolute top-10 left-10 w-14 h-14 bg-white/80 rounded-[20px] flex items-center justify-center text-[#5D4037] shadow-lg border-4 border-white hover:scale-110 active:scale-90 transition-all z-50"
        >
          <Home size={24} />
        </button>

        <div className="bg-white/85 backdrop-blur-xl p-12 w-full max-w-sm rounded-[60px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] border-8 border-white relative z-10 animate-float-kawaii">
          <div className="text-center space-y-6 mb-10">
            <div className={`w-28 h-28 mx-auto rounded-[40px] flex items-center justify-center shadow-xl border-4 border-white ${portal === 'parent' ? 'bg-[#FF8095]' : 'bg-[#E6E6FA]'}`}>
              {portal === 'parent' ? <Lock size={48} className="text-white" /> : <Sparkles size={48} className="text-white" />}
            </div>
            <div>
              <h2 className="text-4xl font-candy text-[#5D4037]">
                {portal === 'parent' ? '家长通行证' : '梦境钥匙'}
              </h2>
              <p className="text-[10px] text-[#5D4037] opacity-40 font-bold tracking-[0.3em] uppercase mt-2">
                {portal === 'parent' ? 'Parent Access Only' : 'Enter Room Code'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="relative group">
              <input
                type={portal === 'parent' ? 'password' : 'text'}
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                placeholder={portal === 'parent' ? '输入密码' : '4位号码'}
                maxLength={portal === 'parent' ? 20 : 4}
                className="w-full bg-white rounded-[30px] px-6 py-6 text-center text-3xl font-candy text-[#5D4037] focus:ring-4 focus:ring-[#FF8095]/30 transition-all border-4 border-transparent focus:border-[#FF8095]/50 shadow-inner outline-none placeholder:text-[#5D4037]/20"
                autoFocus
              />
            </div>
            {error && <div className="bg-[#FFDEE9] text-[#D04665] py-3 rounded-2xl text-xs text-center font-bold animate-pulse">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-6 rounded-[35px] text-white font-candy text-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 border-4 border-white ${portal === 'parent' ? 'bg-[#FF8095] from-[#FF8095] to-[#E6E6FA] bg-gradient-to-r' : 'bg-[#E6E6FA] from-[#E6E6FA] to-[#FF8095] bg-gradient-to-r'}`}
            >
              {loading ? '验证中...' : '开启大门'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Main Portal View
  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#F5EDE0]">


      <div className="h-full w-full flex flex-col lg:max-w-none md:max-w-2xl sm:max-w-md mx-auto relative shadow-2xl bg-white/50 backdrop-blur-sm">
        {portal === 'parent' ? (
          <ParentPortal token={token!} onLogout={handleLogout} />
        ) : (
          <ChildPortal token={token!} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
};

export default KiddiePlanApp;
