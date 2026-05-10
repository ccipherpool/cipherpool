import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import TopNav from "./TopNav";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";
import { BackgroundBeams } from "../components/ui/BackgroundBeams";
import {
  LayoutDashboard, Trophy, BarChart3, User, Ticket,
  ShieldAlert, LogOut, Sparkles, X, Menu,
  Wallet, MessageSquare, Star, ShoppingBag, Crown, Users2,
  Newspaper, Gift, TrendingUp, Users, Zap
} from "lucide-react";

const MOBILE_BOTTOM_NAV = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Home"      },
  { path: "/tournaments", icon: Trophy,           label: "Arena"     },
  { path: "/chat",        icon: MessageSquare,   label: "Chat"      },
  { path: "/store",       icon: ShoppingBag,      label: "Shop"      },
  { path: "/wallet",      icon: Wallet,           label: "Assets"    },
];

const DRAWER_NAV = [
  { path: "/dashboard",     icon: LayoutDashboard, label: "Command Center" },
  { path: "/tournaments",   icon: Trophy,          label: "Operations" },
  { path: "/leaderboard",   icon: BarChart3,       label: "Rankings" },
  { path: "/store",         icon: ShoppingBag,     label: "Tactical Store" },
  { path: "/news",          icon: Newspaper,       label: "Flash News" },
  { path: "/profile",       icon: User,            label: "Profile Specs" },
  { path: "/wallet",        icon: Wallet,          label: "Assets" },
  { path: "/stats",         icon: TrendingUp,      label: "Intelligence" },
  { path: "/daily-rewards", icon: Gift,            label: "Daily Supplies" },
  { path: "/support",       icon: Ticket,          label: "Support" },
  { path: "/chat",          icon: MessageSquare,   label: "Global Arena" },
  { path: "/achievements",  icon: Star,            label: "Achievements" },
  { path: "/clans",         icon: Users2,          label: "Tactical Clans" },
  { path: "/teams",         icon: Users,           label: "Squadrons" },
  { path: "/hall-of-fame",  icon: Crown,           label: "Hall of Fame" },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (prof) setProfile(prof);
    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => { await fetchProfile(); setLoading(false); };
    init();
  }, [fetchProfile]);

  // Close drawer on navigation
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-obsidian-deep">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-2 border-mint/10 rounded-[2rem] rotate-45" />
            <div className="absolute inset-0 border-2 border-mint rounded-[2rem] animate-spin [animation-duration:3s]" />
            <div className="absolute inset-4 border-2 border-cyber-gold rounded-full animate-ping" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-black text-xl tracking-[0.2em] text-white">CIPHERPOOL</h2>
            <p className="font-mono text-[10px] tracking-[0.4em] text-mint uppercase animate-pulse">Establishing Secure Uplink</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-deep text-white flex flex-col overflow-hidden">
      <div className="noise-overlay" />
      <div className="scan-line" />

      {/* Top Navigation — desktop only */}
      <TopNav profile={profile} />

      {/* Mobile Header */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-[90] h-16 flex items-center px-4 border-b border-white/10 bg-obsidian-deep/80 backdrop-blur-xl">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors mr-3"
        >
          <Menu size={24} />
        </button>
        <span className="text-sm font-heading font-black tracking-tighter text-white flex-1">
          CIPHER<span className="text-mint">POOL</span>
        </span>
        <div className="flex items-center gap-3">
           <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
              <Wallet size={14} className="text-cyber-gold" />
              <span className="text-[10px] font-black text-white">{(profile?.coins || 0).toLocaleString()}</span>
           </Link>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-80 z-[210] md:hidden flex flex-col bg-obsidian-deep border-r border-white/10"
            >
              <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-mint rounded-xl flex items-center justify-center shadow-neon-mint rotate-45">
                    <Sparkles className="text-obsidian -rotate-45" size={16} fill="currentColor" />
                  </div>
                  <span className="text-sm font-heading font-black tracking-tighter text-white">CIPHERPOOL</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar">
                {DRAWER_NAV.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
                        isActive ? "bg-mint/10 text-mint border border-mint/20" : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}

                {isAdmin && (
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 px-5 mb-4">Command Control</p>
                    <NavLink to="/admin" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 hover:bg-orange-400/5 transition-all">
                       <ShieldAlert size={20} /> Admin Panel
                    </NavLink>
                    {profile?.role === "super_admin" && (
                      <NavLink to="/super-admin" className="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all">
                         <Zap size={20} /> Super Admin
                      </NavLink>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs">
                  <LogOut size={18} /> Terminate session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative h-screen overflow-y-auto custom-scrollbar pt-20 md:pt-32 pb-24 md:pb-12 px-4 md:px-12">
        <div className="max-w-7xl mx-auto relative z-10">
          <AnimatePresence mode="wait">
             <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
             >
                <Outlet context={{ profile, refreshProfile: fetchProfile }} />
             </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[150] h-16 bg-obsidian-deep/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-2">
         {MOBILE_BOTTOM_NAV.map(item => {
           const isActive = location.pathname === item.path;
           return (
             <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-mint' : 'text-slate-500'}`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
             </Link>
           );
         })}
      </nav>

      {/* Simplified Static Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-mint/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-purple/[0.03] blur-[120px] rounded-full" />
      </div>

      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}
