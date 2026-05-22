import { Outlet, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";
import {
  LayoutDashboard, Trophy, MessageSquare,
  ShoppingBag, Wallet, Menu, X, ShieldAlert,
  Zap, Users2, BarChart3, Gift, Star, Newspaper,
  Ticket, Crown, Users, TrendingUp, LogOut, User,
} from "lucide-react";

/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────────── */
const MOBILE_BOTTOM = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Home"  },
  { path: "/tournaments", icon: Trophy,           label: "Arena" },
  { path: "/chat",        icon: MessageSquare,    label: "Chat"  },
  { path: "/store",       icon: ShoppingBag,      label: "Store" },
  { path: "/wallet",      icon: Wallet,           label: "Wallet"},
];

/* ── MOBILE DRAWER NAV ─────────────────────────────────────────────── */
const DRAWER_SECTIONS = [
  {
    label: "Main",
    items: [
      { path: "/dashboard",   icon: LayoutDashboard, label: "Dashboard"   },
      { path: "/tournaments", icon: Trophy,           label: "Tournois"    },
      { path: "/leaderboard", icon: BarChart3,        label: "Rankings"    },
      { path: "/chat",        icon: MessageSquare,    label: "Chat Global" },
      { path: "/clans",       icon: Users2,           label: "Clans"       },
      { path: "/teams",       icon: Users,            label: "Teams"       },
    ],
  },
  {
    label: "Economy",
    items: [
      { path: "/store",  icon: ShoppingBag, label: "Boutique" },
      { path: "/wallet", icon: Wallet,      label: "Wallet"   },
    ],
  },
  {
    label: "Progress",
    items: [
      { path: "/stats",         icon: TrendingUp, label: "Stats"        },
      { path: "/achievements",  icon: Star,       label: "Achievements" },
      { path: "/daily-rewards", icon: Gift,       label: "Daily Rewards"},
      { path: "/hall-of-fame",  icon: Crown,      label: "Hall of Fame" },
    ],
  },
  {
    label: "More",
    items: [
      { path: "/profile", icon: User,     label: "Profile"    },
      { path: "/news",    icon: Newspaper,label: "News"       },
      { path: "/support", icon: Ticket,   label: "Support"    },
    ],
  },
];

/* ── PAGE TRANSITION ───────────────────────────────────────────────── */
const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

/* ── LOADING SCREEN ────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[9999]">
      {/* Ambient orbs */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-[rgba(139,92,246,0.06)] blur-[100px] pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(16,185,129,0.04)] blur-[80px] pointer-events-none translate-x-32 translate-y-16" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-8"
      >
        {/* Animated cipher icon */}
        <div className="relative w-16 h-16">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-2xl border border-cyber-border"
            style={{ transform: "rotate(45deg)" }} />
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-2xl border border-[rgba(139,92,246,0.5)]"
            style={{ transform: "rotate(45deg)", animation: "cp-orbit 2.5s linear infinite" }} />
          {/* Inner pulse */}
          <div className="absolute inset-3 rounded-xl bg-cyber-dim flex items-center justify-center"
            style={{ animation: "cp-pulse-glow 2s ease-in-out infinite" }}>
            <Zap size={16} className="text-cyber-400" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="font-heading font-black text-base tracking-[0.2em] text-white">
            CIPHERPOOL
          </h2>
          <p className="font-mono text-[9px] tracking-[0.5em] text-[rgba(16,185,129,0.5)] uppercase mt-2"
            style={{ animation: "cp-pulse-glow 1.5s ease-in-out infinite" }}>
            Initializing...
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-40 h-[2px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyber-500 to-neon-cyan rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ── MOBILE DRAWER ─────────────────────────────────────────────────── */
function MobileDrawer({ open, onClose, profile }) {
  const isAdmin      = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  const handleLogout = async () => {
    onClose();
    await supabase.auth.signOut();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[rgba(2,6,23,0.85)] backdrop-blur-md z-[200] md:hidden"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] z-[210] md:hidden flex flex-col bg-[#07091a] overflow-hidden"
          >
            {/* Left gradient accent */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[rgba(139,92,246,0.8)] via-[rgba(6,182,212,0.4)] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
              <img src="/logo.png" alt="CipherPool" className="h-8 w-auto object-contain" />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
                aria-label="Close menu"
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Profile chip */}
            {profile && (
              <div className="mx-4 mt-4 flex items-center gap-3 px-3 py-3 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <div
                  className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-black text-sm"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : profile.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{profile.username}</p>
                  <p className="text-[9px] text-[rgba(16,185,129,0.7)] font-bold">Lvl {profile.level || 1}</p>
                </div>
              </div>
            )}

            {/* Nav sections */}
            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-5 scrollbar-hide">
              {DRAWER_SECTIONS.map(section => (
                <div key={section.label} className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-[rgba(255,255,255,0.2)] px-3 mb-2">
                    {section.label}
                  </p>
                  {section.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 px-3 py-3 rounded-xl",
                          "text-[11px] font-black uppercase tracking-[0.08em]",
                          "transition-all duration-[220ms] min-h-[44px]",
                          isActive
                            ? "bg-cyber-dim text-white"
                            : "text-[rgba(255,255,255,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={15} strokeWidth={isActive ? 2.5 : 2}
                            className={isActive ? "text-cyber-400" : ""} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}

              {/* Admin section */}
              {isAdmin && (
                <div className="space-y-0.5 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-[rgba(255,255,255,0.2)] px-3 mb-2">
                    System
                  </p>
                  <NavLink
                    to="/admin"
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)] hover:text-orange-400 hover:bg-orange-400/5 transition-all min-h-[44px]"
                  >
                    <ShieldAlert size={15} /> Control Panel
                  </NavLink>
                  {isSuperAdmin && (
                    <NavLink
                      to="/super-admin"
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)] hover:text-red-400 hover:bg-red-400/5 transition-all min-h-[44px]"
                    >
                      <Zap size={15} /> Root Access
                    </NavLink>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.05)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl bg-[rgba(239,68,68,0.08)] text-red-400 border border-[rgba(239,68,68,0.15)] font-black uppercase tracking-[0.12em] text-[10px] hover:bg-[rgba(239,68,68,0.14)] transition-all active:scale-[0.97]"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── MAIN LAYOUT ────────────────────────────────────────────────────── */
export default function MainLayout() {
  const location = useLocation();
  const {
    profile, balance, wallet, userItems, equippedItems,
    loading, refreshCurrentUser, refreshEconomyData,
  } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchProfile = useCallback(() => refreshCurrentUser(), [refreshCurrentUser]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#020617]">

      {/* ── MOBILE HEADER ────────────────────────────────────────────── */}
      <header className="md:hidden flex-shrink-0 z-50 relative">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-border to-transparent" />

        <div className="h-14 flex items-center px-4 bg-[rgba(7,9,26,0.95)] backdrop-blur-[24px] border-b border-[rgba(255,255,255,0.05)]">
          {/* Menu button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all -ml-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </motion.button>

          {/* Logo — centered */}
          <div className="flex-1 flex justify-center">
            <Link to="/dashboard">
              <img src="/logo.png" alt="CipherPool" className="h-8 w-auto object-contain" />
            </Link>
          </div>

          {/* Balance pill */}
          <Link to="/wallet">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.12)] transition-all"
            >
              <span className="text-[10px]">💎</span>
              <span className="text-[10px] font-black text-white font-mono">
                {(balance || 0).toLocaleString()}
              </span>
            </motion.div>
          </Link>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop Sidebar */}
        <Sidebar profile={profile} />

        {/* Main column */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Desktop TopNav */}
          <TopNav profile={profile} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] cp-scroll-container">
            {/* Ambient gradient at top of content area */}
            <div className="pointer-events-none fixed top-[52px] left-1/4 w-1/2 h-[300px] bg-[rgba(139,92,246,0.03)] blur-[80px] rounded-full z-0" />

            <div className="max-w-7xl w-full mx-auto px-4 md:px-7 py-5 md:py-7 min-w-0 pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={PAGE_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Outlet context={{
                    profile,
                    balance,
                    wallet,
                    userItems,
                    equippedItems,
                    refreshProfile: fetchProfile,
                    refreshCurrentUser,
                    refreshEconomyData,
                  }} />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
      <nav
        className="md:hidden flex-shrink-0 z-50 relative"
        style={{
          background: "rgba(7, 9, 26, 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-border to-transparent" />

        <div className="flex items-center justify-around px-2 h-14">
          {MOBILE_BOTTOM.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-1 py-1 px-3 min-w-[44px] min-h-[44px] justify-center transition-all active:scale-[0.92] duration-[120ms]"
                aria-label={item.label}
              >
                <motion.div
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? "text-cyber-400" : "text-[rgba(255,255,255,0.35)]"}
                    style={isActive ? { filter: "drop-shadow(0 0 6px rgba(139,92,246,0.7))" } : {}}
                  />
                </motion.div>
                <span
                  className={[
                    "text-[7px] font-black uppercase tracking-[0.1em] leading-none",
                    isActive ? "text-cyber-400" : "text-[rgba(255,255,255,0.25)]",
                  ].join(" ")}
                >
                  {item.label}
                </span>
                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-dot"
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyber-500"
                    style={{ boxShadow: "0 0 6px rgba(139,92,246,0.8)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── MOBILE DRAWER ────────────────────────────────────────────── */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={profile}
      />

      {/* Modals */}
      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}
