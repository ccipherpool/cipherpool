import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Trophy, 
  BarChart3, 
  User, 
  Ticket, 
  ShieldAlert, 
  Crown, 
  PlusCircle, 
  Gamepad2, 
  LogOut,
  ChevronRight,
  Sparkles,
  Settings,
  Sword,
  Target
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MenuItem = ({ item, isActive }) => {
  return (
    <NavLink
      to={item.path}
      className="relative group flex items-center gap-4 px-6 py-4 rounded-[1.25rem] transition-all duration-500 overflow-hidden"
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-v2"
          className="absolute inset-0 bg-mint/10 border border-mint/20 rounded-[1.25rem]"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      
      <div className={`relative z-10 p-2 rounded-xl transition-all duration-500 ${
        isActive ? "text-mint bg-mint/10 neon-glow-mint" : "text-slate-500 group-hover:text-mint group-hover:bg-mint/5"
      }`}>
        <item.icon size={22} strokeWidth={2.5} />
      </div>
      
      <span className={`relative z-10 font-heading font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${
        isActive ? "text-white" : "text-slate-500 group-hover:text-white"
      }`}>
        {item.label}
      </span>

      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-mint/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </NavLink>
  );
};

export default function Sidebar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Command" },
    { path: "/tournaments", icon: Trophy, label: "Tournaments" },
    { path: "/arena", icon: Sword, label: "Arena" },
    { path: "/leaderboard", icon: BarChart3, label: "Rankings" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/support", icon: Ticket, label: "Support" },
  ];

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  return (
    <aside className="fixed left-0 top-0 w-72 h-screen p-6 flex flex-col z-[100] pointer-events-none">
      <div className="flex-1 ultra-glass border-white/10 flex flex-col pointer-events-auto relative overflow-hidden">
        {/* Logo */}
        <div className="p-8 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 bg-mint rounded-2xl flex items-center justify-center shadow-neon-mint rotate-45">
              <Sparkles className="text-obsidian -rotate-45" size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-black tracking-tighter text-white">
                CIPHER<span className="text-mint">POOL</span>
              </h1>
              <span className="text-[8px] uppercase tracking-[0.4em] font-black text-mint/50 animate-pulse">v4.0.0 Online</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          <p className="px-6 text-[8px] uppercase tracking-[0.4em] font-black text-slate-600 mb-6 mt-4">
            Tactical Units
          </p>
          {menuItems.map((item) => (
            <MenuItem 
              key={item.path} 
              item={item} 
              isActive={location.pathname === item.path} 
            />
          ))}

          {isAdmin && (
            <div className="mt-10 space-y-2">
              <p className="px-6 text-[8px] uppercase tracking-[0.4em] font-black text-slate-600 mb-6">
                System Override
              </p>
              <MenuItem 
                item={{ path: "/admin", icon: ShieldAlert, label: "Control" }} 
                isActive={location.pathname === "/admin"} 
              />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-6 mt-auto">
          <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center gap-4 mb-4 group hover:border-mint/30 transition-colors duration-500">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black text-xs shadow-neon-mint">
              {profile?.username?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">{profile?.username || "Agent"}</p>
              <p className="text-[8px] font-bold text-mint/60 uppercase tracking-widest">Level {profile?.level || 1}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full group flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:text-red-400 transition-all duration-500"
          >
            <LogOut size={20} />
            <span className="font-heading font-black text-[9px] uppercase tracking-widest">Terminate</span>
          </button>
        </div>

        {/* Interior Decor */}
        <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
      </div>
    </aside>
  );
}
