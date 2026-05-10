import { Outlet, useNavigate, useLocation, NavLink, Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import AnnouncementModal from "../components/AnnouncementModal";
import TermsModal from "../components/TermsModal";
import LiquidCursor from "../components/ui/LiquidCursor";
import { BackgroundBeams } from "../components/ui/BackgroundBeams";
import {
  LayoutDashboard, Trophy, BarChart3, User, Ticket,
  ShieldAlert, LogOut, Sparkles, X, Menu,
  Wallet, MessageSquare, Star, ShoppingBag, Crown, Users2,
  Newspaper, Gift, TrendingUp, Users
} from "lucide-react";

const MOBILE_BOTTOM_NAV = [
  { path: "/dashboard",   icon: LayoutDashboard, label: "Home"      },
  { path: "/tournaments", icon: Trophy,           label: "Tournois"  },
  { path: "/leaderboard", icon: BarChart3,        label: "Top"       },
  { path: "/store",       icon: ShoppingBag,      label: "Boutique"  },
  { path: "/profile",     icon: User,             label: "Profil"    },
];

const DRAWER_NAV = [
  { path: "/dashboard",     icon: LayoutDashboard, label: "Dashboard"    },
  { path: "/tournaments",   icon: Trophy,          label: "Tournois"     },
  { path: "/leaderboard",   icon: BarChart3,       label: "Classement"   },
  { path: "/store",         icon: ShoppingBag,     label: "Boutique"     },
  { path: "/news",          icon: Newspaper,       label: "Actualités"   },
  { path: "/profile",       icon: User,            label: "Profil"       },
  { path: "/wallet",        icon: Wallet,          label: "Portefeuille" },
  { path: "/stats",         icon: TrendingUp,      label: "Mes Stats"    },
  { path: "/daily-rewards", icon: Gift,            label: "Récompenses"  },
  { path: "/support",       icon: Ticket,          label: "Support"      },
  { path: "/chat",          icon: MessageSquare,   label: "Chat"         },
  { path: "/achievements",  icon: Star,            label: "Succès"       },
  { path: "/clans",         icon: Users2,          label: "Clans"        },
  { path: "/teams",         icon: Users,           label: "Équipes"      },
  { path: "/hall-of-fame",  icon: Crown,           label: "Hall of Fame" },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (prof) setProfile(prof);
    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => { await fetchProfile(); setLoading(false); };
    init();
  }, [fetchProfile]);

  // Close drawer on navigation
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-obsidian-deep">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 border-2 border-mint/10 rounded-[2rem] rotate-45" />
            <div className="absolute inset-0 border-2 border-mint rounded-[2rem] animate-spin [animation-duration:3s]" />
            <div className="absolute inset-4 border-2 border-cyber-gold rounded-full animate-ping" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="font-heading font-black text-xl tracking-[0.2em] text-white">CIPHERPOOL</h2>
            <p className="font-mono text-[10px] tracking-[0.4em] text-mint uppercase animate-pulse">Establishing Secure Uplink</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-deep text-white flex overflow-hidden">
      <LiquidCursor />
      <div className="noise-overlay" />
      <div className="scan-line" />

      {/* Sidebar — desktop only */}
      <div className="hidden md:block">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-[210] md:hidden flex flex-col"
              style={{ background: "#07071a", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-mint rounded-xl flex items-center justify-center shadow-neon-mint rotate-45">
                    <Sparkles className="text-obsidian -rotate-45" size={16} fill="currentColor" />
                  </div>
                  <span className="text-sm font-heading font-black tracking-tighter text-white">
                    CIPHER<span className="text-mint">POOL</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User card */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center text-obsidian font-black text-sm shadow-neon-mint shrink-0">
                    {profile?.username?.[0]?.toUpperCase() || "P"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">
                      {profile?.username || "Agent"}
                    </p>
                    <p className="text-[9px] text-mint/70 font-bold">
                      Lvl {profile?.level || 1} · {(profile?.coins || 0).toLocaleString()} CP
                    </p>
                  </div>
                </div>
              </div>

              {/* Nav links */}
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {DRAWER_NAV.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                        isActive
                          ? "bg-mint/10 text-mint border border-mint/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`
                    }
                  >
                    <item.icon size={18} strokeWidth={2} />
                    {item.label}
                  </NavLink>
                ))}

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-widest text-slate-600 px-4 pb-2">Admin</p>
                    {profile?.role === "super_admin" && (
                      <NavLink
                        to="/super-admin"
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                            isActive ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:text-orange-400 hover:bg-white/5"
                          }`
                        }
                      >
                        <ShieldAlert size={18} /> Super Admin
                      </NavLink>
                    )}
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                          isActive ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "text-slate-400 hover:text-orange-400 hover:bg-white/5"
                        }`
                      }
                    >
                      <ShieldAlert size={18} /> Admin Panel
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Logout */}
              <div className="px-3 py-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-400/5 transition-colors"
                >
                  <LogOut size={18} /> Déconnexion
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen relative z-10">
        <Navbar profile={profile} onMenuOpen={() => setMobileMenuOpen(true)} />

        <main className="flex-1 pt-16 md:pt-28 pb-20 md:pb-0 relative overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-8 max-w-[1800px] mx-auto min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet context={{ profile, refreshProfile: fetchProfile }} />
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="hidden md:block p-12 border-t border-white/5 mt-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-opacity duration-500">
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-[0.3em] uppercase">CipherPool v4.0.0-PRO</p>
                <p className="text-[9px] font-medium text-slate-500">Global Infrastructure Layer // Casablanca Node</p>
              </div>
              <div className="flex items-center gap-10 text-[10px] font-black uppercase tracking-widest">
                <button className="hover:text-mint transition-colors">Audit</button>
                <button className="hover:text-mint transition-colors">Privacy</button>
                <button className="hover:text-mint transition-colors">Protocol</button>
              </div>
            </div>
          </footer>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 md:hidden z-[150] border-t border-white/10"
          style={{ background: "rgba(7,7,26,0.97)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-around px-1 pt-2 pb-4">
            {MOBILE_BOTTOM_NAV.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
                    isActive ? "text-mint" : "text-slate-500 active:text-white"
                  }`}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-500 active:text-white min-w-[56px]"
            >
              <Menu size={22} strokeWidth={1.8} />
              <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Background Decor — desktop only (too heavy for mobile) */}
      <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
        <BackgroundBeams className="opacity-20" />
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-mint/5 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-purple/5 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2s]" />
      </div>

      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}
