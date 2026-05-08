import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Bell, 
  Wallet, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings, 
  HelpCircle,
  MessageSquare,
  Sparkles
} from "lucide-react";

export default function Navbar({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3); // Mock
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="fixed top-0 right-0 left-72 h-20 bg-obsidian/80 backdrop-blur-xl border-b border-white/5 z-40 px-8 flex items-center justify-between transition-all duration-300">
      {/* Search Bar */}
      <div className="relative group w-96">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-slate-500 group-focus-within:text-mint transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="Search tournaments, players, clans..."
          className="w-full bg-obsidian-light/50 border border-white/5 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/30 focus:bg-obsidian-light transition-all"
        />
        <div className="absolute right-4 inset-y-0 flex items-center">
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-slate-500">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Wallet Quick View */}
        <Link 
          to="/wallet"
          className="hidden md:flex items-center gap-3 px-4 py-2 bg-obsidian-light border border-white/5 rounded-xl hover:border-cyber-gold/30 transition-all group"
        >
          <div className="p-1 rounded-lg bg-cyber-gold/10 text-cyber-gold">
            <Wallet size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter leading-none mb-0.5">Balance</span>
            <span className="text-sm font-bold text-white leading-none">
              {(profile?.coins || 0).toLocaleString()} <span className="text-cyber-gold">CP</span>
            </span>
          </div>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 bg-obsidian-light border border-white/5 rounded-xl text-slate-400 hover:text-white hover:border-mint/30 transition-all"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-mint rounded-full border-2 border-obsidian animate-pulse" />
            )}
          </button>
        </div>

        {/* Chat Toggle */}
        <Link 
          to="/chat"
          className="p-2.5 bg-obsidian-light border border-white/5 rounded-xl text-slate-400 hover:text-white hover:border-mint/30 transition-all"
        >
          <MessageSquare size={20} />
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 bg-obsidian-light border border-white/5 rounded-xl hover:border-white/10 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-bold text-sm">
              {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-white leading-tight">
                {profile?.username || profile?.email?.split('@')[0]}
              </p>
              <div className="flex items-center gap-1">
                <Sparkles size={10} className="text-mint" />
                <span className="text-[10px] font-black text-mint/80 uppercase tracking-tighter">LVL {profile?.level || 1}</span>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 bg-obsidian-lighter border border-white/5 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-white/5 mb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-xs font-bold text-white truncate">{profile?.email}</p>
                </div>
                
                <div className="space-y-1">
                  <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <User size={16} /> Mon Profil
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <Settings size={16} /> Paramètres
                  </Link>
                  <Link to="/support" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <HelpCircle size={16} /> Aide & Support
                  </Link>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-400/5 transition-all"
                  >
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
