import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Trophy, BarChart3, Ticket,
  ShieldAlert, Crown, LogOut, MessageSquare,
  Users2, ShoppingBag, Wallet, Star, Newspaper,
  Zap, Layout, TrendingUp, Gift, Users, ChevronRight,
  Terminal,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* ── Section label ─────────────────────────────────────────────────── */
const Section = ({ label, children }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-1.5">{label}</p>
    {children}
  </div>
);

/* ── Sidebar link ───────────────────────────────────────────────────── */
const SidebarLink = ({ to, icon: Icon, label, isActive, badge }) => (
  <NavLink
    to={to}
    className={[
      "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl",
      "text-sm font-medium",
      "transition-all duration-200",
      isActive
        ? "bg-indigo-500/10 text-white"
        : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]",
    ].join(" ")}
  >
    {/* Active indicator bar */}
    {isActive && (
      <motion.div
        layoutId="sidebar-active-bar"
        className="absolute left-0 top-[18%] w-[2px] h-[64%] rounded-r-full bg-indigo-400"
        style={{ boxShadow: "0 0 6px rgba(99,102,241,0.6)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}

    <Icon
      size={15}
      strokeWidth={isActive ? 2 : 1.75}
      className={isActive ? "text-indigo-400 flex-shrink-0" : "flex-shrink-0"}
    />
    <span className="flex-1 truncate">{label}</span>

    {badge != null && badge > 0 && (
      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold flex items-center justify-center">
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </NavLink>
);

/* ── Main sidebar ───────────────────────────────────────────────────── */
export default function Sidebar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: "local" }); } catch (_) {}
    window.location.replace("/login");
  };

  const isFounder    = ["founder", "super_admin"].includes(profile?.role);
  const isDesigner   = ["designer", "admin", "super_admin"].includes(profile?.role);
  const isAdmin      = ["admin", "super_admin", "founder"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col h-full overflow-hidden relative" style={{ background: "#0f172a" }}>
      {/* Right border — single pixel, subtle */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/[0.06]" />

      <div className="relative flex flex-col h-full z-10">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/[0.04] flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src="/logo.png" alt="CipherPool" className="h-9 w-auto object-contain" />
          </motion.div>
        </div>

        {/* Nav scroll area */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-hide">
          <Section label="Command">
            <SidebarLink to="/dashboard"   icon={LayoutDashboard} label="Dashboard"   isActive={p === "/dashboard"} />
            <SidebarLink to="/tournaments" icon={Trophy}           label="Arena"       isActive={p.startsWith("/tournaments")} />
            <SidebarLink to="/leaderboard" icon={BarChart3}        label="Rankings"    isActive={p === "/leaderboard"} />
            <SidebarLink to="/chat"        icon={MessageSquare}    label="Global Chat" isActive={p === "/chat"} />
            <SidebarLink to="/clans"       icon={Users2}           label="Clans"       isActive={p.startsWith("/clans")} />
            <SidebarLink to="/teams"       icon={Users}            label="Teams"       isActive={p.startsWith("/teams")} />
          </Section>

          <Section label="Economy">
            <SidebarLink to="/store"  icon={ShoppingBag} label="Store"  isActive={p === "/store"} />
            <SidebarLink to="/wallet" icon={Wallet}      label="Wallet" isActive={p === "/wallet"} />
          </Section>

          <Section label="Progression">
            <SidebarLink to="/stats"         icon={TrendingUp} label="Stats"        isActive={p === "/stats"} />
            <SidebarLink to="/achievements"  icon={Star}       label="Achievements" isActive={p === "/achievements"} />
            <SidebarLink to="/daily-rewards" icon={Gift}       label="Rewards"      isActive={p === "/daily-rewards"} />
            <SidebarLink to="/hall-of-fame"  icon={Crown}      label="Hall of Fame" isActive={p === "/hall-of-fame"} />
          </Section>

          <Section label="Info">
            <SidebarLink to="/news"    icon={Newspaper} label="News"    isActive={p === "/news"} />
            <SidebarLink to="/support" icon={Ticket}    label="Support" isActive={p === "/support"} />
          </Section>

          {(isFounder || isDesigner || isAdmin) && (
            <div className="space-y-5 pt-3 border-t border-white/[0.05]">
              {isFounder && (
                <Section label="Founder">
                  <SidebarLink to="/founder"  icon={Crown}       label="Founder Hub" isActive={p.startsWith("/founder")} />
                </Section>
              )}
              {isDesigner && (
                <Section label="Design">
                  <SidebarLink to="/designer" icon={Layout}      label="Designer"    isActive={p === "/designer"} />
                </Section>
              )}
              {isAdmin && (
                <Section label="System">
                  <SidebarLink to="/admin"       icon={ShieldAlert} label="Control Panel" isActive={p.startsWith("/admin") && !p.startsWith("/super")} />
                  {isSuperAdmin && (
                    <>
                      <SidebarLink to="/super-admin"    icon={Zap}      label="Root Access"    isActive={p === "/super-admin" || p === "/super-admin/grant"} />
                      <SidebarLink to="/command-center" icon={Terminal}  label="Command Center" isActive={p === "/command-center"} />
                    </>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-white/[0.04] flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-cyber-border transition-all duration-[220ms] cursor-default"
          >
            <div
              className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile?.username?.[0]?.toUpperCase() || "U"
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/85 truncate leading-none">
                {profile?.username || "Player"}
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                Level {profile?.level || 1}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </motion.div>
        </div>
      </div>
    </aside>
  );
}
