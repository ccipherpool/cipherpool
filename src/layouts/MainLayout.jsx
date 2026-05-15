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
  LayoutDashboard, Trophy, BarChart3, User, Ticket,
  ShieldAlert, LogOut, X, Menu,
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
  const location = useLocation();
  const {
    profile,
    balance,
    wallet,
    userItems,
    equippedItems,
    loading,
    refreshCurrentUser,
    refreshEconomyData,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchProfile = useCallback(() => refreshCurrentUser(), [refreshCurrentUser]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = ["admin", "super_admin", "founder", "fondateur"].includes(profile?.role);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617]">
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#020617]">

      {/* ── Mobile Header (In-flow) ── */}
      <nav className="md:hidden h-14 flex items-center px-4 border-b border-white/[0.08] bg-[#020617]/95 backdrop-blur-xl flex-shrink-0 z-50">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white transition-colors mr-2"
        >
          <Menu size={22} />
        </button>
        <div className="flex-1 flex justify-center">
          <img src="/logo.png" alt="CipherPool" className="h-8 w-auto object-contain" />
        </div>
        <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-xl">
          <Wallet size={13} className="text-cyber-gold" />
          <span className="text-[10px] font-black text-white">{(balance || 0).toLocaleString()}</span>
        </Link>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Desktop Sidebar ── */}
        <Sidebar profile={profile} />

        {/* ── Right column ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Desktop TopNav (in flow) */}
          <TopNav profile={profile} />

          {/* ── Main Content ── */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#020617] scroll-smooth">
            <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-5 md:py-8 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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

      {/* Mobile Bottom Nav (In-flow) */}
      <nav className="md:hidden h-[calc(env(safe-area-inset-bottom)+56px)] pb-[env(safe-area-inset-bottom)] bg-[#020617]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-2 flex-shrink-0 z-50">
        {MOBILE_BOTTOM_NAV.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 py-1 px-4 transition-all ${isActive ? 'text-mint' : 'text-slate-500'}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] font-black uppercase tracking-[0.15em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Drawer (Overlay) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-[210] md:hidden flex flex-col bg-[#080d18] border-r border-white/[0.08]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
                <img src="/logo.png" alt="CipherPool" className="h-8 w-auto object-contain" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
                <div className="space-y-1">
                  {DRAWER_NAV.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                          isActive ? "bg-mint/10 text-mint" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                        }`
                      }
                    >
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>

                {isAdmin && (
                  <div className="pt-4 border-t border-white/[0.08] space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 px-4 mb-2">System Admin</p>
                    <NavLink to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 hover:bg-orange-400/[0.05] transition-all">
                      <ShieldAlert size={16} /> Control Panel
                    </NavLink>
                    {profile?.role === "super_admin" && (
                      <NavLink to="/super-admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 hover:bg-red-400/[0.05] transition-all">
                        <Zap size={16} /> Root Access
                      </NavLink>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/[0.08]">
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[11px] hover:bg-red-500/20 transition-all">
                  <LogOut size={16} /> Terminate Session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <TermsModal />
      <AnnouncementModal />
    </div>
  );
}

