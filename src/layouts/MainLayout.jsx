import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard, Trophy, BarChart3, Shield, Users2, Newspaper,
  MessageSquare, ShoppingBag, Wallet, Headphones, User, Star,
  Gift, TrendingUp, Crown, LogOut, Bell, Menu, X, Zap,
  ChevronDown, Settings, Plus, Sword,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Nav definitions ────────────────────────────────────────────── */
const PRIMARY_NAV = [
  { to: "/dashboard",    label: "Accueil",    icon: LayoutDashboard },
  { to: "/tournaments",  label: "Tournois",   icon: Trophy },
  { to: "/leaderboard",  label: "Classement", icon: BarChart3 },
  { to: "/clans",        label: "Clans",      icon: Shield },
  { to: "/store",        label: "Boutique",   icon: ShoppingBag },
  { to: "/news",         label: "Actualités", icon: Newspaper },
];

const MORE_NAV = [
  { to: "/teams",        label: "Équipes",     icon: Users2 },
  { to: "/chat",         label: "Chat Global", icon: MessageSquare },
  { to: "/hall-of-fame", label: "Hall of Fame",icon: Crown },
  { to: "/wallet",       label: "Portefeuille",icon: Wallet },
  { to: "/stats",        label: "Mes Stats",   icon: TrendingUp },
];

const USER_NAV = [
  { to: "/profile",       label: "Mon Profil",  icon: User },
  { to: "/achievements",  label: "Succès",      icon: Star },
  { to: "/daily-rewards", label: "Daily Bonus", icon: Gift },
  { to: "/support",       label: "Support",     icon: Headphones },
  { to: "/team",          label: "Notre Staff", icon: Users2 },
];

const ADMIN_NAV = {
  super_admin: [
    { to: "/super-admin",       label: "Super Admin",     icon: Crown },
    { to: "/super-admin/grant", label: "Gérer Coins",     icon: Wallet },
    { to: "/founder",           label: "Dashboard Found.", icon: LayoutDashboard },
    { to: "/founder/requests",  label: "Demandes",        icon: Users2 },
    { to: "/create-tournament", label: "Créer Tournoi",   icon: Plus },
    { to: "/admin",             label: "Admin Panel",     icon: Shield },
    { to: "/admin/support",     label: "Support Admin",   icon: Headphones },
    { to: "/admin/results",     label: "Résultats",       icon: BarChart3 },
    { to: "/admin/news",        label: "News Admin",      icon: Newspaper },
    { to: "/admin-store",       label: "Store Admin",     icon: ShoppingBag },
    { to: "/designer",          label: "Designer Panel",  icon: Star },
  ],
  founder: [
    { to: "/founder",           label: "Dashboard",       icon: LayoutDashboard },
    { to: "/founder/requests",  label: "Demandes",        icon: Users2 },
    { to: "/create-tournament", label: "Créer Tournoi",   icon: Plus },
    { to: "/admin/results",     label: "Résultats",       icon: BarChart3 },
    { to: "/admin/news",        label: "News Admin",      icon: Newspaper },
  ],
  fondateur: [
    { to: "/founder",           label: "Dashboard",       icon: LayoutDashboard },
    { to: "/founder/requests",  label: "Demandes",        icon: Users2 },
    { to: "/create-tournament", label: "Créer Tournoi",   icon: Plus },
    { to: "/admin/results",     label: "Résultats",       icon: BarChart3 },
  ],
  admin: [
    { to: "/admin",             label: "Admin Panel",     icon: Shield },
    { to: "/admin/support",     label: "Support Admin",   icon: Headphones },
    { to: "/admin/results",     label: "Résultats",       icon: BarChart3 },
    { to: "/admin/news",        label: "News Admin",      icon: Newspaper },
    { to: "/admin-store",       label: "Store Admin",     icon: ShoppingBag },
  ],
  designer: [
    { to: "/designer",          label: "Designer Panel",  icon: Star },
    { to: "/admin-store",       label: "Store Panel",     icon: ShoppingBag },
  ],
};

const ALL_NAV = [...PRIMARY_NAV, ...MORE_NAV, ...USER_NAV];

/* ─── Dropdown ───────────────────────────────────────────────────── */
function Dropdown({ trigger, children, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(o => !o)}>{trigger(open)}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15, ease: [.22, 1, .36, 1] }}
            onClick={() => setOpen(false)}
            className={`absolute top-full mt-2 z-50 rounded-xl overflow-hidden min-w-[190px] ${align === "right" ? "right-0" : "left-0"}`}
            style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownLink({ to, icon: Icon, label, accent = "#06b6d4" }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <NavLink to={to}
      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
      style={{ color: active ? accent : "rgba(255,255,255,0.55)", background: active ? `${accent}10` : "transparent" }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}>
      {Icon && <Icon size={14} style={{ color: active ? accent : "rgba(255,255,255,0.35)" }} />}
      {label}
    </NavLink>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  if (loading) return (
    <div className="h-screen bg-[#07070f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-white/30 text-xs font-mono tracking-widest uppercase">Loading...</p>
      </div>
    </div>
  );

  const role = profile?.role;
  const adminLinks = ADMIN_NAV[role] || [];
  const isAdmin = adminLinks.length > 0;
  const initials = profile?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: "#07070f" }}>

      {/* ════════════════ TOP NAVBAR ════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14"
        style={{ background: "rgba(7,7,15,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between px-4 md:px-6 gap-4">

          {/* LEFT: Logo + Nav */}
          <div className="flex items-center gap-1 min-w-0">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black shrink-0"
                style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
              <span className="hidden lg:block font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
            </Link>

            {/* Primary nav — desktop */}
            <nav className="hidden md:flex items-center gap-0.5">
              {PRIMARY_NAV.map(item => {
                const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                    style={{ color: active ? "#06b6d4" : "rgba(255,255,255,0.5)", background: active ? "rgba(6,182,212,0.08)" : "transparent" }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "transparent"; } }}>
                    <Icon size={14} />
                    {item.label}
                  </NavLink>
                );
              })}

              {/* More dropdown */}
              <Dropdown trigger={open => (
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{ color: "rgba(255,255,255,0.45)", background: open ? "rgba(255,255,255,0.05)" : "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { if (!open) { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "transparent"; } }}>
                  Plus <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              )}>
                <div className="py-1.5">
                  {MORE_NAV.map(item => <DropdownLink key={item.to} {...item} />)}
                </div>
              </Dropdown>
            </nav>
          </div>

          {/* RIGHT: Balance + Admin + Bell + Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.18)" }}
              onClick={() => navigate("/wallet")}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 text-xs font-black tracking-tight">{balance.toLocaleString()} CP</span>
            </div>

            {/* Admin dropdown */}
            {isAdmin && (
              <Dropdown align="right" trigger={open => (
                <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-black font-mono tracking-wider transition-all"
                  style={{ background: open ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
                  <Settings size={12} /> ADMIN <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              )}>
                <div className="py-1.5">
                  <p className="text-[9px] font-black text-white/25 px-4 py-1.5 uppercase tracking-widest">Panneau Admin</p>
                  {adminLinks.map(item => <DropdownLink key={item.to} {...item} accent="#f97316" />)}
                </div>
              </Dropdown>
            )}

            {/* Create tournament shortcut (founders only) */}
            {(role === "founder" || role === "fondateur" || role === "super_admin") && (
              <button onClick={() => navigate("/create-tournament")}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-black text-black transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#06b6d4,#0891b2)" }}>
                <Plus size={12} /> Créer
              </button>
            )}

            {/* Notifications */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
            </button>

            {/* Avatar dropdown */}
            <Dropdown align="right" trigger={() => (
              <button className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ring-transparent hover:ring-cyan-500/40 transition-all"
                style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="flex items-center justify-center w-full h-full text-xs font-black text-black">{initials}</span>}
              </button>
            )}>
              <div>
                {/* User info */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-sm font-bold text-white truncate">{profile?.full_name}</p>
                  <p className="text-[11px] text-white/35 uppercase tracking-wider font-mono">{profile?.role}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-[11px] text-cyan-400 font-bold">{balance.toLocaleString()} CP</span>
                  </div>
                </div>
                {/* Links */}
                <div className="py-1.5">
                  {USER_NAV.map(item => <DropdownLink key={item.to} {...item} />)}
                </div>
                {/* Logout */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="py-1.5">
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
                    style={{ color: "rgba(244,63,94,0.7)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.08)"; e.currentTarget.style.color = "#f43f5e"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(244,63,94,0.7)"; }}>
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              </div>
            </Dropdown>

            {/* Mobile hamburger */}
            <button className="md:hidden text-white/50 hover:text-white transition-colors" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════ CONTENT ════════════════ */}
      <main className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Outlet context={{ profile, balance }} />
        </div>
      </main>

      {/* ════════════════ MOBILE DRAWER ════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)} />
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col md:hidden overflow-y-auto"
              style={{ background: "#0c0c1a", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

              {/* Header */}
              <div className="h-14 flex items-center justify-between px-5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-black" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>CP</div>
                  <span className="font-black text-sm tracking-wider text-white">CIPHERPOOL</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-1"><X size={20} /></button>
              </div>

              {/* Balance */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-sm font-black">{balance.toLocaleString()} CP</span>
                </div>
              </div>

              {/* Nav sections */}
              <nav className="flex-1 py-4 px-3 space-y-1">
                {/* Primary */}
                <p className="text-[9px] font-black text-white/25 tracking-[0.2em] px-2 mb-2">JOUER</p>
                {PRIMARY_NAV.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-cyan-500/10 text-cyan-400" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  );
                })}
                <p className="text-[9px] font-black text-white/25 tracking-[0.2em] px-2 mt-4 mb-2">PLUS</p>
                {MORE_NAV.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-cyan-500/10 text-cyan-400" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  );
                })}
                <p className="text-[9px] font-black text-white/25 tracking-[0.2em] px-2 mt-4 mb-2">MOI</p>
                {USER_NAV.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-cyan-500/10 text-cyan-400" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                      <Icon size={16} />
                      {item.label}
                    </NavLink>
                  );
                })}
                {/* Admin section */}
                {isAdmin && (
                  <>
                    <p className="text-[9px] font-black text-orange-500/60 tracking-[0.2em] px-2 mt-4 mb-2">⚡ ADMIN</p>
                    {adminLinks.map(item => {
                      const Icon = item.icon;
                      const active = location.pathname === item.to;
                      return (
                        <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-orange-500/10 text-orange-400" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                          <Icon size={16} />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </>
                )}
              </nav>

              {/* User card */}
              <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black overflow-hidden shrink-0" style={{ background: "linear-gradient(135deg,#06b6d4,#f97316)" }}>
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{profile?.full_name}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{profile?.role}</p>
                  </div>
                  <button onClick={handleSignOut} className="text-white/20 hover:text-red-400 transition-colors p-1"><LogOut size={14} /></button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
