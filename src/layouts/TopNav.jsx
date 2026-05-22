import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Trophy, BarChart3, MessageSquare, Users2,
  ShoppingBag, Wallet, Newspaper, Ticket, TrendingUp,
  ShieldAlert, Zap, LogOut, User, Gift, Star,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import NotificationBell from "../components/NotificationBell";
import SeasonBadge from "../components/ui/SeasonBadge";

const NAV_MAIN = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Command" },
  { path: "/tournaments", icon: Trophy,           label: "Arena"   },
  { path: "/chat",        icon: MessageSquare,    label: "Chat"    },
  { path: "/clans",       icon: Users2,           label: "Clans"   },
  { path: "/leaderboard", icon: BarChart3,        label: "Rankings"},
];

const NAV_ICONS = [
  { path: "/store",        icon: ShoppingBag, label: "Store"    },
  { path: "/wallet",       icon: Wallet,      label: "Wallet"   },
  { path: "/daily-rewards",icon: Gift,        label: "Rewards"  },
  { path: "/achievements", icon: Star,        label: "Achievements"},
  { path: "/news",         icon: Newspaper,   label: "News"     },
  { path: "/support",      icon: Ticket,      label: "Support"  },
];

export default function TopNav({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin      = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <nav className="h-13 bg-cp-s1/92 backdrop-blur-[24px] border-b border-white/[0.05] px-5 hidden md:flex items-center justify-between flex-shrink-0 relative z-40" style={{ height: "52px" }}>
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-border to-transparent pointer-events-none" />

      {/* Main nav items */}
      <div className="flex items-center gap-1">
        {NAV_MAIN.map(item => {
          const active = p === item.path || (item.path !== "/dashboard" && p.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={[
                "relative flex items-center gap-2 px-3 py-1.5 rounded-xl",
                "text-[10px] font-black uppercase tracking-[0.1em]",
                "transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                active
                  ? "text-white bg-cyber-dim"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="topnav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyber-500"
                  style={{ boxShadow: "0 0 6px rgba(139,92,246,0.8)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}

        <div className="w-px h-5 bg-[rgba(255,255,255,0.06)] mx-2" />

        <div className="flex items-center gap-0.5">
          {NAV_ICONS.map(item => {
            const active = p === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                aria-label={item.label}
                className={[
                  "p-2 rounded-xl transition-all duration-[220ms]",
                  active
                    ? "text-cyber-400 bg-cyber-dim"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <item.icon size={15} />
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:block">
          <SeasonBadge />
        </div>

        <NotificationBell userId={profile?.id} />

        {/* Profile dropdown */}
        <div className="relative group">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-2xl hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.07)] transition-all duration-[220ms] outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            aria-label="Profile menu"
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-black text-[10px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.username?.[0]?.toUpperCase() || "P"
              )}
            </div>

            <div className="hidden lg:flex flex-col items-start">
              <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                {profile?.username || "Agent"}
              </span>
              <span className="text-[7px] font-bold text-[rgba(16,185,129,0.7)] uppercase tracking-wider mt-0.5">
                Lvl {profile?.level || 1}
              </span>
            </div>
          </motion.button>

          {/* Dropdown panel */}
          <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-[110]">
            <div className="w-56 bg-[#0d1220] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-[24px] overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.05)]">
                <p className="text-[8px] font-black text-[rgba(255,255,255,0.25)] uppercase tracking-[0.3em] mb-1">Logged in as</p>
                <p className="text-[11px] font-bold text-white truncate">{profile?.email}</p>
                {profile?.role && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-cyber-dim text-cyber-400 border border-cyber-border">
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              <div className="p-1.5">
                <NavLink
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all duration-[220ms]"
                >
                  <User size={13} />
                  <span>Profile</span>
                </NavLink>

                <NavLink
                  to="/wallet"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all duration-[220ms]"
                >
                  <Wallet size={13} />
                  <span>Wallet</span>
                </NavLink>

                {isAdmin && (
                  <>
                    <div className="my-1 h-px bg-[rgba(255,255,255,0.05)]" />
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.45)] hover:text-orange-400 hover:bg-orange-400/5 transition-all duration-[220ms]"
                    >
                      <ShieldAlert size={13} />
                      <span>Admin Panel</span>
                    </NavLink>
                    {isSuperAdmin && (
                      <NavLink
                        to="/super-admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[rgba(255,255,255,0.45)] hover:text-red-400 hover:bg-red-400/5 transition-all duration-[220ms]"
                      >
                        <Zap size={13} />
                        <span>Root Access</span>
                      </NavLink>
                    )}
                  </>
                )}

                <div className="my-1 h-px bg-[rgba(255,255,255,0.05)]" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all duration-[220ms]"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
