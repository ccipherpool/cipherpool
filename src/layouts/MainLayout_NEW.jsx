import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationProvider, useNotify } from "../components/NotificationSystem";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           CIPHERPOOL v7 - MAIN LAYOUT (Discord-Style)                     ║
 * ║                                                                           ║
 * ║  Features:                                                              ║
 * ║  ✅ Responsive Sidebar (Desktop + Mobile)                               ║
 * ║  ✅ Tailwind CSS (No Inline Styles)                                     ║
 * ║  ✅ Discord-like Navigation                                             ║
 * ║  ✅ User Profile Card                                                   ║
 * ║  ✅ Notification Badges                                                 ║
 * ║  ✅ Role-based Menu Items                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// Navigation Items
const MAIN_NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: "⚡", badge: null },
  { to: "/tournaments", label: "Tournois", icon: "🏆", badge: null },
  { to: "/leaderboard", label: "Classement", icon: "📊", badge: null },
  { to: "/teams", label: "Équipes", icon: "🛡️", badge: null },
  { to: "/clans", label: "Clans", icon: "⚔️", badge: null },
  { to: "/news", label: "Actualités", icon: "📰", badge: null },
  { to: "/chat", label: "Chat global", icon: "💬", badge: "unread" },
  { to: "/store", label: "Boutique", icon: "🛍️", badge: null },
  { to: "/wallet", label: "Portefeuille", icon: "💎", badge: null },
  { to: "/profile", label: "Mon profil", icon: "👤", badge: null },
  { to: "/support", label: "Assistance", icon: "🎧", badge: "support" },
  { to: "/stats", label: "Mes Stats", icon: "📈", badge: null },
  { to: "/achievements", label: "Achievements", icon: "🏅", badge: null },
  { to: "/daily-rewards", label: "Daily Rewards", icon: "🎁", badge: null },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Administration", icon: "🛡️", roles: ["admin", "super_admin"] },
  { to: "/admin/news", label: "Actualités", icon: "📰", roles: ["admin", "super_admin"] },
  { to: "/admin/results", label: "Résultats", icon: "📋", roles: ["admin", "super_admin"] },
  { to: "/admin-store", label: "Boutique Admin", icon: "🏪", roles: ["admin", "super_admin"] },
  { to: "/designer", label: "Designer", icon: "🎨", roles: ["designer", "admin", "super_admin"] },
  { to: "/founder", label: "Panel Fondateur", icon: "⚡", roles: ["founder", "super_admin"] },
  { to: "/super-admin", label: "Super Admin", icon: "👑", roles: ["super_admin"] },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Check if user can see admin items
  const canSeeAdmin = profile && ["admin", "super_admin", "founder", "designer"].includes(profile.role);

  // Filter admin nav based on role
  const visibleAdminNav = ADMIN_NAV.filter(item => item.roles.includes(profile?.role));

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-bg-base">
        <div className="text-center">
          <div className="w-12 h-12 mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <div className="flex w-full h-screen bg-bg-base text-text-primary overflow-hidden">
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* SIDEBAR                                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ duration: 0.3 }}
          className="fixed left-0 top-0 z-40 w-64 h-screen bg-bg-surface border-r border-primary-900/30 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-primary-700 scrollbar-track-bg-surface"
        >
          {/* Logo Section */}
          <div className="p-4 border-b border-primary-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-white">
                CP
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                  CIPHER
                </h1>
                <p className="text-xs text-text-muted">POOL</p>
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {MAIN_NAV.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative ${
                    isActive
                      ? "bg-primary-600/30 text-primary-300 border border-primary-500/50"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse"></span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Admin Section */}
          {canSeeAdmin && visibleAdminNav.length > 0 && (
            <div className="border-t border-primary-900/30 p-4">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-primary-300 hover:bg-bg-hover transition-all"
              >
                <span className="text-xl">⚙️</span>
                <span className="flex-1 text-sm font-medium text-left">Administration</span>
                <span className={`transition-transform ${adminMenuOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              <AnimatePresence>
                {adminMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1 pl-2"
                  >
                    {visibleAdminNav.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                            isActive
                              ? "bg-primary-600/30 text-primary-300 border border-primary-500/50"
                              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* User Profile Card */}
          {profile && (
            <div className="border-t border-primary-900/30 p-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-hover hover:bg-bg-card transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center font-bold text-white text-sm">
                  {profile.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{profile.full_name}</p>
                  <p className="text-xs text-text-muted capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          )}
        </motion.aside>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* MAIN CONTENT                                                                */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <div className={`flex-1 flex flex-col transition-all ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          {/* Top Bar */}
          <header className="h-16 bg-bg-surface border-b border-primary-900/30 flex items-center px-6 gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
            >
              {sidebarOpen ? "☰" : "→"}
            </button>
            <div className="flex-1"></div>
            <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary">
              🔔
            </button>
            <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary">
              ⚙️
            </button>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
            />
          )}
        </AnimatePresence>
      </div>
    </NotificationProvider>
  );
}
