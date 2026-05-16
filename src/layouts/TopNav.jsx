import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Trophy, BarChart3, MessageSquare, Users2,
  ShoppingBag, Wallet, Newspaper, Ticket, TrendingUp,
  ShieldAlert, Zap, LogOut, User
} from "lucide-react";
import { supabase } from "../lib/supabase";
import ThemeToggle from "../components/ui/ThemeToggle";
import NotificationBell from "../components/NotificationBell";
import SeasonBadge from "../components/ui/SeasonBadge";

const NavItem = ({ item, isActive }) => (
  <NavLink
    to={item.path}
    className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 group text-[11px] font-black uppercase tracking-widest ${
      isActive
        ? 'text-mint bg-mint/[0.10]'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
    }`}
  >
    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
    <span>{item.label}</span>
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
    <nav className="h-14 bg-[#080d18]/90 backdrop-blur-xl border-b border-white/[0.06] px-6 hidden md:flex items-center justify-between flex-shrink-0">
      {/* Empty left spacer (brand is in sidebar) */}
      <div className="w-4" />

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
      <div className="flex items-center gap-4 lg:gap-6 min-w-[240px] justify-end">
        <div className="hidden lg:block">
           <SeasonBadge />
        </div>

        <ThemeToggle variant="icon" buttonSize={32} />
        
        <NotificationBell userId={profile?.id} />

        <div className="relative group">
           <button className="flex items-center gap-3 pl-2 pr-1 py-1.5 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/20 transition-all">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black text-xs shadow-neon-mint overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.username?.[0]?.toUpperCase() || 'P'
                )}
              </div>
              <div className="text-left hidden lg:block pr-4">
                 <p className="text-[9px] font-black text-white uppercase tracking-widest">{profile?.username || "Agent"}</p>
                 <p className="text-[8px] font-bold text-mint/60 uppercase">Lvl {profile?.level || 1}</p>
              </div>
           </button>

           {/* Hover Menu */}
           <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[110]">
              <div className="w-56 bg-[#080d18] border border-white/[0.08] rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
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
