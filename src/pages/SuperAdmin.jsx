import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, ShieldCheck, Trophy, AlertTriangle,
  TrendingUp, Lock, FileText, Settings, RefreshCw, ChevronRight,
  ShieldOff, Clock, Gamepad2, Ticket, Flag, Wifi, UserCircle2,
  ArrowUpRight, Activity, Search, Filter, X, CheckCircle,
  Ban, Zap, Coins, Crown, Sparkles, Server, Database, BarChart3
} from "lucide-react";

// Tabs (Lazy Loading Ready)
const DashboardTab = lazy(() => import("./superadmin/tabs/DashboardTab"));
const UsersTab = lazy(() => import("./superadmin/tabs/UsersTab"));
const StaffTab = lazy(() => import("./superadmin/tabs/StaffTab"));
const TournamentsTab = lazy(() => import("./superadmin/tabs/TournamentsTab"));
const ReportsTab = lazy(() => import("./superadmin/tabs/ReportsTab"));
const EconomyTab = lazy(() => import("./superadmin/tabs/EconomyTab"));
const SecurityTab = lazy(() => import("./superadmin/tabs/SecurityTab"));
const LogsTab = lazy(() => import("./superadmin/tabs/LogsTab"));
const SystemTab = lazy(() => import("./superadmin/tabs/SystemTab"));

// Modals
import RoleModal from "./superadmin/modals/RoleModal";
import BanModal from "./superadmin/modals/BanModal";
import WalletModal from "./superadmin/modals/WalletModal";
import TournamentModal from "./superadmin/modals/TournamentModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import ProfileModal from "./superadmin/modals/ProfileModal";

// --- DESIGN SYSTEM PRO MAX ---
const T = {
  bg: "#0A0A0F",
  surface: "#111116",
  surface2: "#16161D",
  border: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.03)",
  accent: "#8B5CF6",
  accentLight: "#A78BFA",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  pink: "#EC4899",
  text: "#FFFFFF",
  text2: "#A1A1AA",
  text3: "#52525B",
  glow: "0 0 20px rgba(139,92,246,0.3)",
  font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const glassCard = {
  background: `linear-gradient(135deg, ${T.surface} 0%, ${T.surface2} 100%)`,
  border: `1px solid ${T.border}`,
  borderRadius: "16px",
  backdropFilter: "blur(10px)",
};

// --- Main Component ---
export default function SuperAdmin() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
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
  
  // UI State
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Notifications ---
  const showMsg = useCallback((type, text, delay = 3000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), delay);
  }, []);

  // --- Auth & Data Fetching ---
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
      console.error("checkSuperAdmin:", err);
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
        stats: { tournaments_played: 0, wins: 0 },
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Inconnu",
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
        totalUsers, onlineUsers: 0, totalTournaments, activeTournaments,
        totalMatches, totalCoins, totalReports, bannedUsers,
        pendingVerifications: pendingVerif, openTickets,
        todayRevenue: 0, monthlyRevenue: 0
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

  // --- Actions ---
  const updateUserRole = useCallback(async (userId, role) => {
    try {
      const { error: rpcError } = await supabase.rpc("set_user_role", {
        target_user: userId,
        new_role: role
      });
      
      if (rpcError) {
        const { error: directError } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", userId);
        
        if (directError) throw directError;
      }
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "change_role",
        details: { target_user: userId, new_role: role }
      }]);
      
      showMsg("success", "Rôle modifié avec succès ✨");
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
      
      showMsg("success", "Utilisateur banni avec succès 🔨");
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
      
      showMsg("success", "Utilisateur débanni avec succès 🎉");
      await fetchUsers();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors du débannissement");
    }
  }, [profile, fetchUsers, showMsg]);

  const deleteUser = useCallback(async (userId) => {
    if (!window.confirm("⚠️ Supprimer définitivement cet utilisateur ? Action irréversible.")) return;
    
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      
      await supabase.from("admin_logs").insert([{
        user_id: profile.id,
        action: "delete_user",
        details: { target_user: userId }
      }]);
      
      showMsg("success", "Utilisateur supprimé définitivement 🗑️");
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
      showMsg("error", "La raison est obligatoire");
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
      
      showMsg("success", `${amount > 0 ? "➕" : "➖"} ${Math.abs(amount)} CP → ${selectedUser.display_name} (${data.new_balance} total)`, 4000);
      
      setGrantAmount("");
      setGrantReason("");
      setShowWalletModal(false);
      await fetchUsers();
    } catch (err) {
      showMsg("error", err.message || "Erreur lors de l'ajustement des coins");
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
      
      showMsg("success", "Tournoi supprimé avec succès 🏆");
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
      
      showMsg("success", "Statut du tournoi mis à jour 📋");
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
      
      showMsg("success", "Rapport résolu ✅");
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
      
      showMsg("success", "Configuration système mise à jour ⚙️");
    } catch (err) {
      showMsg("error", err.message || "Erreur");
    }
  }, [maintenanceMode, registrationEnabled, tournamentsEnabled, profile, showMsg]);

  // --- Filters & Helpers ---
  const filteredUsers = users.filter(u => {
    const query = search.toLowerCase();
    const matchSearch = u.display_name?.toLowerCase().includes(query) ||
                       u.email?.toLowerCase().includes(query) ||
                       u.free_fire_id?.includes(search);
    
    if (filter === "all") return matchSearch;
    if (filter === "admins") return matchSearch && u.role === "admin";
    if (filter === "founders") return matchSearch && u.role === "founder";
    if (filter === "banned") return matchSearch && u.role === "banned";
    if (filter === "pending") return matchSearch && u.verification_status === "pending";
    return matchSearch;
  });

  // --- Side Effects ---
  useEffect(() => {
    checkSuperAdmin();
    
    const interval = setInterval(() => {
      if (profile?.role === "super_admin") fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkSuperAdmin, fetchStats, profile]);

  // --- Loading UI ---
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.font
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={48} color={T.accent} />
          </motion.div>
          <p style={{ color: T.text2, marginTop: 16, fontSize: 13, letterSpacing: 2 }}>
            CHARGEMENT SUPER ADMIN
          </p>
        </motion.div>
      </div>
    );
  }

  // --- Tabs Configuration ---
  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, glow: true },
    { id: "users", label: "Utilisateurs", icon: Users, badge: users.length },
    { id: "staff", label: "Staff", icon: ShieldCheck, badge: admins.length },
    { id: "tournaments", label: "Tournois", icon: Trophy, badge: tournaments.length },
    { id: "reports", label: "Signalements", icon: AlertTriangle, badge: reports.length },
    { id: "economy", label: "Économie", icon: TrendingUp },
    { id: "security", label: "Sécurité", icon: Lock },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "system", label: "Système", icon: Settings },
  ];

  // --- Stat Cards Config ---
  const STAT_CARDS = [
    { label: "UTILISATEURS", value: stats.totalUsers, icon: Users, color: T.accent, bg: `${T.accent}15` },
    { label: "EN LIGNE", value: stats.onlineUsers, icon: Wifi, color: T.green, bg: `${T.green}15` },
    { label: "BANNIS", value: stats.bannedUsers, icon: ShieldOff, color: T.red, bg: `${T.red}15` },
    { label: "EN ATTENTE", value: stats.pendingVerifications, icon: Clock, color: T.amber, bg: `${T.amber}15` },
    { label: "TOURNOIS", value: stats.totalTournaments, icon: Trophy, color: "#A78BFA", bg: "#A78BFA15" },
    { label: "MATCHES", value: stats.totalMatches, icon: Gamepad2, color: T.blue, bg: `${T.blue}15` },
    { label: "TICKETS", value: stats.openTickets, icon: Ticket, color: T.pink, bg: `${T.pink}15` },
    { label: "REPORTS", value: stats.totalReports, icon: Flag, color: T.amber, bg: `${T.amber}15` },
  ];

  const initials = (profile?.username || profile?.email || "SA")[0]?.toUpperCase();

  // --- Main Render ---
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          scrollbar-width: thin;
          scrollbar-color: ${T.accent} ${T.surface2};
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${T.surface2};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${T.accent};
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${T.accentLight};
        }
      `}</style>

      {/* === HEADER SUPER PRO === */}
      <header style={{
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(180deg, ${T.surface} 0%, ${T.surface2} 100%)`,
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(20px)",
      }}>
        <div style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 28px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: T.glow
              }}>
                <Crown size={18} color="#fff" />
              </div>
              <div>
                <span style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>
                  CipherPool
                </span>
                <span style={{ fontSize: 11, color: T.accent, marginLeft: 6, fontWeight: 600 }}>
                  SUPER ADMIN
                </span>
              </div>
            </motion.div>

            {/* Status Indicator */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 40,
                background: `${T.green}10`,
                border: `1px solid ${T.green}30`,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
              <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>SYSTEM OPERATIONAL</span>
            </motion.div>
          </div>

          {/* Right Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                fetchAllData();
                showMsg("success", "Données actualisées 🔄");
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: T.surface2,
                border: `1px solid ${T.border}`,
                color: T.text2,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <RefreshCw size={14} />
              Rafraîchir
            </motion.button>

            <Link to="/admin">
              <motion.div
                whileHover={{ scale: 1.02 }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: T.surface2,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <ShieldCheck size={14} />
                Admin Panel
              </motion.div>
            </Link>

            {/* Profile Dropdown */}
            <div style={{ position: "relative" }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => setProfileMenuOpen(prev => !prev)}
                style={{
                  padding: "4px 12px 4px 6px",
                  borderRadius: 40,
                  background: T.surface2,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{initials}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {profile?.username || profile?.email?.split("@")[0]}
                </span>
                <ChevronRight size={14} style={{ opacity: 0.6, transform: profileMenuOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
              </motion.button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        width: 220,
                        ...glassCard,
                        padding: "8px",
                        zIndex: 1000,
                      }}
                    >
                      <button
                        onClick={() => { setShowProfileModal(true); setProfileMenuOpen(false); }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "none",
                          color: T.text2,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textAlign: "left",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = T.border}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <UserCircle2 size={16} /> Modifier profil
                      </button>
                      <div style={{ height: 1, background: T.border, margin: "6px 0" }} />
                      <button
                        onClick={() => navigate("/dashboard")}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "none",
                          color: T.text2,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textAlign: "left",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = T.border}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <ArrowUpRight size={16} /> Retour site
                      </button>
                    </motion.div>
                    <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setProfileMenuOpen(false)} />
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "32px 28px" }}>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={{
                position: "fixed",
                top: 80,
                right: 28,
                zIndex: 1000,
                padding: "12px 20px",
                borderRadius: 12,
                background: message.type === "success"
                  ? `linear-gradient(135deg, ${T.green}20, ${T.green}10)`
                  : `linear-gradient(135deg, ${T.red}20, ${T.red}10)`,
                border: `1px solid ${message.type === "success" ? T.green + "40" : T.red + "40"}`,
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              {message.type === "success" ? <CheckCircle size={18} color={T.green} /> : <AlertTriangle size={18} color={T.red} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? T.green : T.red }}>
                {message.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Title */}
        <div style={{ marginBottom: 32 }}>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ fontSize: 28, fontWeight: 800, margin: 0, marginBottom: 8, background: `linear-gradient(135deg, ${T.text}, ${T.accent})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Panneau de Contrôle Suprême
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            style={{ fontSize: 14, color: T.text3, margin: 0 }}
          >
            Gestion avancée des utilisateurs, tournois et configuration système
          </motion.p>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {STAT_CARDS.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              style={{
                ...glassCard,
                padding: "18px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: card.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <card.icon size={20} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                {card.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1 }}>
                {card.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Revenue Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { label: "REVENU AUJOURD'HUI", value: stats.todayRevenue, icon: TrendingUp, color: T.accent },
            { label: "REVENU CE MOIS", value: stats.monthlyRevenue, icon: BarChart3, color: T.blue },
            { label: "COINS EN CIRCULATION", value: stats.totalCoins, icon: Coins, color: T.amber },
          ].map((card, idx) => (
            <div key={idx} style={{ ...glassCard, padding: "20px", display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `${card.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <card.icon size={24} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, marginBottom: 6 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.text }}>
                  {card.value.toLocaleString()} <span style={{ fontSize: 13, color: T.text3 }}>CP</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tab Navigation */}
        <div style={{
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 4,
          marginBottom: 24,
          overflowX: "auto",
          paddingBottom: 2,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${T.accent}` : "2px solid transparent",
                  background: isActive ? `${T.accent}10` : "transparent",
                  color: isActive ? T.text : T.text3,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <tab.icon size={16} style={isActive ? { color: T.accent } : {}} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: isActive ? `${T.accent}20` : T.surface2,
                    color: isActive ? T.accent : T.text3,
                    fontWeight: 700,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ ...glassCard, padding: "24px", minHeight: 500 }}
        >
          <React.Suspense fallback={
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                <Zap size={32} color={T.accent} />
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
              <EconomyTab
                stats={stats}
                setMessage={setMessage}
              />
            )}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "logs" && (
              <LogsTab
                logs={logs}
                users={users}
              />
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
          </React.Suspense>
        </motion.div>
      </main>

      {/* === MODALS === */}
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

// Lazy loading wrapper
import React, { lazy, Suspense } from "react";