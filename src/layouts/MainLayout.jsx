import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import TopNav from "./TopNav";
import Sidebar from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";
import {
  LayoutDashboard, Trophy, BarChart3, User, Ticket,
  ShieldAlert, LogOut, Sparkles, X, Menu,
  Wallet, MessageSquare, Star, ShoppingBag, Crown, Users2,
  Newspaper, Gift, TrendingUp, Users, Zap
} from "lucide-react";

const MOBILE_BOTTOM_NAV = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Home"  },
  { path: "/tournaments", icon: Trophy,           label: "Arena" },
  { path: "/chat",        icon: MessageSquare,    label: "Chat"  },
  { path: "/store",       icon: ShoppingBag,      label: "Shop"  },
  { path: "/wallet",      icon: Wallet,           label: "Wallet"},
];

const DRAWER_NAV = [
  { path: "/dashboard",     icon: LayoutDashboard, label: "Dashboard"      },
  { path: "/tournaments",   icon: Trophy,          label: "Tournois"       },
  { path: "/leaderboard",   icon: BarChart3,       label: "Classement"     },
  { path: "/store",         icon: ShoppingBag,     label: "Boutique"       },
  { path: "/news",          icon: Newspaper,       label: "Actualités"     },
  { path: "/profile",       icon: User,            label: "Profil"         },
  { path: "/wallet",        icon: Wallet,          label: "Wallet"         },
  { path: "/stats",         icon: TrendingUp,      label: "Statistiques"   },
  { path: "/daily-rewards", icon: Gift,            label: "Récompenses"    },
  { path: "/support",       icon: Ticket,          label: "Support"        },
  { path: "/chat",          icon: MessageSquare,   label: "Chat Global"    },
  { path: "/achievements",  icon: Star,            label: "Succès"         },
  { path: "/clans",         icon: Users2,          label: "Clans"          },
  { path: "/teams",         icon: Users,           label: "Équipes"        },
  { path: "/hall-of-fame",  icon: Crown,           label: "Hall of Fame"   },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile]       = useState(null);
  const [balance, setBalance]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (prof) setProfile(prof);
    const { data: wallet } = await supabase
      .from("wallets").select("balance").eq("user_id", user.id).maybeSingle();
    setBalance(wallet?.balance || 0);
    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => { await fetchProfile(); setLoading(false); };
    init();
  }, [fetchProfile]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#080d18]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-2 border-mint/10 rounded-[1.5rem] rotate-45" />
            <div className="absolute inset-0 border-2 border-mint rounded-[1.5rem] animate-spin [animation-duration:3s]" />
            <div className="absolute inset-4 border-2 border-indigo-500/40 rounded-full animate-ping" />
          </div>
          <div className="text-center">
            <h2 className="font-heading font-black text-lg tracking-[0.15em] text-white">CIPHERPOOL</h2>
            <p className="font-mono text-[10px] tracking-[0.4em] text-mint/60 uppercase animate-pulse mt-1">Chargement...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef2f7]">

      {/* ── Desktop Sidebar (in flow) ── */}
      <Sidebar profile={profile} />

      {/* ── Right column ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Desktop TopNav (in flow, not fixed) */}
        <TopNav profile={profile} />

        {/* Mobile Header (fixed overlay) */}
        <nav className="md:hidden fixed top-0 left-0 right-0 z-[90] h-14 flex items-center px-4 border-b border-white/[0.08] bg-[#080d18]/95 backdrop-blur-xl">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors mr-2"
          >
            <Menu size={22} />
          </button>
          <span className="text-sm font-heading font-black tracking-tighter text-white flex-1">
            CIPHER<span className="text-mint">POOL</span>
          </span>
          <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-xl">
            <Wallet size={13} className="text-cyber-gold" />
            <span className="text-[10px] font-black text-white">{balance.toLocaleString()}</span>
          </Link>
        </nav>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 z-[210] md:hidden flex flex-col bg-[#080d18] border-r border-white/[0.08]"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #10b981)' }}>
                      <Sparkles className="text-white" size={14} fill="currentColor" />
                    </div>
                    <span className="text-sm font-heading font-black tracking-tighter text-white">CIPHERPOOL</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-3 space-y-0.5">
                  {DRAWER_NAV.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide transition-all ${
                          isActive ? "bg-mint/10 text-mint" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                        }`
                      }
                    >
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  ))}

                  {isAdmin && (
                    <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-0.5">
                      <p className="text-[8px] font-black uppercase tracking-[0.35em] text-slate-600 px-4 mb-2">Admin</p>
                      <NavLink to="/admin" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide text-slate-400 hover:text-orange-400 hover:bg-orange-400/[0.05] transition-all">
                        <ShieldAlert size={16} /> Admin Panel
                      </NavLink>
                      {profile?.role === "super_admin" && (
                        <NavLink to="/super-admin" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wide text-slate-400 hover:text-red-400 hover:bg-red-400/[0.05] transition-all">
                          <Zap size={16} /> Super Admin
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/[0.08]">
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-500 font-bold uppercase tracking-wide text-[12px]">
                    <LogOut size={15} /> Déconnexion
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-16 md:pb-0 bg-[#eef2f7]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet context={{ profile, refreshProfile: fetchProfile }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[150] h-14 bg-[#080d18]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-2">
          {MOBILE_BOTTOM_NAV.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-mint' : 'text-slate-500'}`}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}
