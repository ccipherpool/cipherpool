import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Trophy, 
  BarChart3, 
  MessageSquare, 
  Users2, 
  ShoppingBag, 
  Wallet, 
  Star, 
  Newspaper, 
  Ticket,
  TrendingUp,
  ShieldAlert,
  Zap,
  Crown,
  Layout,
  LogOut,
  Sparkles,
  Search,
  Bell
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ThemeToggle from "../components/ui/ThemeToggle";

const NavItem = ({ item, isActive }) => (
  <NavLink
    to={item.path}
    className={`relative px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 group ${
      isActive ? 'text-mint' : 'text-slate-400 hover:text-white'
    }`}
  >
    <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'neon-glow-mint' : ''} />
    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
      {item.label}
    </span>
    {isActive && (
      <motion.div
        layoutId="top-nav-active"
        className="absolute -bottom-[21px] left-0 right-0 h-1 bg-mint shadow-neon-mint rounded-t-full"
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    )}
  </NavLink>
);

export default function TopNav({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const mainItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Command" },
    { path: "/tournaments", icon: Trophy, label: "Arena" },
    { path: "/chat", icon: MessageSquare, label: "Global Chat" },
    { path: "/clans", icon: Users2, label: "Tactical Clans" },
    { path: "/leaderboard", icon: BarChart3, label: "Rankings" },
  ];

  const subItems = [
    { path: "/store", icon: ShoppingBag, label: "Tactical Store" },
    { path: "/wallet", icon: Wallet, label: "Assets" },
    { path: "/stats", icon: TrendingUp, label: "Intelligence" },
    { path: "/news", icon: Newspaper, label: "Flash News" },
    { path: "/support", icon: Ticket, label: "Support" },
  ];

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-20 bg-obsidian-deep/60 backdrop-blur-2xl border-b border-white/5 px-8 hidden md:flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-4 min-w-[200px]">
        <div className="w-10 h-10 bg-mint rounded-xl flex items-center justify-center shadow-neon-mint rotate-45">
          <Sparkles className="text-obsidian -rotate-45" size={20} fill="currentColor" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-heading font-black tracking-tighter text-white">
            CIPHER<span className="text-mint">POOL</span>
          </h1>
          <span className="text-[8px] uppercase tracking-[0.4em] font-black text-mint/50">Tactical v4.2.0</span>
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex items-center gap-2">
        {mainItems.map(item => (
          <NavItem key={item.path} item={item} isActive={location.pathname === item.path} />
        ))}
        <div className="h-8 w-[1px] bg-white/5 mx-4" />
        <div className="flex items-center gap-2">
          {subItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`p-2 rounded-xl transition-all duration-300 ${
                location.pathname === item.path ? 'text-mint bg-mint/5' : 'text-slate-500 hover:text-white'
              }`}
              title={item.label}
            >
              <item.icon size={18} />
            </NavLink>
          ))}
        </div>
      </div>

      {/* Profile & Controls */}
      <div className="flex items-center gap-6 min-w-[240px] justify-end">
        <ThemeToggle variant="icon" buttonSize={32} />
        
        <div className="flex items-center gap-3">
          <button className="relative p-2.5 bg-white/[0.03] border border-white/5 rounded-xl text-slate-400 hover:text-mint transition-all">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-mint rounded-full border-2 border-obsidian animate-pulse" />
          </button>
        </div>

        <div className="relative group">
           <button className="flex items-center gap-3 pl-2 pr-1 py-1.5 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/20 transition-all">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black text-xs shadow-neon-mint">
                {profile?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div className="text-left hidden lg:block pr-4">
                 <p className="text-[9px] font-black text-white uppercase tracking-widest">{profile?.username || "Agent"}</p>
                 <p className="text-[8px] font-bold text-mint/60 uppercase">Lvl {profile?.level || 1}</p>
              </div>
           </button>

           {/* Hover Menu */}
           <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[110]">
              <div className="w-56 ultra-glass border-white/10 p-2 shadow-2xl">
                 <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Authorization</p>
                    <p className="text-[10px] font-bold text-white truncate">{profile?.email}</p>
                 </div>
                 
                 <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                    <User size={14} /> Profile Specs
                 </NavLink>

                 {isAdmin && (
                    <div className="mt-1 pt-1 border-t border-white/5">
                       <NavLink to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 hover:bg-orange-400/5 transition-all">
                          <ShieldAlert size={14} /> Control Panel
                       </NavLink>
                       {profile?.role === 'super_admin' && (
                          <NavLink to="/super-admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all">
                             <Zap size={14} /> System Override
                          </NavLink>
                       )}
                    </div>
                 )}

                 <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 transition-all mt-1">
                    <LogOut size={14} /> Terminate
                 </button>
              </div>
           </div>
        </div>
      </div>
    </nav>
  );
}
