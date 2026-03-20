import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'lamvideokiemtien' && password === 'kiemnhieutien') {
      localStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-8 text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="bg-white/20 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-xl">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">NAM AI</h1>
            <p className="text-orange-100 font-medium opacity-90">Hệ thống AI Nhân Hóa Chuyên Nghiệp</p>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black/10 rounded-full blur-3xl"></div>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tên đăng nhập</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="Nhập tên đăng nhập..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"
              >
                <ArrowRight size={16} /> {error}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 text-lg"
            >
              ĐĂNG NHẬP NGAY
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex flex-col items-center text-center gap-3">
              <div className="bg-blue-500 text-white p-2 rounded-full shadow-lg">
                <MessageCircle size={20} />
              </div>
              <div>
                <p className="text-blue-900 text-sm font-bold mb-1">Chưa có mật khẩu truy cập?</p>
                <p className="text-blue-700 text-xs leading-relaxed">
                  Vui lòng liên hệ Zalo <span className="font-black text-blue-900">098.102.8794</span> để lấy mật khẩu truy cập ứng dụng.
                </p>
              </div>
              <a 
                href="https://zalo.me/0981028794" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-2 px-6 py-2 bg-white text-blue-600 border border-blue-200 rounded-full text-xs font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                NHẮN ZALO NGAY
              </a>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          © 2026 NAM AI - All Rights Reserved
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
