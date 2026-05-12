import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, ShieldCheck, Trophy, AlertTriangle,
  TrendingUp, Lock, FileText, Settings, RefreshCw, ChevronRight,
  ShieldOff, Clock, Gamepad2, Ticket, Flag, Wifi, UserCircle2,
  ArrowUpRight, Activity, Search, Filter, X, CheckCircle,
  Ban, Zap, Coins, Crown, Sparkles, Server, Database, BarChart3,
  Menu, LogOut, Bell, Eye, EyeOff, Trash2, Edit3, PlusCircle
} from "lucide-react";

// ============================================
// DESIGN SYSTEM PRO MAX ULTRA
// ============================================
const T = {
  // Colors Base
  bg: "#05050A",
  bgGlass: "rgba(5, 5, 10, 0.75)",
  surface: "rgba(18, 18, 30, 0.95)",
  surface2: "rgba(25, 25, 40, 0.95)",
  surface3: "rgba(32, 32, 48, 0.95)",
  
  // Glass borders
  border: "rgba(255, 255, 255, 0.08)",
  borderGlow: "rgba(139, 92, 246, 0.4)",
  
  // Neon Colors
  neonPurple: "#8B5CF6",
  neonPurpleGlow: "#A78BFA",
  neonCyan: "#06B6D4",
  neonPink: "#EC4899",
  neonGreen: "#10B981",
  neonRed: "#EF4444",
  neonYellow: "#F59E0B",
  neonBlue: "#3B82F6",
  
  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  
  // Gradients
  gradientBg: "radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
  gradientCard: "linear-gradient(135deg, rgba(18, 18, 30, 0.98) 0%, rgba(25, 25, 40, 0.98) 100%)",
  gradientNeon: "linear-gradient(135deg, #8B5CF6, #A78BFA, #C084FC)",
  
  // Shadows
  glowSm: "0 0 10px rgba(139, 92, 246, 0.3)",
  glowMd: "0 0 20px rgba(139, 92, 246, 0.4)",
  glowLg: "0 0 40px rgba(139, 92, 246, 0.5)",
  shadowElevated: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  
  // Fonts
  font: "'Inter', 'Poppins', system-ui, -apple-system, sans-serif",
};

// ============================================
// Tabs & Modals Imports
// ============================================
import RoleModal from "./superadmin/modals/RoleModal";
import BanModal from "./superadmin/modals/BanModal";
import WalletModal from "./superadmin/modals/WalletModal";
import TournamentModal from "./superadmin/modals/TournamentModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import ProfileModal from "./superadmin/modals/ProfileModal";

// Lazy loaded tabs
const DashboardTab = lazy(() => import("./superadmin/tabs/DashboardTab"));
const UsersTab = lazy(() => import("./superadmin/tabs/UsersTab"));
const StaffTab = lazy(() => import("./superadmin/tabs/StaffTab"));
const TournamentsTab = lazy(() => import("./superadmin/tabs/TournamentsTab"));
const ReportsTab = lazy(() => import("./superadmin/tabs/ReportsTab"));
const EconomyTab = lazy(() => import("./superadmin/tabs/EconomyTab"));
const SecurityTab = lazy(() => import("./superadmin/tabs/SecurityTab"));
const LogsTab = lazy(() => import("./superadmin/tabs/LogsTab"));
const SystemTab = lazy(() => import("./superadmin/tabs/SystemTab"));

// ============================================
// ANIMATIONS CONFIG
// ============================================
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: "easeOut" }
};

const scaleGlow = {
  whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 }
};

const pulseGlow = {
  animate: {
    boxShadow: [
      "0 0 0px rgba(139, 92, 246, 0)",
      "0 0 20px rgba(139, 92, 246, 0.5)",
      "0 0 0px rgba(139, 92, 246, 0)"
    ],
    transition: { duration: 2, repeat: Infinity }
  }
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function SuperAdmin() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0, onlineUsers: 0, totalTournaments: 0, activeTournaments: 0,
    totalMatches: 0, totalCoins: 0, totalReports: 0, bannedUsers: 0,
    pendingVerifications: 0, openTickets: 0, todayRevenue: 0, monthlyRevenue: 0,
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [banDuration, setBanDuration] = useState("24h");
  const [tournamentStatus, setTournamentStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [walletSearch, setWalletSearch] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [tournamentsEnabled, setTournamentsEnabled] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const showMsg = useCallback((type, text, delay = 3000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), delay);
  }, []);

  // ========== DATA FETCHING ==========
  const checkSuperAdmin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      if (!data || data.role !== "super_admin") { navigate("/dashboard"); return; }
      
      setProfile(data);
      await fetchAllData();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [navigate]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchTournaments(),
        fetchReports(),
        fetchLogs(),
        fetchAdmins(),
        fetchStats(),
        fetchSystemConfig()
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const { data: walletsData } = await supabase
        .from("wallets")
        .select("user_id, balance");
      
      const walletMap = {};
      (walletsData || []).forEach(w => { walletMap[w.user_id] = w.balance; });
      
      setUsers((profilesData || []).map(u => ({
        ...u,
        coins: walletMap[u.id] || 0,
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Utilisateur",
      })));
    } catch (err) {
      console.error("fetchUsers:", err);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "super_admin", "founder", "fondateur", "designer"])
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error("fetchAdmins:", err);
    }
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      setTournaments([]);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      setReports([]);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      setLogs([]);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const safeCount = async (query) => {
      try {
        const result = await query;
        return result.count || 0;
      } catch {
        return 0;
      }
    };
    
    try {
      const [
        totalUsers, bannedUsers, pendingVerif,
        totalTournaments, activeTournaments, totalMatches,
        totalReports, openTickets
      ] = await Promise.all([
        safeCount(supabase.from("profiles").select("*", { count: "exact", head: true })),
        safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "banned")),
        safeCount(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending")),
        safeCount(supabase.from("tournaments").select("*", { count: "exact", head: true })),
        safeCount(supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("status", "open")),
        safeCount(supabase.from("match_results").select("*", { count: "exact", head: true })),
        safeCount(supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending")),
        safeCount(supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open")),
      ]);
      
      let totalCoins = 0;
      try {
        const { data: wallets } = await supabase.from("wallets").select("balance");
        totalCoins = (wallets || []).reduce((sum, w) => sum + (w.balance || 0), 0);
      } catch {}
      
      setStats({
        totalUsers, onlineUsers: Math.floor(totalUsers * 0.2), totalTournaments, activeTournaments,
        totalMatches, totalCoins, totalReports, bannedUsers,
        pendingVerifications: pendingVerif, openTickets,
        todayRevenue: Math.floor(Math.random() * 10000), monthlyRevenue: Math.floor(Math.random() * 50000),
      });
    } catch (err) {
      console.error("fetchStats:", err);
    }
  }, []);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      setMaintenanceMode(data?.maintenance_mode || false);
      setRegistrationEnabled(data?.registration_enabled !== false);
      setTournamentsEnabled(data?.tournaments_enabled !== false);
    } catch {}
  }, []);

  // ========== ACTIONS ==========
  const updateUserRole = useCallback(async (userId, role) => {
    try {
      const { error } = await supabase.rpc("set_user_role", {
        target_user: userId,
        new_role: role
      });
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "change_role",
        details: { target_user: userId, new_role: role }
      }]);
      
      showMsg("success", "✨ Rôle modifié avec succès");
      await Promise.all([fetchUsers(), fetchAdmins()]);
      setShowRoleModal(false);
    } catch (err) {
      showMsg("error", err.message || "Erreur lors du changement de rôle");
    }
  }, [profile, fetchUsers, fetchAdmins, showMsg]);

  const banUser = useCallback(async (userId, duration) => {
    const banUntil = new Date();
    if (duration === "24h") banUntil.setHours(banUntil.getHours() + 24);
    else if (duration === "7d") banUntil.setDate(banUntil.getDate() + 7);
    else if (duration === "30d") banUntil.setDate(banUntil.getDate() + 30);
    else banUntil.setFullYear(banUntil.getFullYear() + 10);
    
    try {
      const { error } = await supabase.rpc("ban_user", {
        target_user: userId,
        banned_until: banUntil.toISOString(),
        banned_by: profile.id
      });
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "ban_user",
        details: { target_user: userId, duration }
      }]);
      
      showMsg("success", "🔨 Utilisateur banni");
      await fetchUsers();
      setShowBanModal(false);
    } catch (err) {
      showMsg("error", err.message || "Erreur lors du bannissement");
    }
  }, [profile, fetchUsers, showMsg]);

  const unbanUser = useCallback(async (userId) => {
    try {
      const { error } = await supabase.rpc("unban_user", { target_user: userId });
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "unban_user",
        details: { target_user: userId }
      }]);
      
      showMsg("success", "🎉 Utilisateur débanni");
      await fetchUsers();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors du débannissement");
    }
  }, [profile, fetchUsers, showMsg]);

  const deleteUser = useCallback(async (userId) => {
    if (!window.confirm("⚠️ Action irréversible ! Supprimer cet utilisateur ?")) return;
    
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "delete_user",
        details: { target_user: userId }
      }]);
      
      showMsg("success", "🗑️ Utilisateur supprimé");
      await fetchUsers();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de la suppression");
    }
  }, [profile, fetchUsers, showMsg]);

  const grantCoins = useCallback(async () => {
    if (!selectedUser) return;
    
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) {
      showMsg("error", "Montant invalide");
      return;
    }
    
    if (!grantReason.trim()) {
      showMsg("error", "Raison obligatoire");
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", {
        p_target_user_id: selectedUser.id,
        p_amount: amount,
        p_reason: grantReason
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      
      showMsg("success", `${amount > 0 ? "➕" : "➖"} ${Math.abs(amount)} CP → ${selectedUser.display_name}`);
      
      setGrantAmount("");
      setGrantReason("");
      setShowWalletModal(false);
      await fetchUsers();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de l'ajustement");
    }
  }, [selectedUser, grantAmount, grantReason, fetchUsers, showMsg]);

  const deleteTournament = useCallback(async (tournamentId) => {
    try {
      const { error } = await supabase.rpc("delete_tournament_complete", {
        tournament_id: tournamentId
      });
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "delete_tournament",
        details: { tournament_id: tournamentId }
      }]);
      
      showMsg("success", "🏆 Tournoi supprimé");
      await fetchTournaments();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de la suppression");
    }
  }, [profile, fetchTournaments, showMsg]);

  const updateTournamentStatus = useCallback(async (tournamentId, status) => {
    try {
      const { error } = await supabase
        .from("tournaments")
        .update({ status })
        .eq("id", tournamentId);
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "update_tournament_status",
        details: { tournament_id: tournamentId, status }
      }]);
      
      showMsg("success", "📋 Statut mis à jour");
      setShowTournamentModal(false);
      await fetchTournaments();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de la mise à jour");
    }
  }, [profile, fetchTournaments, showMsg]);

  const resolveReport = useCallback(async (reportId, action) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_by: profile.id,
          resolved_action: action,
          resolved_at: new Date().toISOString()
        })
        .eq("id", reportId);
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "resolve_report",
        details: { report_id: reportId, action }
      }]);
      
      showMsg("success", "✅ Rapport résolu");
      await fetchReports();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de la résolution");
    }
  }, [profile, fetchReports, showMsg]);

  const updateSystemConfig = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          maintenance_mode: maintenanceMode,
          registration_enabled: registrationEnabled,
          tournaments_enabled: tournamentsEnabled,
          updated_by: profile.id,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "update_system_config",
        details: { maintenanceMode, registrationEnabled, tournamentsEnabled }
      }]);
      
      showMsg("success", "⚙️ Configuration mise à jour");
    } catch (err) {
      showMsg("error", err.message || "Erreur");
    }
  }, [maintenanceMode, registrationEnabled, tournamentsEnabled, profile, showMsg]);

  const filteredUsers = users.filter(u => {
    const query = search.toLowerCase();
    return (u.display_name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.free_fire_id?.includes(search)) &&
           (filter === "all" ||
            (filter === "admins" && u.role === "admin") ||
            (filter === "founders" && u.role === "founder") ||
            (filter === "banned" && u.role === "banned") ||
            (filter === "pending" && u.verification_status === "pending"));
  });

  useEffect(() => {
    checkSuperAdmin();
    const interval = setInterval(() => {
      if (profile?.role === "super_admin") fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkSuperAdmin, fetchStats, profile]);

  if (loading) {
    return (
      <div style={{ height: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Sparkles size={48} color={T.neonPurple} />
        </motion.div>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: T.neonPurple },
    { id: "users", label: "Utilisateurs", icon: Users, badge: users.length, color: T.neonCyan },
    { id: "staff", label: "Staff", icon: ShieldCheck, badge: admins.length, color: T.neonGreen },
    { id: "tournaments", label: "Tournois", icon: Trophy, badge: tournaments.length, color: T.neonYellow },
    { id: "reports", label: "Signalements", icon: AlertTriangle, badge: reports.length, color: T.neonRed },
    { id: "economy", label: "Économie", icon: TrendingUp, color: T.neonGreen },
    { id: "security", label: "Sécurité", icon: Lock, color: T.neonRed },
    { id: "logs", label: "Logs", icon: FileText, color: T.neonBlue },
    { id: "system", label: "Système", icon: Settings, color: T.neonPink },
  ];

  const STAT_CARDS = [
    { label: "UTILISATEURS", value: stats.totalUsers, icon: Users, color: T.neonPurple, gradient: "from-purple-500/20 to-purple-600/10" },
    { label: "EN LIGNE", value: stats.onlineUsers, icon: Wifi, color: T.neonGreen, gradient: "from-green-500/20 to-green-600/10" },
    { label: "BANNIS", value: stats.bannedUsers, icon: ShieldOff, color: T.neonRed, gradient: "from-red-500/20 to-red-600/10" },
    { label: "TOURNOIS", value: stats.activeTournaments, icon: Trophy, color: T.neonYellow, gradient: "from-yellow-500/20 to-yellow-600/10" },
    { label: "COINS", value: stats.totalCoins.toLocaleString(), icon: Coins, color: T.neonPink, gradient: "from-pink-500/20 to-pink-600/10" },
    { label: "REPORTS", value: stats.totalReports, icon: Flag, color: T.neonRed, gradient: "from-red-500/20 to-red-600/10" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.textPrimary, fontFamily: T.font, position: "relative", overflowX: "hidden" }}>
      
      {/* Background Gradient */}
      <div style={{ position: "fixed", inset: 0, background: T.gradientBg, pointerEvents: "none", zIndex: 0 }} />
      
      {/* Animated Grid Pattern */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "radial-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap');
        
        * {
          scrollbar-width: thin;
          scrollbar-color: ${T.neonPurple} ${T.surface};
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${T.surface};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${T.neonPurple};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${T.neonPurpleGlow};
        }
        
        .glass-card {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        
        .neon-text {
          text-shadow: 0 0 10px ${T.neonPurple}, 0 0 20px ${T.neonPurple};
        }
      `}</style>

      {/* ========== TOP BAR GLASS ========== */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(20px)",
          background: T.bgGlass,
          borderBottom: `1px solid ${T.border}`,
          padding: "0 24px",
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 8,
              cursor: "pointer",
              color: T.textSecondary,
            }}
          >
            <Menu size={20} />
          </motion.button>
          
          <motion.div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: T.gradientNeon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: T.glowSm,
            }}>
              <Crown size={20} color="white" />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>CipherPool</span>
              <span style={{ fontSize: 10, color: T.neonPurple, marginLeft: 8, fontWeight: 700 }}>SUPER ADMIN</span>
            </div>
          </motion.div>

          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 40,
              background: `${T.neonGreen}15`,
              border: `1px solid ${T.neonGreen}30`,
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.neonGreen, boxShadow: `0 0 8px ${T.neonGreen}` }} />
            <span style={{ fontSize: 11, color: T.neonGreen, fontWeight: 600 }}>ONLINE</span>
          </motion.div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <motion.button {...scaleGlow} onClick={() => { fetchAllData(); showMsg("success", "🔄 Données actualisées"); }} style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "8px 14px",
            cursor: "pointer",
            color: T.textSecondary,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
          }}>
            <RefreshCw size={14} />
            Rafraîchir
          </motion.button>

          <Link to="/admin">
            <motion.button {...scaleGlow} style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: "8px 14px",
              cursor: "pointer",
              color: T.textSecondary,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}>
              <ShieldCheck size={14} />
              Admin
            </motion.button>
          </Link>

          <motion.button
            {...scaleGlow}
            onClick={() => setShowProfileModal(true)}
            style={{
              background: T.surface,
              border: `1px solid ${T.borderGlow}`,
              borderRadius: 40,
              padding: "4px 16px 4px 6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: T.gradientNeon,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>
                {(profile?.username || profile?.email || "SA")[0]?.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{profile?.username || profile?.email?.split("@")[0]}</span>
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
          </motion.button>
        </div>
      </motion.header>

      {/* ========== MAIN LAYOUT ========== */}
      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
        
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              style={{
                position: "fixed",
                left: 0,
                top: 70,
                bottom: 0,
                width: 280,
                background: T.surface,
                backdropFilter: "blur(20px)",
                borderRight: `1px solid ${T.border}`,
                zIndex: 99,
                overflowY: "auto",
                padding: "20px 12px",
              }}
            >
              {TABS.map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: 4,
                    borderRadius: 12,
                    background: activeTab === tab.id ? `${tab.color}15` : "transparent",
                    border: activeTab === tab.id ? `1px solid ${tab.color}30` : "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: activeTab === tab.id ? tab.color : T.textSecondary,
                    transition: "all 0.2s",
                  }}
                >
                  <tab.icon size={18} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: `${tab.color}20`,
                      color: tab.color,
                      fontWeight: 700,
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main style={{
          flex: 1,
          marginLeft: sidebarOpen ? 280 : 0,
          padding: "28px 32px",
          transition: "margin-left 0.3s ease",
        }}>
          
          {/* Toast */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                style={{
                  position: "fixed",
                  top: 85,
                  right: 30,
                  zIndex: 200,
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: message.type === "success" ? `linear-gradient(135deg, ${T.neonGreen}20, ${T.neonGreen}10)` : `linear-gradient(135deg, ${T.neonRed}20, ${T.neonRed}10)`,
                  border: `1px solid ${message.type === "success" ? T.neonGreen + "40" : T.neonRed + "40"}`,
                  backdropFilter: "blur(20px)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  boxShadow: T.shadowElevated,
                }}
              >
                {message.type === "success" ? <CheckCircle size={18} color={T.neonGreen} /> : <AlertTriangle size={18} color={T.neonRed} />}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Page Header */}
          <motion.div {...fadeInUp}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>
              Super Admin Panel
            </h1>
            <p style={{ fontSize: 14, color: T.textSecondary, marginBottom: 28 }}>
              Gestion complète du système • {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>

          {/* Stats Cards Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {STAT_CARDS.map((card, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.02 }}
                style={{
                  background: `linear-gradient(135deg, ${T.surface}, ${T.surface2})`,
                  border: `1px solid ${card.color}20`,
                  borderRadius: 20,
                  padding: "20px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.05 }}>
                  <card.icon size={80} color={card.color} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: `${card.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <card.icon size={22} color={card.color} />
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 4, color: card.color }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: 1 }}>
                  {card.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Tab Content Container */}
          <motion.div
            {...fadeInUp}
            key={activeTab}
            style={{
              background: `linear-gradient(135deg, ${T.surface}, ${T.surface2})`,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: "24px",
              minHeight: 500,
            }}
          >
            <Suspense fallback={
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Zap size={32} color={T.neonPurple} />
                </motion.div>
              </div>
            }>
              {activeTab === "dashboard" && (
                <DashboardTab
                  stats={stats}
                  users={users}
                  logs={logs}
                  setActiveTab={setActiveTab}
                  setFilter={setFilter}
                  setSelectedUser={setSelectedUser}
                  setGrantAmount={setGrantAmount}
                  setGrantReason={setGrantReason}
                  setWalletSearch={setWalletSearch}
                  setShowWalletModal={setShowWalletModal}
                />
              )}
              {activeTab === "users" && (
                <UsersTab
                  filteredUsers={filteredUsers}
                  search={search}
                  setSearch={setSearch}
                  filter={filter}
                  setFilter={setFilter}
                  setSelectedUser={setSelectedUser}
                  setShowRoleModal={setShowRoleModal}
                  setShowBanModal={setShowBanModal}
                  setShowWalletModal={setShowWalletModal}
                  unbanUser={unbanUser}
                  deleteUser={deleteUser}
                />
              )}
              {activeTab === "staff" && (
                <StaffTab
                  users={users}
                  updateUserRole={updateUserRole}
                  currentUserRole={profile?.role}
                />
              )}
              {activeTab === "tournaments" && (
                <TournamentsTab
                  tournaments={tournaments}
                  setSelectedTournament={setSelectedTournament}
                  setShowTournamentModal={setShowTournamentModal}
                  setTournamentToDelete={setTournamentToDelete}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                />
              )}
              {activeTab === "reports" && (
                <ReportsTab
                  reports={reports}
                  resolveReport={resolveReport}
                />
              )}
              {activeTab === "economy" && (
                <EconomyTab stats={stats} setMessage={setMessage} />
              )}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "logs" && (
                <LogsTab logs={logs} users={users} />
              )}
              {activeTab === "system" && (
                <SystemTab
                  maintenanceMode={maintenanceMode}
                  setMaintenanceMode={setMaintenanceMode}
                  registrationEnabled={registrationEnabled}
                  setRegistrationEnabled={setRegistrationEnabled}
                  tournamentsEnabled={tournamentsEnabled}
                  setTournamentsEnabled={setTournamentsEnabled}
                  updateSystemConfig={updateSystemConfig}
                />
              )}
            </Suspense>
          </motion.div>
        </main>
      </div>

      {/* ========== MODALS ========== */}
      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal
            profile={profile}
            onClose={() => setShowProfileModal(false)}
            onSaved={updated => setProfile(prev => ({ ...prev, ...updated }))}
          />
        )}
        {showRoleModal && selectedUser && (
          <RoleModal
            selectedUser={selectedUser}
            updateUserRole={updateUserRole}
            onClose={() => setShowRoleModal(false)}
          />
        )}
        {showBanModal && selectedUser && (
          <BanModal
            selectedUser={selectedUser}
            banDuration={banDuration}
            setBanDuration={setBanDuration}
            banUser={banUser}
            onClose={() => setShowBanModal(false)}
          />
        )}
        {showWalletModal && (
          <WalletModal
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            walletSearch={walletSearch}
            setWalletSearch={setWalletSearch}
            grantAmount={grantAmount}
            setGrantAmount={setGrantAmount}
            grantReason={grantReason}
            setGrantReason={setGrantReason}
            grantCoins={grantCoins}
            onClose={() => {
              setShowWalletModal(false);
              setGrantAmount("");
              setGrantReason("");
              setWalletSearch("");
              setSelectedUser(null);
            }}
          />
        )}
        {showTournamentModal && selectedTournament && (
          <TournamentModal
            selectedTournament={selectedTournament}
            tournamentStatus={tournamentStatus}
            setTournamentStatus={setTournamentStatus}
            updateTournamentStatus={updateTournamentStatus}
            onClose={() => setShowTournamentModal(false)}
          />
        )}
        {showDeleteConfirm && tournamentToDelete && (
          <DeleteConfirmModal
            tournamentToDelete={tournamentToDelete}
            deleteLoading={deleteLoading}
            deleteTournament={async id => {
              setDeleteLoading(true);
              await deleteTournament(id);
              setDeleteLoading(false);
              setShowDeleteConfirm(false);
              setTournamentToDelete(null);
            }}
            onClose={() => {
              setShowDeleteConfirm(false);
              setTournamentToDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}