import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard, Trophy, BarChart3, Shield, Users2, Newspaper,
  MessageSquare, ShoppingBag, Wallet, Headphones, User, Star,
  Gift, TrendingUp, Crown, LogOut, Bell, Menu, X, ChevronLeft,
  ChevronRight, Sword, Home, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_SECTIONS = [
  {
    label: "JOUER",
    items: [
      { to: "/dashboard",    label: "Accueil",      icon: LayoutDashboard },
      { to: "/tournaments",  label: "Tournois",     icon: Trophy },
      { to: "/leaderboard",  label: "Classement",   icon: BarChart3 },
    ],
  },
  {
    label: "COMMUNAUTÉ",
    items: [
      { to: "/clans",        label: "Clans",        icon: Shield },
      { to: "/teams",        label: "Équipes",      icon: Users2 },
      { to: "/chat",         label: "Chat Global",  icon: MessageSquare },
      { to: "/hall-of-fame", label: "Hall of Fame", icon: Crown },
    ],
  },
  {
    label: "FEATURES",
    items: [
      { to: "/store",        label: "Boutique",     icon: ShoppingBag },
      { to: "/wallet",       label: "Portefeuille", icon: Wallet },
      { to: "/news",         label: "Actualités",   icon: Newspaper },
      { to: "/stats",        label: "Mes Stats",    icon: TrendingUp },
    ],
  },
  {
    label: "RÉCOMPENSES",
    items: [
      { to: "/achievements",  label: "Succès",       icon: Star },
      { to: "/daily-rewards", label: "Daily Bonus",  icon: Gift },
    ],
  },
  {
    label: "MOI",
    items: [
      { to: "/profile",  label: "Mon Profil", icon: User },
      { to: "/team",     label: "Notre Staff", icon: Users2 },
      { to: "/support",  label: "Support",    icon: Headphones },
    ],
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const [{ data: prof }, { data: wallet }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
      ]);
      setProfile(prof);
      setBalance(wallet?.balance ?? 0);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const currentPage = NAV_SECTIONS
    .flatMap(s => s.items)
    .find(n => n.to === location.pathname)?.label || "CipherPool";

  if (loading) {
    return (
      <div className="h-screen bg-[#07070f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-white/30 text-xs font-mono tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  const sidebarWidth = collapsed ? 70 : 240;

  return (
    <div className="h-screen bg-[#07070f] flex overflow-hidden text-white font-sans">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out"
        style={{ width: sidebarWidth, background: "#0c0c1a", borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                CP
              </div>
              <span className="font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black mx-auto cursor-pointer" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }} onClick={() => navigate("/dashboard")}>
              CP
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-white/30 hover:text-white transition-colors p-1">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {collapsed ? (
            <div className="space-y-1">
              {NAV_SECTIONS.flatMap(s => s.items).map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={`flex items-center justify-center w-full h-10 rounded-lg transition-all ${active ? "bg-cyan-500/15 text-cyan-400" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                  >
                    <Icon size={18} />
                  </NavLink>
                );
              })}
            </div>
          ) : (
            NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="text-[9px] font-black text-white/25 tracking-[0.2em] px-3 mb-2">{section.label}</p>
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                          ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500"
                          : "text-white/50 hover:bg-white/5 hover:text-white border-l-2 border-transparent"}`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="p-2 border-t border-white/5">
            <button onClick={() => setCollapsed(false)} className="w-full h-10 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* User card */}
        {!collapsed && (
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer" onClick={() => navigate("/profile")}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{profile?.role}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                className="text-white/20 hover:text-red-400 transition-colors p-1"
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="p-2 border-t border-white/5">
            <button onClick={handleSignOut} title="Déconnexion" className="w-full h-10 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-all">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TOP HEADER ── */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0" style={{ background: "rgba(12,12,26,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Mobile menu */}
          <button className="md:hidden text-white/50 hover:text-white transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>

          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
            <span className="font-black text-sm tracking-wider">CIPHERPOOL</span>
          </div>

          {/* Desktop page title */}
          <div className="hidden md:flex items-center gap-2">
            <Zap size={14} className="text-cyan-500" />
            <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">{currentPage}</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Balance */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-cyan-400 text-xs font-black tracking-tight">{balance.toLocaleString()} CP</span>
            </div>

            {/* Notifications */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
            </button>

            {/* Profile avatar */}
            <button onClick={() => navigate("/profile")} className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-xs font-black text-black">
                  {profile?.full_name?.[0]?.toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#07070f" }}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <Outlet context={{ profile, balance }} />
          </div>
        </main>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col md:hidden"
              style={{ background: "#0c0c1a", borderRight: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="h-14 flex items-center justify-between px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
                  <span className="font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-1"><X size={20} /></button>
              </div>

              {/* Balance on mobile */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400 text-sm font-black">{balance.toLocaleString()} CP</span>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
                {NAV_SECTIONS.map(section => (
                  <div key={section.label}>
                    <p className="text-[9px] font-black text-white/25 tracking-[0.2em] px-2 mb-1.5">{section.label}</p>
                    <div className="space-y-0.5">
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const active = location.pathname === item.to;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                          >
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black overflow-hidden" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : profile?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{profile?.role}</p>
                  </div>
                  <button onClick={handleSignOut} className="text-white/20 hover:text-red-400 transition-colors p-1">
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
