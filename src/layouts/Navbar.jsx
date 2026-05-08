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
  Sparkles,
  Command
} from "lucide-react";

export default function Navbar({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
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
    <nav className="fixed top-6 right-8 left-[312px] z-[90] pointer-events-none">
      <div className="ultra-glass border-white/10 px-8 h-20 flex items-center justify-between pointer-events-auto relative overflow-hidden">
        {/* Interior Lighting */}
        <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-mint/50 to-transparent" />
        
        {/* Search Engine */}
        <div className="relative group w-[400px]">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-500 group-focus-within:text-mint transition-colors duration-500" />
          </div>
          <input 
            type="text" 
            placeholder="SYSTEM_SEARCH_PROTOCOL..."
            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[10px] font-mono tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-mint/30 focus:bg-white/[0.05] transition-all duration-500 uppercase"
          />
          <div className="absolute right-4 inset-y-0 flex items-center">
            <Command size={14} className="text-slate-700" />
          </div>
        </div>

        {/* Tactical Actions */}
        <div className="flex items-center gap-6">
          {/* Wallet Link */}
          <Link 
            to="/wallet"
            className="flex items-center gap-4 px-5 py-2.5 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-cyber-gold/40 transition-all duration-500 group"
          >
            <div className="p-1.5 rounded-xl bg-cyber-gold/10 text-cyber-gold shadow-neon-gold">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Currency</span>
              <span className="text-xs font-heading font-black text-white leading-none">
                {(profile?.coins || 0).toLocaleString()} <span className="text-cyber-gold">CP</span>
              </span>
            </div>
          </Link>

          {/* Notifications */}
          <div className="flex items-center gap-3">
            <button className="relative p-3 bg-white/[0.03] border border-white/5 rounded-2xl text-slate-400 hover:text-mint hover:border-mint/30 transition-all duration-500 group">
              <Bell size={20} strokeWidth={2} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-mint rounded-full border-2 border-obsidian animate-pulse" />
            </button>

            <Link 
              to="/chat"
              className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl text-slate-400 hover:text-mint hover:border-mint/30 transition-all duration-500"
            >
              <MessageSquare size={20} strokeWidth={2} />
            </Link>
          </div>

          <div className="w-[1px] h-8 bg-white/5 mx-2" />

          {/* Profile Controller */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-4 pl-2 pr-4 py-2 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/20 transition-all duration-500 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black text-sm shadow-neon-mint">
                {profile?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">
                  {profile?.username || "Agent"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-mint" />
                  <span className="text-[8px] font-black text-mint/80 uppercase tracking-[0.2em]">Rank {profile?.level || 1}</span>
                </div>
              </div>
              <ChevronDown size={14} className={`text-slate-600 transition-transform duration-500 ${profileOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                  className="absolute right-0 mt-4 w-64 ultra-glass border-white/10 p-3 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/5 mb-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Session Data</p>
                    <p className="text-[10px] font-bold text-white truncate font-mono">{profile?.email}</p>
                  </div>
                  
                  <div className="space-y-1">
                    {[
                      { icon: User, label: "View Profile", path: "/profile" },
                      { icon: Settings, label: "Configuration", path: "/settings" },
                      { icon: HelpCircle, label: "Tactical Aid", path: "/support" },
                    ].map((item, i) => (
                      <Link 
                        key={i} 
                        to={item.path} 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300"
                      >
                        <item.icon size={16} /> {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/5 transition-all duration-300"
                    >
                      <LogOut size={16} /> Disconnect
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}
