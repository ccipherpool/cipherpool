import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Trophy, BarChart3, MessageSquare, Users2,
  ShoppingBag, Wallet, Newspaper, Ticket, TrendingUp,
  ShieldAlert, Zap, LogOut, User, Gift, Star,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import NotificationBell from "../components/NotificationBell";
import SeasonBadge from "../components/ui/SeasonBadge";

const NAV_MAIN = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Home"    },
  { path: "/tournaments", icon: Trophy,           label: "Arena"   },
  { path: "/chat",        icon: MessageSquare,    label: "Chat"    },
  { path: "/clans",       icon: Users2,           label: "Clans"   },
  { path: "/leaderboard", icon: BarChart3,        label: "Rankings"},
];

const NAV_ICONS = [
  { path: "/store",        icon: ShoppingBag, label: "Store"       },
  { path: "/wallet",       icon: Wallet,      label: "Wallet"      },
  { path: "/daily-rewards",icon: Gift,        label: "Rewards"     },
  { path: "/achievements", icon: Star,        label: "Achievements"},
  { path: "/news",         icon: Newspaper,   label: "News"        },
  { path: "/support",      icon: Ticket,      label: "Support"     },
];

export default function TopNav({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin      = ["admin", "super_admin", "founder"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <nav
      className="hidden md:flex items-center justify-between flex-shrink-0 px-5 border-b border-slate-200 relative z-40"
      style={{ height: "52px", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)" }}
    >
      {/* Main nav */}
      <div className="flex items-center gap-0.5">
        {NAV_MAIN.map(item => {
          const active = p === item.path || (item.path !== "/dashboard" && p.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={[
                "relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
              ].join(" ")}
            >
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="topnav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-indigo-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}

        <div className="w-px h-5 bg-slate-200 mx-2" />

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
                  "p-2 rounded-xl transition-all duration-200",
                  active
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100",
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
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 hover:bg-white transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            aria-label="Profile menu"
          >
            <div
              className="w-7 h-7 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-black text-[10px]"
              style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4)" }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.username?.[0]?.toUpperCase() || "P"
              )}
            </div>
            <div className="hidden lg:flex flex-col items-start">
              <span className="text-sm font-medium text-slate-800 leading-none">
                {profile?.username || "Player"}
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                Level {profile?.level || 1}
              </span>
            </div>
          </motion.button>

          {/* Dropdown panel — stays dark for contrast */}
          <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-[110]">
            <div className="w-56 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400 mb-0.5">Signed in as</p>
                <p className="text-sm font-medium text-slate-800 truncate">{profile?.email}</p>
                {profile?.role && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 capitalize">
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              <div className="p-1.5">
                <NavLink to="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
                  <User size={14} /> Profile
                </NavLink>
                <NavLink to="/wallet"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">
                  <Wallet size={14} /> Wallet
                </NavLink>

                {isAdmin && (
                  <>
                    <div className="my-1 h-px bg-slate-100" />
                    <NavLink to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-all">
                      <ShieldAlert size={14} /> Admin Panel
                    </NavLink>
                    {isSuperAdmin && (
                      <NavLink to="/super-admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all">
                        <Zap size={14} /> Root Access
                      </NavLink>
                    )}
                  </>
                )}

                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
