import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Menu, X, Bell, LogOut, LayoutDashboard, Trophy, BarChart3, Users2, Shield, Newspaper, MessageSquare, ShoppingBag, Wallet as WalletIcon, Headphones } from "lucide-react";

const NAV_MAIN = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tournaments", label: "Tournois", icon: Trophy },
  { to: "/leaderboard", label: "Classement", icon: BarChart3 },
  { to: "/clans", label: "Clans", icon: Shield },
  { to: "/teams", label: "Équipes", icon: Users2 },
  { to: "/news", label: "Actualités", icon: Newspaper },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/store", label: "Boutique", icon: ShoppingBag },
  { to: "/wallet", label: "Portefeuille", icon: WalletIcon },
  { to: "/support", label: "Support", icon: Headphones },
];

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

  if (loading) return <div className="h-screen bg-[#121212] flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-screen bg-[#f4f7f9] flex flex-col md:flex-row overflow-hidden font-sans text-[#1a1a1a]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1e293b] text-white shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/5 bg-[#0f172a]">
          <span className="font-black tracking-tighter text-xl">CIPHERPOOL</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_MAIN.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden h-14 bg-[#1e293b] text-white flex items-center justify-between px-4 shrink-0">
        <button onClick={() => setMobileOpen(true)}><Menu size={24}/></button>
        <span className="font-black tracking-tighter text-lg text-white">CIPHERPOOL</span>
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px]">{profile?.full_name?.[0]}</div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-[#1e293b] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/5">
              <span className="font-black text-white">MENU</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400"><X size={24}/></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_MAIN.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-4 py-3 px-4 rounded-xl font-bold text-sm ${location.pathname === item.to ? "bg-blue-600 text-white" : "text-slate-400"}`}>
                  <item.icon size={20}/> {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7f9]">
        {/* Top Header Desktop */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
            {NAV_MAIN.find(n => n.to === location.pathname)?.label || "Platform"}
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <span className="text-blue-600 text-xs font-black tracking-tighter">{balance.toLocaleString()} CP</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600"><Bell size={20}/></button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{profile?.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{profile?.role}</p>
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={18}/></button>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet context={{ profile }} />
          </div>
        </main>
      </div>
    </div>
  );
}
