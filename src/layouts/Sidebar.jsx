import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Trophy, BarChart3, Ticket,
  ShieldAlert, Crown, LogOut, MessageSquare,
  Users2, ShoppingBag, Wallet, Star, Newspaper,
  Zap, Layout, TrendingUp, Gift, Users, ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* ── Section label ─────────────────────────────────────────────────── */
const Section = ({ label, children }) => (
  <div className="space-y-0.5">
    <p className="text-[8px] font-black uppercase tracking-[0.38em] text-white/20 px-3 mb-2">{label}</p>
    {children}
  </div>
);

/* ── Sidebar link ───────────────────────────────────────────────────── */
const SidebarLink = ({ to, icon: Icon, label, isActive, badge }) => (
  <NavLink
    to={to}
    className={[
      "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden",
      "text-[10px] font-black uppercase tracking-[0.12em]",
      "transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
      isActive
        ? "bg-cyber-dim text-white"
        : "text-white/30 hover:text-white/75 hover:bg-white/[0.04]",
    ].join(" ")}
  >
    {/* Active indicator bar */}
    {isActive && (
      <motion.div
        layoutId="sidebar-active-bar"
        className="absolute left-0 top-[20%] w-[3px] h-[60%] rounded-r-full bg-cyber-500"
        style={{ boxShadow: "0 0 8px rgba(139,92,246,0.8)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}

    <Icon
      size={14}
      strokeWidth={isActive ? 2.5 : 2}
      className={isActive ? "text-cyber-400 flex-shrink-0" : "flex-shrink-0 transition-colors"}
    />
    <span className="flex-1 truncate">{label}</span>

    {badge != null && badge > 0 && (
      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-cyber-dim text-cyber-400 border border-cyber-border text-[8px] font-black flex items-center justify-center">
        {badge > 99 ? "99+" : badge}
      </span>
    )}
    {isActive && <ChevronRight size={10} className="text-cyber-400/50 flex-shrink-0" />}
  </NavLink>
);

/* ── Main sidebar ───────────────────────────────────────────────────── */
export default function Sidebar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isFounder    = ["founder", "fondateur", "super_admin"].includes(profile?.role);
  const isDesigner   = ["designer", "admin", "super_admin"].includes(profile?.role);
  const isAdmin      = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col h-full overflow-hidden relative">
      {/* Right gradient border */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyber-border to-transparent" />

      {/* Background */}
      <div className="absolute inset-0 bg-cp-s1" />
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-cyber-grid-sm opacity-40 pointer-events-none" />
      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyber-border to-transparent" />

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
                    <SidebarLink to="/super-admin" icon={Zap}        label="Root Access"   isActive={p.startsWith("/super-admin")} />
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
              className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-black text-[11px]"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile?.username?.[0]?.toUpperCase() || "U"
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-wider truncate leading-none">
                {profile?.username || "Player"}
              </p>
              <p className="text-[8px] text-mint/70 font-bold mt-0.5 uppercase tracking-wider">
                Lvl {profile?.level || 1}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all duration-[220ms] opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={13} />
            </button>
          </motion.div>
        </div>
      </div>
    </aside>
  );
}
