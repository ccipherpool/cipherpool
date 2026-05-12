import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, ShieldCheck, Trophy, AlertTriangle,
  TrendingUp, Lock, FileText, Settings, RefreshCw, ChevronRight,
  ShieldOff, Clock, Gamepad2, Ticket, Flag, Wifi, UserCircle2,
  ArrowUpRight, Activity,
} from "lucide-react";

// Tabs
import DashboardTab    from "./superadmin/tabs/DashboardTab";
import UsersTab        from "./superadmin/tabs/UsersTab";
import StaffTab        from "./superadmin/tabs/StaffTab";
import TournamentsTab  from "./superadmin/tabs/TournamentsTab";
import ReportsTab      from "./superadmin/tabs/ReportsTab";
import EconomyTab      from "./superadmin/tabs/EconomyTab";
import SecurityTab     from "./superadmin/tabs/SecurityTab";
import LogsTab         from "./superadmin/tabs/LogsTab";
import SystemTab       from "./superadmin/tabs/SystemTab";

// Modals
import RoleModal          from "./superadmin/modals/RoleModal";
import BanModal           from "./superadmin/modals/BanModal";
import WalletModal        from "./superadmin/modals/WalletModal";
import TournamentModal    from "./superadmin/modals/TournamentModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import ProfileModal       from "./superadmin/modals/ProfileModal";

// ─── Design tokens ─────────────────────────────────────────
const T = {
  bg:       "#09090b",
  surface:  "#111113",
  surface2: "#18181b",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.04)",
  accent:   "#6366f1",
  green:    "#10b981",
  red:      "#ef4444",
  amber:    "#f59e0b",
  text:     "#fafafa",
  text2:    "#a1a1aa",
  text3:    "#52525b",
  font:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const S = {
  card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 },
  label: { fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1, textTransform: "uppercase" },
};

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

  useEffect(() => {
    checkSuperAdmin();
    const interval = setInterval(() => {
      if (profile?.role === "super_admin") fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const showMsg = (type, text, delay = 3000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), delay);
  };

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      if (!data || data.role !== "super_admin") { navigate("/dashboard"); return; }
      setProfile(data);
      await fetchAllData();
    } catch (err) {
      if (import.meta.env.DEV) console.error("checkSuperAdmin:", err);
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchTournaments(), fetchReports(), fetchLogs(), fetchAdmins(), fetchStats(), fetchSystemConfig()]);
    } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: walletsData } = await supabase.from("wallets").select("user_id, balance");
      const walletMap = {};
      (walletsData || []).forEach(w => { walletMap[w.user_id] = w.balance; });
      setUsers((profilesData || []).map(u => ({
        ...u, coins: walletMap[u.id] || 0, stats: { tournaments_played: 0, wins: 0 },
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Inconnu",
      })));
    } catch (err) { if (import.meta.env.DEV) console.error("fetchUsers:", err); }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").in("role", ["admin", "super_admin", "founder", "fondateur", "designer"]).order("created_at", { ascending: false });
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) { if (import.meta.env.DEV) console.error("fetchAdmins:", err); }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      setTournaments(data || []);
    } catch (_err) { setTournaments([]); }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (_err) { setReports([]); }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch (_err) { setLogs([]); }
  };

  const fetchStats = async () => {
    const safeCount = async (q) => { try { const r = await q; return r.count || 0; } catch { return 0; } };
    try {
      const [totalUsers, bannedUsers, pendingVerif, totalTournaments, activeTournaments, totalMatches, totalReports, openTickets] = await Promise.all([
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
      try { const { data: w } = await supabase.from("wallets").select("balance"); totalCoins = (w || []).reduce((s, x) => s + (x.balance || 0), 0); } catch {}
      setStats({ totalUsers, onlineUsers: 0, totalTournaments, activeTournaments, totalMatches, totalCoins, totalReports, bannedUsers, pendingVerifications: pendingVerif, openTickets, todayRevenue: 0, monthlyRevenue: 0 });
    } catch (err) { if (import.meta.env.DEV) console.error("fetchStats:", err); }
  };

  const fetchSystemConfig = async () => {
    try {
      const { data, error } = await supabase.from("system_config").select("*").single();
      if (error && error.code !== "PGRST116") throw error;
      setMaintenanceMode(data?.maintenance_mode || false);
      setRegistrationEnabled(data?.registration_enabled !== false);
      setTournamentsEnabled(data?.tournaments_enabled !== false);
    } catch {}
  };

  const updateUserRole = async (userId, role) => {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("set_user_role", { target_user: userId, new_role: role });
      if (rpcErr) {
        const { error: directErr } = await supabase.from("profiles").update({ role }).eq("id", userId);
        if (directErr) throw directErr;
      } else if (rpcData && !rpcData.success) throw new Error(rpcData.error || "Erreur changement de rôle");
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "change_role", details: { target_user: userId, new_role: role } }]);
      showMsg("success", "Rôle modifié avec succès");
      await fetchUsers(); await fetchAdmins();
      setShowRoleModal(false);
    } catch (err) { showMsg("error", err.message || "Erreur lors du changement de rôle"); }
  };

  const banUser = async (userId, duration) => {
    const banUntil = new Date();
    if (duration === "24h") banUntil.setHours(banUntil.getHours() + 24);
    else if (duration === "7d") banUntil.setDate(banUntil.getDate() + 7);
    else if (duration === "30d") banUntil.setDate(banUntil.getDate() + 30);
    else banUntil.setFullYear(banUntil.getFullYear() + 10);
    try {
      const { error } = await supabase.rpc("ban_user", { target_user: userId, banned_until: banUntil.toISOString(), banned_by: profile.id });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "ban_user", details: { target_user: userId, duration } }]);
      showMsg("success", "Utilisateur banni avec succès");
      await fetchUsers(); setShowBanModal(false);
    } catch (err) { showMsg("error", err.message || "Erreur lors du bannissement"); }
  };

  const unbanUser = async (userId) => {
    try {
      const { error } = await supabase.rpc("unban_user", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "unban_user", details: { target_user: userId } }]);
      showMsg("success", "Utilisateur débanni avec succès");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Erreur lors du débannissement"); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) return;
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_user", details: { target_user: userId } }]);
      showMsg("success", "Utilisateur supprimé définitivement");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Erreur lors de la suppression"); }
  };

  const grantCoins = async () => {
    if (!selectedUser) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) { showMsg("error", "Montant invalide"); return; }
    if (!grantReason.trim()) { showMsg("error", "La raison est obligatoire"); return; }
    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", { p_target_user_id: selectedUser.id, p_amount: amount, p_reason: grantReason });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      showMsg("success", `${amount > 0 ? "+" : ""}${amount} CP → ${selectedUser.display_name || selectedUser.username} (${data.new_balance} total)`, 4000);
      setGrantAmount(""); setGrantReason(""); setShowWalletModal(false);
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Erreur lors de l'ajustement des coins"); }
  };

  const deleteTournament = async (tournamentId) => {
    try {
      const { error } = await supabase.rpc("delete_tournament_complete", { tournament_id: tournamentId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_tournament", details: { tournament_id: tournamentId } }]);
      showMsg("success", "Tournoi supprimé avec succès");
      await fetchTournaments();
    } catch (err) { showMsg("error", err.message || "Erreur lors de la suppression"); }
  };

  const updateTournamentStatus = async (tournamentId, status) => {
    try {
      const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "update_tournament_status", details: { tournament_id: tournamentId, status } }]);
      showMsg("success", "Statut du tournoi mis à jour");
      setShowTournamentModal(false); await fetchTournaments();
    } catch (err) { showMsg("error", err.message || "Erreur lors de la mise à jour"); }
  };

  const resolveReport = async (reportId, action) => {
    try {
      const { error } = await supabase.from("reports").update({ status: "resolved", resolved_by: profile.id, resolved_action: action, resolved_at: new Date().toISOString() }).eq("id", reportId);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "resolve_report", details: { report_id: reportId, action } }]);
      showMsg("success", "Rapport résolu");
      await fetchReports();
    } catch (err) { showMsg("error", err.message || "Erreur lors de la résolution"); }
  };

  const updateSystemConfig = async () => {
    try {
      const { error } = await supabase.from("system_config").upsert({ maintenance_mode: maintenanceMode, registration_enabled: registrationEnabled, tournaments_enabled: tournamentsEnabled, updated_by: profile.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "update_system_config", details: { maintenanceMode, registrationEnabled, tournamentsEnabled } }]);
      showMsg("success", "Configuration système mise à jour");
    } catch (err) { showMsg("error", err.message || "Erreur"); }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.display_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.free_fire_id?.includes(search);
    if (filter === "all")      return matchSearch;
    if (filter === "admins")   return matchSearch && u.role === "admin";
    if (filter === "founders") return matchSearch && u.role === "founder";
    if (filter === "banned")   return matchSearch && u.role === "banned";
    if (filter === "pending")  return matchSearch && u.verification_status === "pending";
    return matchSearch;
  });

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Activity size={28} color={T.accent} style={{ animation: "sa-pulse 1.4s ease-in-out infinite" }} />
          <p style={{ color: T.text3, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Loading...</p>
        </div>
        <style>{`@keyframes sa-pulse { 0%,100%{opacity:0.4;transform:scale(0.95)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard",   label: "Dashboard",   icon: LayoutDashboard, count: null               },
    { id: "users",       label: "Users",        icon: Users,           count: users.length       },
    { id: "staff",       label: "Staff",        icon: ShieldCheck,     count: admins.length      },
    { id: "tournaments", label: "Tournaments",  icon: Trophy,          count: tournaments.length },
    { id: "reports",     label: "Reports",      icon: AlertTriangle,   count: reports.length     },
    { id: "economy",     label: "Economy",      icon: TrendingUp,      count: null               },
    { id: "security",    label: "Security",     icon: Lock,            count: null               },
    { id: "logs",        label: "Logs",         icon: FileText,        count: null               },
    { id: "system",      label: "System",       icon: Settings,        count: null               },
  ];

  const STAT_CARDS = [
    { label: "Total Users",    value: stats.totalUsers,           icon: Users,         color: "#6366f1" },
    { label: "Online",         value: stats.onlineUsers,          icon: Wifi,          color: "#10b981" },
    { label: "Banned",         value: stats.bannedUsers,          icon: ShieldOff,     color: "#ef4444" },
    { label: "Pending",        value: stats.pendingVerifications, icon: Clock,         color: "#f59e0b" },
    { label: "Tournaments",    value: stats.totalTournaments,     icon: Trophy,        color: "#8b5cf6" },
    { label: "Matches",        value: stats.totalMatches,         icon: Gamepad2,      color: "#06b6d4" },
    { label: "Open Tickets",   value: stats.openTickets,          icon: Ticket,        color: "#f97316" },
    { label: "Reports",        value: stats.totalReports,         icon: Flag,          color: "#ec4899" },
  ];

  const initials = (profile?.username || profile?.email || "?")[0]?.toUpperCase();

  // ─── Render ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
      <style>{`
        .sa-nav-btn { transition: background 0.12s, color 0.12s; }
        .sa-nav-btn:hover { background: rgba(255,255,255,0.06) !important; color: ${T.text} !important; }
        .sa-tab { transition: background 0.12s, color 0.12s, border-color 0.12s; }
        .sa-tab:hover { background: rgba(255,255,255,0.05) !important; color: ${T.text2} !important; }
        .sa-stat { transition: border-color 0.15s, background 0.15s; cursor: default; }
        .sa-stat:hover { border-color: rgba(99,102,241,0.3) !important; background: rgba(99,102,241,0.04) !important; }
      `}</style>

      {/* ═══ TOPBAR ═══ */}
      <header style={{ borderBottom: `1px solid ${T.border}`, background: T.surface, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={15} color="#fff" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: 0.3 }}>CipherPool</span>
              <span style={{ fontSize: 11, color: T.text3 }}>/</span>
              <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Super Admin</span>
            </div>

            {/* Status pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
              <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Operational</span>
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/admin" className="sa-nav-btn" style={{ padding: "6px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={13} /> Admin Panel
            </Link>
            <button onClick={() => navigate(0)} className="sa-nav-btn" style={{ padding: "6px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw size={13} />
            </button>

            {/* Profile dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setProfileMenuOpen(p => !p)}
                className="sa-nav-btn"
                style={{ padding: "4px 10px 4px 4px", borderRadius: 8, background: "transparent", border: `1px solid ${T.border}`, color: T.text2, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${T.border}`, overflow: "hidden", background: T.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : null}
                  <span style={{ fontSize: 10, fontWeight: 800, color: T.accent, display: profile?.avatar_url ? "none" : "block" }}>{initials}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{profile?.username || profile?.email?.split("@")[0]}</span>
                <ChevronRight size={12} style={{ opacity: 0.5, transform: profileMenuOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 200, ...S.card, padding: "6px", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  >
                    <button
                      onClick={() => { setShowProfileModal(true); setProfileMenuOpen(false); }}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "transparent", border: "none", color: T.text2, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                      className="sa-nav-btn"
                    >
                      <UserCircle2 size={15} color={T.text3} /> Modifier le profil
                    </button>
                    <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                    <button
                      onClick={() => navigate("/dashboard")}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "transparent", border: "none", color: T.text2, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                      className="sa-nav-btn"
                    >
                      <ArrowUpRight size={15} color={T.text3} /> Retour au site
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "28px 24px" }}>

        {/* Toast */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginBottom: 20, padding: "11px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: message.type === "success" ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: message.type === "success" ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600 }}
            >
              {message.type === "success" ? <Activity size={15} /> : <AlertTriangle size={15} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>Control Panel</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>Manage users, tournaments, and system settings</p>
        </div>

        {/* ─── Stats Grid ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {STAT_CARDS.map((s, i) => (
            <motion.div key={i} className="sa-stat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ ...S.card, padding: "16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={15} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1, marginBottom: 4 }}>{s.value.toLocaleString()}</div>
              <div style={{ ...S.label }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ─── Revenue row ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Revenue Today",    value: stats.todayRevenue,   color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
            { label: "Revenue This Month", value: stats.monthlyRevenue, color: "#06b6d4", bg: "rgba(6,182,212,0.08)" },
          ].map(c => (
            <div key={c.label} style={{ ...S.card, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={18} color={c.color} />
              </div>
              <div>
                <div style={{ ...S.label, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 }}>
                  {c.value.toLocaleString()} <span style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>CP</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tab Navigation ─── */}
        <div style={{ borderBottom: `1px solid ${T.border}`, display: "flex", gap: 2, marginBottom: 20, overflowX: "auto" }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id} className="sa-tab"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 16px", border: "none", borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                  background: active ? `${T.accent}0c` : "transparent",
                  color: active ? T.text : T.text3, cursor: "pointer",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                  marginBottom: -1,
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count !== null && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: active ? `${T.accent}20` : T.surface2, color: active ? T.accent : T.text3, fontWeight: 700 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Tab Content ─── */}
        <div style={{ ...S.card, padding: "16px", minHeight: 440 }}>
          <AnimatePresence mode="wait">
            {activeTab === "dashboard"   && <DashboardTab   key="dashboard"   stats={stats} users={users} logs={logs} setActiveTab={setActiveTab} setFilter={setFilter} setSelectedUser={setSelectedUser} setGrantAmount={setGrantAmount} setGrantReason={setGrantReason} setWalletSearch={setWalletSearch} setShowWalletModal={setShowWalletModal} />}
            {activeTab === "users"       && <UsersTab        key="users"       filteredUsers={filteredUsers} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setSelectedUser={setSelectedUser} setShowRoleModal={setShowRoleModal} setShowBanModal={setShowBanModal} setShowWalletModal={setShowWalletModal} unbanUser={unbanUser} deleteUser={deleteUser} />}
            {activeTab === "staff"       && <StaffTab        key="staff"       users={users} updateUserRole={updateUserRole} currentUserRole={profile?.role} />}
            {activeTab === "tournaments" && <TournamentsTab  key="tournaments" tournaments={tournaments} setSelectedTournament={setSelectedTournament} setShowTournamentModal={setShowTournamentModal} setTournamentToDelete={setTournamentToDelete} setShowDeleteConfirm={setShowDeleteConfirm} />}
            {activeTab === "reports"     && <ReportsTab      key="reports"     reports={reports} resolveReport={resolveReport} />}
            {activeTab === "economy"     && <EconomyTab      key="economy"     stats={stats} setMessage={setMessage} />}
            {activeTab === "security"    && <SecurityTab     key="security" />}
            {activeTab === "logs"        && <LogsTab         key="logs"        logs={logs} users={users} />}
            {activeTab === "system"      && <SystemTab       key="system"      maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode} registrationEnabled={registrationEnabled} setRegistrationEnabled={setRegistrationEnabled} tournamentsEnabled={tournamentsEnabled} setTournamentsEnabled={setTournamentsEnabled} updateSystemConfig={updateSystemConfig} />}
          </AnimatePresence>
        </div>

      </main>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal profile={profile} onClose={() => setShowProfileModal(false)} onSaved={updated => setProfile(prev => ({ ...prev, ...updated }))} />
        )}
        {showRoleModal && selectedUser && (
          <RoleModal selectedUser={selectedUser} updateUserRole={updateUserRole} onClose={() => setShowRoleModal(false)} />
        )}
        {showBanModal && selectedUser && (
          <BanModal selectedUser={selectedUser} banDuration={banDuration} setBanDuration={setBanDuration} banUser={banUser} onClose={() => setShowBanModal(false)} />
        )}
        {showWalletModal && (
          <WalletModal users={users} selectedUser={selectedUser} setSelectedUser={setSelectedUser} walletSearch={walletSearch} setWalletSearch={setWalletSearch} grantAmount={grantAmount} setGrantAmount={setGrantAmount} grantReason={grantReason} setGrantReason={setGrantReason} grantCoins={grantCoins} onClose={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }} />
        )}
        {showTournamentModal && selectedTournament && (
          <TournamentModal selectedTournament={selectedTournament} tournamentStatus={tournamentStatus} setTournamentStatus={setTournamentStatus} updateTournamentStatus={updateTournamentStatus} onClose={() => setShowTournamentModal(false)} />
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
            onClose={() => { setShowDeleteConfirm(false); setTournamentToDelete(null); }}
          />
        )}
      </AnimatePresence>

      {/* Close profile menu on outside click */}
      {profileMenuOpen && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setProfileMenuOpen(false)} />}
    </div>
  );
}