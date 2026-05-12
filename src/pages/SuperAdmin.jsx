import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

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

if (typeof document !== "undefined" && !document.getElementById("sa-fonts")) {
  const s = document.createElement("style");
  s.id = "sa-fonts";
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');`;
  document.head.appendChild(s);
}

const TAB_COLORS = {
  purple: "#a855f7", blue: "#60a5fa", cyan: "#22d3ee",
  green: "#4ade80",  red: "#f87171",  yellow: "#facc15",
  orange: "#fb923c", gray: "#9ca3af",
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
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: walletsData } = await supabase.from("wallets").select("user_id, balance");
      const walletMap = {};
      (walletsData || []).forEach(w => { walletMap[w.user_id] = w.balance; });
      setUsers((profilesData || []).map(u => ({
        ...u,
        coins: walletMap[u.id] || 0,
        stats: { tournaments_played: 0, wins: 0 },
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Inconnu",
      })));
    } catch (err) {
      if (import.meta.env.DEV) console.error("fetchUsers:", err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").in("role", ["admin", "super_admin", "founder", "fondateur", "designer"]).order("created_at", { ascending: false });
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("fetchAdmins:", err);
    }
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
    const safeCount = async (query) => {
      try { const r = await query; return r.count || 0; } catch (_e) { return 0; }
    };
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
      try { const { data: w } = await supabase.from("wallets").select("balance"); totalCoins = (w || []).reduce((s, x) => s + (x.balance || 0), 0); } catch (_e) {}
      setStats({ totalUsers, onlineUsers: 0, totalTournaments, activeTournaments, totalMatches, totalCoins, totalReports, bannedUsers, pendingVerifications: pendingVerif, openTickets, todayRevenue: 0, monthlyRevenue: 0 });
    } catch (err) {
      if (import.meta.env.DEV) console.error("fetchStats:", err);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const { data, error } = await supabase.from("system_config").select("*").single();
      if (error && error.code !== "PGRST116") throw error;
      setMaintenanceMode(data?.maintenance_mode || false);
      setRegistrationEnabled(data?.registration_enabled !== false);
      setTournamentsEnabled(data?.tournaments_enabled !== false);
    } catch (_err) {}
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
      const sign = amount > 0 ? "+" : "";
      showMsg("success", `${sign}${amount} coins → ${selectedUser.display_name || selectedUser.username} (solde: ${data.new_balance})`, 4000);
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

  // ─── LOADING ───
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07070f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes sa-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'sa-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Orbitron,sans-serif', letterSpacing: 4 }}>INITIALIZING...</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard",   label: "DASHBOARD",  count: null,               color: "purple" },
    { id: "users",       label: "USERS",       count: users.length,       color: "blue"   },
    { id: "staff",       label: "STAFF",       count: admins.length,      color: "cyan"   },
    { id: "tournaments", label: "TOURNOIS",    count: tournaments.length, color: "green"  },
    { id: "reports",     label: "RAPPORTS",    count: reports.length,     color: "red"    },
    { id: "economy",     label: "ÉCONOMIE",    count: null,               color: "yellow" },
    { id: "security",    label: "SÉCURITÉ",    count: null,               color: "orange" },
    { id: "logs",        label: "LOGS",        count: null,               color: "gray"   },
    { id: "system",      label: "SYSTÈME",     count: null,               color: "purple" },
  ];

  const STAT_CARDS = [
    { label: "UTILISATEURS", value: stats.totalUsers,           accent: "#60a5fa", glow: "rgba(96,165,250,0.15)",   icon: "👥" },
    { label: "EN LIGNE",     value: stats.onlineUsers,          accent: "#4ade80", glow: "rgba(74,222,128,0.15)",   icon: "◉"  },
    { label: "BANNIS",       value: stats.bannedUsers,          accent: "#f87171", glow: "rgba(248,113,113,0.15)",  icon: "⊘"  },
    { label: "EN ATTENTE",   value: stats.pendingVerifications, accent: "#fbbf24", glow: "rgba(251,191,36,0.15)",   icon: "◷"  },
    { label: "TOURNOIS",     value: stats.totalTournaments,     accent: "#a78bfa", glow: "rgba(167,139,250,0.15)",  icon: "◆"  },
    { label: "MATCHES",      value: stats.totalMatches,         accent: "#22d3ee", glow: "rgba(34,211,238,0.15)",   icon: "⚔"  },
    { label: "TICKETS",      value: stats.openTickets,          accent: "#fb923c", glow: "rgba(251,146,60,0.15)",   icon: "◈"  },
    { label: "RAPPORTS",     value: stats.totalReports,         accent: "#f472b6", glow: "rgba(244,114,182,0.15)",  icon: "⚑"  },
  ];

  const initials = (profile?.username || profile?.email || '?')[0]?.toUpperCase();

  // ─── RENDER ───
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #07070f 0%, #0c0c1c 100%)', color: '#fff', fontFamily: 'Rajdhani, sans-serif', position: 'relative' }}>
      <style>{`
        @keyframes sa-spin { to { transform: rotate(360deg); } }
        .sa-stat  { transition: border-color 0.18s, background 0.18s, transform 0.18s; }
        .sa-stat:hover  { border-color: rgba(139,92,246,0.28) !important; background: rgba(139,92,246,0.06) !important; transform: translateY(-2px); }
        .sa-tab   { transition: all 0.15s; }
        .sa-tab:hover   { color: rgba(255,255,255,0.75) !important; }
        .sa-ibtn  { transition: all 0.15s; }
        .sa-ibtn:hover  { border-color: rgba(255,255,255,0.14) !important; background: rgba(255,255,255,0.06) !important; }
        .sa-pfbtn { transition: all 0.15s; }
        .sa-pfbtn:hover { border-color: rgba(139,92,246,0.35) !important; background: rgba(139,92,246,0.06) !important; }
      `}</style>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -350, left: -250, width: 850, height: 850, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 68%)' }} />
        <div style={{ position: 'absolute', bottom: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.045) 0%, transparent 68%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto', padding: '22px 18px' }}>

        {/* ══════ HEADER ══════ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22, padding: '15px 20px', background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, backdropFilter: 'blur(20px)' }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 18px rgba(139,92,246,0.4)', flexShrink: 0 }}>⚡</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 16, fontWeight: 900, margin: 0, fontFamily: 'Orbitron,sans-serif', letterSpacing: 2.5, color: '#fff' }}>SUPER ADMIN</h1>
                <span style={{ fontSize: 8, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.28)', color: '#a78bfa', fontWeight: 700, letterSpacing: 2, fontFamily: 'Orbitron,sans-serif' }}>v2.0</span>
              </div>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 3.5, textTransform: 'uppercase', fontFamily: 'Orbitron,sans-serif' }}>Command &amp; Control Center</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/admin" className="sa-ibtn" style={{ padding: '8px 15px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.14)', color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textDecoration: 'none', fontFamily: 'Orbitron,sans-serif' }}>
              ◈ ADMIN
            </Link>
            <button onClick={() => navigate(0)} className="sa-ibtn" style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 15, cursor: 'pointer' }}>⟲</button>

            {/* Profile */}
            <button onClick={() => setShowProfileModal(true)} className="sa-pfbtn" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 13px 6px 6px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.065)', cursor: 'pointer' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.5)', overflow: 'hidden', background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url} alt="" draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <span style={{ fontSize: 11, fontWeight: 900, color: '#a78bfa', fontFamily: 'Orbitron,sans-serif', display: profile?.avatar_url ? 'none' : 'block' }}>
                  {initials}
                </span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{profile?.username || profile?.email?.split('@')[0]}</div>
                <div style={{ fontSize: 8, color: '#8b5cf6', letterSpacing: 1.8, fontFamily: 'Orbitron,sans-serif' }}>SUPER ADMIN</div>
              </div>
            </button>
          </div>
        </motion.div>

        {/* ══════ TOAST ══════ */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, background: message.type === 'success' ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`, color: message.type === 'success' ? '#4ade80' : '#f87171', fontSize: 14, fontWeight: 600 }}
            >
              <span style={{ fontSize: 16 }}>{message.type === 'success' ? '✓' : '⚠'}</span>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════ STATS GRID ══════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 10, marginBottom: 12 }}>
          {STAT_CARDS.map((item, i) => (
            <motion.div
              key={i} className="sa-stat"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ padding: '15px 13px', borderRadius: 13, background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.055)', display: 'flex', flexDirection: 'column', gap: 5, cursor: 'default' }}
            >
              <div style={{ fontSize: 15, color: item.accent }}>{item.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Orbitron,sans-serif', color: '#fff', lineHeight: 1 }}>{item.value.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ══════ REVENUE ══════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginBottom: 18 }}>
          {[
            { label: "Revenu Aujourd'hui", value: stats.todayRevenue,   accent: '#a78bfa', bar: 'rgba(139,92,246,0.35)' },
            { label: 'Revenu Ce Mois',     value: stats.monthlyRevenue, accent: '#22d3ee', bar: 'rgba(6,182,212,0.35)'  },
          ].map(c => (
            <div key={c.label} style={{ padding: '15px 18px', borderRadius: 13, background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(255,255,255,0.055)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: 'Orbitron,sans-serif', marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Orbitron,sans-serif', color: c.accent, marginBottom: 10 }}>
                {c.value.toLocaleString()} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>CP</span>
              </div>
              <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: '65%', borderRadius: 2, background: c.bar }} />
              </div>
            </div>
          ))}
        </div>

        {/* ══════ TABS NAV ══════ */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: 'rgba(255,255,255,0.016)', border: '1px solid rgba(255,255,255,0.048)', borderRadius: 13, padding: 4, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            const color  = TAB_COLORS[tab.color] || '#8b5cf6';
            return (
              <motion.button
                key={tab.id} whileTap={{ scale: 0.96 }} className="sa-tab"
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active ? `${color}16` : 'transparent', color: active ? color : 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 700, letterSpacing: 1.8, fontFamily: 'Orbitron,sans-serif', whiteSpace: 'nowrap', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', boxShadow: active ? `0 0 12px ${color}1a` : 'none', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 7, background: active ? `${color}22` : 'rgba(255,255,255,0.06)', color: active ? color : 'rgba(255,255,255,0.28)' }}>
                    {tab.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ══════ TAB CONTENT ══════ */}
        <div style={{ background: 'rgba(255,255,255,0.012)', border: '1px solid rgba(255,255,255,0.045)', borderRadius: 16, padding: '16px', minHeight: 420 }}>
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

      </div>

      {/* ══════ MODALS ══════ */}
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
    </div>
  );
}
