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
    try { await supabase.auth.signOut({ scope: "local" }); } catch (_) {}
    window.location.replace("/login");
  };

  const isAdmin      = ["admin", "super_admin", "founder"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <nav
      className="cp-topnav hidden md:flex items-center justify-between flex-shrink-0 px-5 relative z-40"
      style={{ height: "58px" }}
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
                  ? "text-cyan-100 bg-cyan-300/10"
                  : "text-white/46 hover:text-white hover:bg-white/[0.07]",
              ].join(" ")}
            >
              <item.icon size={13} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="topnav-active"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-cyan-300"
                  style={{ boxShadow: "0 0 10px rgba(34,211,238,0.9)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}

        <div className="w-px h-5 bg-white/10 mx-2" />

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
                    ? "text-cyan-200 bg-cyan-300/10"
                    : "text-white/38 hover:text-white hover:bg-white/[0.07]",
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
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 cp-profile-trigger rounded-2xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40"
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
                <span className="text-sm font-medium text-white/90 leading-none">
                {profile?.username || "Player"}
              </span>
                <span className="text-xs text-white/38 mt-0.5">
                Level {profile?.level || 1}
              </span>
            </div>
          </motion.button>

          {/* Dropdown panel — stays dark for contrast */}
          <div className="absolute right-0 top-full pt-2 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-[110]">
            <div className="w-56 cp-dropdown-panel rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                <p className="text-xs text-white/35 mb-0.5">Signed in as</p>
                <p className="text-sm font-medium text-white/85 truncate">{profile?.email}</p>
                {profile?.role && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-300/10 text-cyan-200 border border-cyan-300/15 capitalize">
                    {profile.role.replace("_", " ")}
                  </span>
                )}
              </div>

              <div className="p-1.5">
                <NavLink to="/profile"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.06] transition-all">
                  <User size={14} /> Profile
                </NavLink>
                <NavLink to="/wallet"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/[0.06] transition-all">
                  <Wallet size={14} /> Wallet
                </NavLink>

                {isAdmin && (
                  <>
                    <div className="my-1 h-px bg-white/10" />
                    <NavLink to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-orange-300 hover:bg-orange-400/10 transition-all">
                      <ShieldAlert size={14} /> Admin Panel
                    </NavLink>
                    {isSuperAdmin && (
                      <NavLink to="/super-admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/55 hover:text-red-300 hover:bg-red-400/10 transition-all">
                        <Zap size={14} /> Root Access
                      </NavLink>
                    )}
                  </>
                )}

                <div className="my-1 h-px bg-white/10" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/45 hover:text-red-300 hover:bg-red-400/10 transition-all"
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
