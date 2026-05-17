import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Trophy, BarChart3, Ticket,
  ShieldAlert, Crown, LogOut, MessageSquare,
  Users2, ShoppingBag, Wallet, Star, Newspaper,
  Zap, Layout, TrendingUp, Gift, Users, ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* ── SECTION HEADER ────────────────────────────────────────────────── */
const Section = ({ label, children }) => (
  <div className="space-y-0.5">
    <div className="cp-section-label px-3 mb-2">
      <span>{label}</span>
    </div>
    {children}
  </div>
);

/* ── SIDEBAR LINK ───────────────────────────────────────────────────── */
const SidebarLink = ({ to, icon: Icon, label, isActive, badge }) => (
  <NavLink
    to={to}
    className={[
      "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl",
      "text-[10px] font-black uppercase tracking-[0.12em]",
      "transition-all duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
      "overflow-hidden",
      isActive
        ? "bg-[rgba(99,102,241,0.1)] text-white"
        : "text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.04)]",
    ].join(" ")}
  >
    {/* Active left bar */}
    {isActive && (
      <motion.div
        layoutId="sidebar-active-bar"
        className="absolute left-0 top-1/4 w-[3px] h-1/2 rounded-r-full bg-cp-indigo"
        style={{ boxShadow: "0 0 8px rgba(99,102,241,0.8)" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}

    {/* Hover shimmer */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </div>

    <Icon
      size={14}
      strokeWidth={isActive ? 2.5 : 2}
      className={isActive ? "text-cp-indigo flex-shrink-0" : "flex-shrink-0 transition-colors duration-[220ms]"}
    />
    <span className="flex-1 truncate">{label}</span>

    {badge != null && (
      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-cp-indigo/20 text-cp-indigo border border-cp-indigo/30 text-[8px] font-black flex items-center justify-center leading-none">
        {badge > 99 ? "99+" : badge}
      </span>
    )}

    {isActive && (
      <ChevronRight size={10} className="text-cp-indigo/50 flex-shrink-0 ml-auto" />
    )}
  </NavLink>
);

/* ── MAIN SIDEBAR ───────────────────────────────────────────────────── */
export default function Sidebar({ profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const p = location.pathname;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isFounder  = ["founder", "fondateur", "super_admin"].includes(profile?.role);
  const isDesigner = ["designer", "admin", "super_admin"].includes(profile?.role);
  const isAdmin    = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col h-full overflow-hidden relative">
      {/* Gradient border right */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(99,102,241,0.15)] to-transparent" />

      {/* Background with noise */}
      <div className="absolute inset-0 bg-[#07091a]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')] opacity-[0.025] pointer-events-none" />

      <div className="relative flex flex-col h-full z-10">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
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
            <SidebarLink to="/stats"         icon={TrendingUp} label="Stats"       isActive={p === "/stats"} />
            <SidebarLink to="/achievements"  icon={Star}       label="Achievements" isActive={p === "/achievements"} />
            <SidebarLink to="/daily-rewards" icon={Gift}       label="Rewards"     isActive={p === "/daily-rewards"} />
            <SidebarLink to="/hall-of-fame"  icon={Crown}      label="Hall of Fame" isActive={p === "/hall-of-fame"} />
          </Section>

          <Section label="Info">
            <SidebarLink to="/news"    icon={Newspaper} label="News"    isActive={p === "/news"} />
            <SidebarLink to="/support" icon={Ticket}    label="Support" isActive={p === "/support"} />
          </Section>

          {(isFounder || isDesigner || isAdmin) && (
            <div className="space-y-5 pt-3 border-t border-[rgba(255,255,255,0.04)]">
              {isFounder && (
                <Section label="Founder">
                  <SidebarLink to="/founder"   icon={Crown}       label="Founder Hub" isActive={p.startsWith("/founder")} />
                </Section>
              )}
              {isDesigner && (
                <Section label="Design">
                  <SidebarLink to="/designer" icon={Layout} label="Designer" isActive={p === "/designer"} />
                </Section>
              )}
              {isAdmin && (
                <Section label="System">
                  <SidebarLink to="/admin" icon={ShieldAlert} label="Control Panel" isActive={p.startsWith("/admin")} />
                  {isSuperAdmin && (
                    <SidebarLink to="/super-admin" icon={Zap} label="Root Access" isActive={p.startsWith("/super-admin")} />
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.04)] flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all duration-[220ms] cursor-default"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-black text-[11px]"
              style={{ background: "linear-gradient(135deg, #6366f1, #10b981)" }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.username?.[0]?.toUpperCase() || "U"
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-wider truncate leading-none">
                {profile?.username || "Player"}
              </p>
              <p className="text-[8px] text-[rgba(16,185,129,0.7)] font-bold mt-0.5 uppercase tracking-wider">
                Lvl {profile?.level || 1}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[rgba(255,255,255,0.2)] hover:text-red-400 hover:bg-red-400/10 transition-all duration-[220ms] opacity-0 group-hover:opacity-100 flex-shrink-0"
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
