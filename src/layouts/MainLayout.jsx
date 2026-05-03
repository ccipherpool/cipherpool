import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Bell, LogOut, ChevronRight, LayoutDashboard, Trophy, BarChart3, Users2, Shield, Newspaper, MessageSquare, ShoppingBag, Wallet as WalletIcon, Medal, Gift, LineChart, Headphones } from "lucide-react";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tournaments", label: "Tournois", icon: Trophy },
  { to: "/leaderboard", label: "Classement", icon: BarChart3 },
  { to: "/clans", label: "Clans", icon: Shield },
  { to: "/teams", label: "Équipes", icon: Users2 },
  { to: "/news", label: "Actualités", icon: Newspaper },
  { to: "/chat", label: "Chat global", icon: MessageSquare },
  { to: "/store", label: "Boutique", icon: ShoppingBag },
  { to: "/wallet", label: "Portefeuille", icon: WalletIcon },
  { to: "/achievements", label: "Succès", icon: Medal },
  { to: "/daily-rewards", label: "Cadeaux", icon: Gift },
  { to: "/stats", label: "Mes Stats", icon: LineChart },
  { to: "/support", label: "Support", icon: Headphones },
];

const NAV_ADMIN = [
  { to: "/admin", label: "Administration", icon: Shield, roles: ["admin", "super_admin", "fondateur", "founder"] },
  { to: "/super-admin", label: "Super Admin", icon: Shield, roles: ["super_admin"] },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const visibleAdmin = NAV_ADMIN.filter(i => i.roles.includes(profile?.role));

  if (loading) return (
    <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen bg-[#0a0a0f] flex overflow-hidden font-sans text-white">
      {/* Sidebar for Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="hidden md:flex flex-col bg-[#0f0f1a] border-r border-white/5 relative z-20 transition-all duration-300"
      >
        <div className="h-20 flex items-center px-6 gap-3 border-b border-white/5">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-purple-500/10 shrink-0">CP</div>
          {!collapsed && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-black tracking-tighter text-xl">CIPHERPOOL</motion.span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active ? "bg-purple-600/10 text-purple-400 border border-purple-500/20" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-purple-400" : "group-hover:text-neutral-300"}`} />
                {!collapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              </NavLink>
            );
          })}

          {visibleAdmin.length > 0 && (
            <div className="pt-6">
              {!collapsed && <p className="px-4 text-[10px] font-black text-neutral-700 uppercase tracking-[0.2em] mb-4">Administration</p>}
              {visibleAdmin.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      active ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? "text-orange-400" : "group-hover:text-neutral-300"}`} />
                    {!collapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
           <button 
             onClick={() => setCollapsed(!collapsed)}
             className="w-full flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-500 transition-all"
           >
             {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><Menu size={18} /><span className="text-xs font-bold uppercase tracking-widest">Réduire</span></div>}
           </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[#0f0f1a] z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-black text-sm">CP</div>
                  <span className="font-black tracking-tighter text-lg">CIPHERPOOL</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-neutral-500"><X size={20}/></button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {NAV_MAIN.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                        active ? "bg-purple-600/10 text-purple-400 border border-purple-500/20" : "text-neutral-500"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-bold text-sm">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header */}
        <header className="h-20 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="hidden sm:block text-lg font-black tracking-tight uppercase text-neutral-400">
              {NAV_MAIN.find(n => n.to === location.pathname)?.label || "Platform"}
            </h2>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
              <span className="text-purple-400">💎</span>
              <span className="font-black text-sm md:text-base tracking-tighter">{balance.toLocaleString()}</span>
            </div>

            <button className="p-2.5 rounded-xl bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-[#0a0a0f]" />
            </button>

            <Link to="/profile" className="flex items-center gap-3 p-1 pr-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform">
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-black tracking-tight leading-none mb-1">{profile?.full_name?.split(' ')[0]}</p>
                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">{profile?.role}</p>
              </div>
            </Link>

            <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ profile }} />
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
