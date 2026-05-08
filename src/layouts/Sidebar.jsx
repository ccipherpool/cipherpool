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
  Users2,
  Settings,
  Bell
} from "lucide-react";
import { supabase } from "../lib/supabase";

const MenuItem = ({ item, isActive }) => {
  return (
    <NavLink
      to={item.path}
      className="relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-mint/10 border border-mint/20 rounded-xl"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      
      <div className={`relative z-10 p-1.5 rounded-lg transition-colors duration-300 ${
        isActive ? "text-mint bg-mint/10" : "text-slate-500 group-hover:text-mint group-hover:bg-mint/5"
      }`}>
        <item.icon size={20} />
      </div>
      
      <span className={`relative z-10 font-medium transition-colors duration-300 ${
        isActive ? "text-white" : "text-slate-400 group-hover:text-white"
      }`}>
        {item.label}
      </span>

      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-4"
        >
          <ChevronRight size={16} className="text-mint" />
        </motion.div>
      )}
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
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/tournaments", icon: Trophy, label: "Tournaments" },
    { path: "/leaderboard", icon: BarChart3, label: "Leaderboard" },
    { path: "/profile", icon: User, label: "My Profile" },
    { path: "/support", icon: Ticket, label: "Support" },
  ];

  const founderLinks = [
    { path: "/founder", icon: Gamepad2, label: "Founder Panel" },
    { path: "/create-tournament", icon: PlusCircle, label: "Create Tournament" },
  ];

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "fondateur" || profile?.role === "founder";
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <aside className="fixed left-0 top-0 w-72 h-screen bg-obsidian border-r border-white/5 p-6 flex flex-col z-50">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="relative w-10 h-10 bg-mint rounded-xl flex items-center justify-center overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <Sparkles className="text-obsidian relative z-10" size={24} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-black tracking-tighter text-white">
            CIPHER<span className="text-mint">POOL</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">
              System Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        <div className="space-y-1">
          <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-4">
            General
          </p>
          {menuItems.map((item) => (
            <MenuItem 
              key={item.path} 
              item={item} 
              isActive={location.pathname === item.path} 
            />
          ))}
        </div>

        {(profile?.role === "founder" || profile?.role === "fondateur") && (
          <div className="space-y-1">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-4">
              Management
            </p>
            {founderLinks.map((item) => (
              <MenuItem 
                key={item.path} 
                item={item} 
                isActive={location.pathname === item.path} 
              />
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="space-y-1">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-4">
              Administration
            </p>
            <MenuItem 
              item={{ path: "/admin", icon: ShieldAlert, label: "Admin Panel" }} 
              isActive={location.pathname === "/admin"} 
            />
            {isSuperAdmin && (
              <MenuItem 
                item={{ path: "/super-admin", icon: Crown, label: "Super Admin" }} 
                isActive={location.pathname === "/super-admin"} 
              />
            )}
          </div>
        )}
      </div>

      {/* User Quick Info & Logout */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <div className="bg-obsidian-light/50 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-bold">
            {profile?.username?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {profile?.username || profile?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] uppercase font-black text-mint/80 tracking-wider">
              {profile?.role || "Player"}
            </p>
          </div>
          <button className="p-2 text-slate-500 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300"
        >
          <div className="p-1.5 rounded-lg group-hover:bg-red-400/10 transition-colors">
            <LogOut size={20} />
          </div>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
