import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Trophy, Users, MessageSquare, 
  Store, Wallet, User, Settings, Menu, X, 
  Bell, ShieldCheck, LogOut, ChevronRight,
  Star, Zap, Award, HelpCircle, BarChart3, Newspaper, Gift, Medal
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const MainLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard', color: 'text-cp-primary' },
    { icon: Trophy, label: 'Tournois', path: '/tournaments', color: 'text-cp-secondary' },
    { icon: BarChart3, label: 'Classement', path: '/leaderboard', color: 'text-yellow-400' },
    { icon: Users, label: 'Clans', path: '/clans', color: 'text-cp-accent' },
    { icon: MessageSquare, label: 'Chat Global', path: '/chat', color: 'text-purple-400' },
    { icon: Store, label: 'Boutique', path: '/store', color: 'text-orange-400' },
    { icon: Wallet, label: 'Portefeuille', path: '/wallet', color: 'text-blue-400' },
    { icon: Newspaper, label: 'Actualités', path: '/news', color: 'text-pink-400' },
    { icon: Medal, label: 'Achievements', path: '/achievements', color: 'text-indigo-400' },
    { icon: Gift, label: 'Daily Rewards', path: '/daily-rewards', color: 'text-red-400' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-cp-primary/30 overflow-hidden flex">
      {/* Background Mesh */}
      <div className="fixed inset-0 bg-[radial-gradient(at_0%_0%,_rgba(168,85,247,0.15)_0px,_transparent_50%),_radial-gradient(at_100%_0%,_rgba(0,212,255,0.1)_0px,_transparent_50%)] pointer-events-none z-0" />
      
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, x: isSidebarOpen ? 0 : -280 }}
        className="fixed lg:relative z-50 h-screen bg-[#0d0d14]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col overflow-hidden"
      >
        <div className="w-[280px] flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cp-primary to-cp-secondary rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              <Zap size={22} className="text-white fill-white" />
            </div>
            <span className="font-black tracking-tighter text-2xl italic">CIPHER<span className="text-cp-primary">POOL</span></span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4 px-3">Menu Principal</p>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl transition-all duration-300
                    ${isActive 
                      ? 'bg-cp-primary/10 text-white border border-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]' 
                      : 'text-white/50 hover:bg-white/5 hover:text-white'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={`${isActive ? item.color : 'group-hover:' + item.color} transition-colors`} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {isActive && <motion.div layoutId="active-pill" className="w-1.5 h-1.5 rounded-full bg-cp-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]" />}
                </Link>
              );
            })}

            {profile?.role === 'super_admin' && (
              <div className="mt-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-4 px-3">Administration</p>
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-3 rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <ShieldCheck size={20} />
                  <span className="font-medium text-sm">Super Admin</span>
                </Link>
              </div>
            )}
          </nav>

          {/* User Profile */}
          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cp-primary/20 to-cp-secondary/20 border border-white/10 flex items-center justify-center overflow-hidden">
                <User size={20} className="text-cp-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{profile?.full_name || 'Joueur'}</p>
                <p className="text-[10px] text-white/40 truncate uppercase tracking-wider">{profile?.role || 'User'}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-white/30 hover:text-red-400 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 relative z-20">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Serveur Online</span>
            </div>
            <button className="p-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all relative">
              <Bell size={20} className="text-white/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-cp-primary rounded-full border-2 border-[#050508]" />
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto p-6 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}} />
    </div>
  );
};

export default MainLayout;
