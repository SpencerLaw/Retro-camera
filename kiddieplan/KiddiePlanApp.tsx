import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './styles.css';
import { UserRole } from './types';
import ParentPortal from './views/ParentPortal';
import ChildPortal from './views/ChildPortal';
import { getDeviceId, getDeviceInfo } from './utils/licenseManager';
import { User, Lock, ArrowLeft, Sparkles, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    // Parent auto-restore is handled when clicking the 'Parent Zone' button
    // for immediate redirect if token exists.
    if (token && role) {
      setPortal(role);
      setIsAuthenticated(true);
    }
  }, [token, role]);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setPortal(selectedRole);
    setAuthCode('');
    setError(null);

    // PERSISTENCE CHECK: If parent, check for saved token and 15-day expiration
    if (selectedRole === 'parent') {
      const savedParentToken = localStorage.getItem('kp_parent_token');
      const savedAuthTime = localStorage.getItem('kp_parent_auth_time');

      const now = Date.now();
      const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

      if (savedParentToken && savedAuthTime) {
        if (now - parseInt(savedAuthTime) < fifteenDaysInMs) {
          setToken(savedParentToken);
          setRole('parent');
          setIsAuthenticated(true);
        } else {
          // Session expired
          localStorage.removeItem('kp_parent_token');
          localStorage.removeItem('kp_parent_auth_time');
        }
      }
    }
  };

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
        // Save token specifically by role if needed for persistence
        if (portal === 'parent') {
          localStorage.setItem('kp_parent_token', result.token);
          localStorage.setItem('kp_parent_auth_time', Date.now().toString()); // Set auth timestamp
        } else {
          localStorage.setItem('kp_child_token', result.token);
        }

        // Also set 'last session' for initialization
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
    // If it's a parent returning to selection, we DON'T clear kp_parent_token
    // so they don't have to re-enter the code.
    // We only clear the current session state.

    if (portal === 'child') {
      localStorage.removeItem('kp_child_token');
    }

    // Clear the "current session" markers but keep the parent persistent one
    localStorage.removeItem('kp_token');
    localStorage.removeItem('kp_role');

    setToken(null);
    setRole(null);
    setIsAuthenticated(false);
    setPortal('selection');
    setAuthCode('');
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const floatAnimation = {
    y: [0, -15, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  };

  const buttonHover = {
    scale: 1.05,
    rotate: [0, -2, 2, 0],
    transition: { duration: 0.3 }
  };

  const buttonTap = { scale: 0.95 };

  // 1. Initial Selection Screen
  if (portal === 'selection') {
    return (
      <motion.div
        key="selection"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="min-h-screen w-full relative flex flex-col items-center justify-center bg-[var(--color-bg-light-pink)] py-10"
      >
        {/* Kawaii Background Accents - Fixed Position */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[10%] left-[10%] w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-60"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-[20%] right-[10%] w-72 h-72 bg-[var(--color-blue-fun)] rounded-full mix-blend-multiply filter blur-[80px] opacity-60"
            animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
            transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-[10%] left-[30%] w-80 h-80 bg-[var(--color-yellow-reward)] rounded-full mix-blend-multiply filter blur-[80px] opacity-60"
            animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
            transition={{ duration: 9, repeat: Infinity, delay: 2 }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-lg px-6 my-auto">
          <motion.div
            className="text-center space-y-4"
            animate={floatAnimation}
          >
            <div className="relative inline-block">
              <motion.div
                className="absolute -top-16 -right-16 text-8xl drop-shadow-md select-none"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🌟
              </motion.div>
              <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-blue-fun)] to-purple-400 drop-shadow-sm select-none"
                style={{ fontFamily: '"ZCOOL KuaiLe", cursive' }}>
                星梦奇旅
              </h1>
            </div>
            <p className="text-[#5D4037] opacity-60 font-bold tracking-[0.2em] text-lg">开启你的奇妙成长冒险</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.button
              onClick={() => handleRoleSelect('parent')}
              whileHover={buttonHover}
              whileTap={buttonTap}
              className="bg-white/80 backdrop-blur-md rounded-[40px] p-8 shadow-[0_15px_30px_rgba(96,165,250,0.2)] border-4 border-white flex flex-col items-center gap-4 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 bg-[var(--color-bg-light-blue)] rounded-full flex items-center justify-center shadow-inner border-4 border-white relative z-10 group-hover:scale-110 transition-transform">
                <Lock size={40} className="text-[var(--color-blue-fun)]" strokeWidth={3} />
              </div>
              <span className="text-2xl font-bold text-[#5D4037] relative z-10">家长入口</span>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider relative z-10">Parent Zone</span>
            </motion.button>

            <motion.button
              onClick={() => handleRoleSelect('child')}
              whileHover={buttonHover}
              whileTap={buttonTap}
              className="bg-white/80 backdrop-blur-md rounded-[40px] p-8 shadow-[0_15px_30px_rgba(236,72,153,0.2)] border-4 border-white flex flex-col items-center gap-4 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white relative z-10 group-hover:scale-110 transition-transform">
                <User size={40} className="text-pink-400" strokeWidth={3} />
              </div>
              <span className="text-2xl font-bold text-[#5D4037] relative z-10">孩子入口</span>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider relative z-10">Kid's World</span>
            </motion.button>
          </div>

          <Link to="/" className="text-[#5D4037]/50 text-sm font-bold flex items-center gap-2 hover:text-[var(--color-blue-fun)] transition-colors py-3 px-6 rounded-full hover:bg-white/40">
            <ArrowLeft size={18} /> 返回首页
          </Link>
        </div>
      </motion.div>
    );
  }

  // 2. Auth Screen - Refined
  if (!isAuthenticated) {
    return (
      <motion.div
        key="auth"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="h-screen w-screen relative flex flex-col items-center justify-center overflow-hidden bg-[var(--color-bg-light-pink)]"
      >
        {/* Background Blobs Same as Selection */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[10%] right-[20%] w-96 h-96 bg-[var(--color-blue-fun)] rounded-full mix-blend-multiply filter blur-[100px] opacity-40"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-[10%] left-[10%] w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <motion.button
          onClick={() => setPortal('selection')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-8 left-8 w-14 h-14 bg-white/90 rounded-[20px] flex items-center justify-center text-[#5D4037] shadow-[0_8px_16px_rgba(0,0,0,0.1)] border-4 border-white z-50"
        >
          <Home size={24} strokeWidth={3} />
        </motion.button>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-white/80 backdrop-blur-xl p-10 w-full max-w-sm rounded-[50px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] border-8 border-white relative z-10"
        >
          <div className="text-center space-y-6 mb-8">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center shadow-xl border-8 border-white
                            ${portal === 'parent' ? 'bg-gradient-to-tr from-[var(--color-blue-fun)] to-blue-300' : 'bg-gradient-to-tr from-pink-400 to-[var(--color-yellow-reward)]'}`}
            >
              {portal === 'parent' ? <Lock size={48} className="text-white" strokeWidth={3} /> : <Sparkles size={48} className="text-white" strokeWidth={3} />}
            </motion.div>
            <div>
              <h2 className="text-3xl font-black text-[#5D4037] tracking-wider mb-2" style={{ fontFamily: '"ZCOOL KuaiLe", sans-serif' }}>
                {portal === 'parent' ? '家长通行证' : '梦境钥匙'}
              </h2>
              <p className="text-xs text-[#5D4037] opacity-40 font-bold tracking-[0.2em] uppercase">
                {portal === 'parent' ? 'Security • Verification' : 'Enter Secret Code'}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <motion.div
              animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <input
                type={portal === 'parent' ? 'password' : 'tel'}
                value={authCode}
                onChange={(e) => {
                  setAuthCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder={portal === 'parent' ? '请输入密码' : '请输入4位号码'}
                maxLength={portal === 'parent' ? 20 : 4}
                className="w-full bg-[#FFF9F0] rounded-[25px] px-6 py-5 text-center text-3xl font-black text-[#5D4037] tracking-widest outline-none border-4 border-transparent focus:border-[var(--color-blue-fun)] focus:bg-white transition-all shadow-inner placeholder:text-[#5D4037]/20"
                autoFocus
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#FFE4E6] text-[var(--color-red-warning)] py-2 rounded-xl text-xs text-center font-bold"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-5 rounded-[25px] text-white font-black text-xl shadow-[0_10px_20px_rgba(0,0,0,0.1)] active:shadow-none transition-all disabled:opacity-50 border-b-8 active:border-b-0 active:translate-y-2
                            ${portal === 'parent'
                  ? 'bg-[var(--color-blue-fun)] border-blue-600 shadow-blue-200'
                  : 'bg-gradient-to-r from-pink-400 to-[var(--color-yellow-reward)] border-pink-600 shadow-pink-200'}`}
            >
              {loading ? '🔮 正在开启...' : '🚀 芝麻开门'}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  }

  // 3. Main Portal View
  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key="portal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5 }}
        className="h-screen w-screen relative overflow-hidden bg-[#F5EDE0]"
      >
        <div className="h-full w-full flex flex-col mx-auto relative shadow-2xl bg-white/50 backdrop-blur-sm">
          {portal === 'parent' ? (
            <ParentPortal token={token!} onLogout={handleLogout} />
          ) : (
            <ChildPortal token={token!} onLogout={handleLogout} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default KiddiePlanApp;
