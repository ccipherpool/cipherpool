import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Trophy, Users, MessageSquare, 
  Store, Wallet, User, LogOut, Menu, X, 
  Bell, Settings, ChevronRight, BarChart3,
  Newspaper, Gift, Medal, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Trophy, label: 'Tournaments', path: '/tournaments' },
    { icon: BarChart3, label: 'Leaderboard', path: '/leaderboard' },
    { icon: Users, label: 'Clans', path: '/clans' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Store, label: 'Store', path: '/store' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Newspaper, label: 'News', path: '/news' },
    { icon: Medal, label: 'Achievements', path: '/achievements' },
    { icon: Gift, label: 'Daily Rewards', path: '/daily-rewards' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return null;

  return (
    <div className="flex h-screen bg-dark-950 text-neutral-100">
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative h-screen bg-dark-900 border-r border-neutral-700 flex flex-col
        transition-all duration-300 z-50 lg:z-0
        ${isSidebarOpen ? 'w-64' : 'w-0 lg:w-20'}
        overflow-hidden
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-neutral-700">
            {isSidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CP</span>
                </div>
                <span className="font-display font-bold text-lg">CipherPool</span>
              </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-dark-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-dark-800'}
                  `}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {isSidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-neutral-700 p-4">
            {profile && (
              <div className={`
                flex items-center gap-3 p-3 rounded-lg bg-dark-800 border border-neutral-700
                ${isSidebarOpen ? '' : 'justify-center'}
              `}>
                <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-brand-primary" />
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.full_name}</p>
                    <p className="text-xs text-neutral-400 truncate uppercase">{profile.role}</p>
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-neutral-400 hover:text-neutral-100"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 border-b border-neutral-700 bg-dark-900">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-2 hover:bg-dark-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors relative">
              <Bell size={20} className="text-neutral-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full" />
            </button>
            <button className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
              <Settings size={20} className="text-neutral-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
