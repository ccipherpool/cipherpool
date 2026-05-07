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
  const [hoveredCard, setHoveredCard] = useState(null);

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
    if (filter === "all")     return matchSearch;
    if (filter === "admins")  return matchSearch && u.role === "admin";
    if (filter === "founders") return matchSearch && u.role === "founder";
    if (filter === "banned")  return matchSearch && u.role === "banned";
    if (filter === "pending") return matchSearch && u.verification_status === "pending";
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm font-mono tracking-widest">CHARGEMENT...</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "dashboard",   label: `📊 DASHBOARD`,                          color: "purple" },
    { id: "users",       label: `👥 USERS (${users.length})`,             color: "blue"   },
    { id: "staff",       label: `🛡️ STAFF (${admins.length})`,            color: "cyan"   },
    { id: "tournaments", label: `🏆 TOURNOIS (${tournaments.length})`,    color: "green"  },
    { id: "reports",     label: `🚨 RAPPORTS (${reports.length})`,        color: "red"    },
    { id: "economy",     label: `💰 ÉCONOMIE`,                            color: "yellow" },
    { id: "security",    label: `🛡️ SÉCURITÉ`,                            color: "orange" },
    { id: "logs",        label: `📋 LOGS`,                                color: "gray"   },
    { id: "system",      label: `⚙️ SYSTÈME`,                             color: "purple" },
  ];

  const STAT_CARDS = [
    { label: "UTILISATEURS", value: stats.totalUsers,           color: "from-blue-600 to-cyan-600",     icon: "👥" },
    { label: "EN LIGNE",     value: stats.onlineUsers,          color: "from-green-600 to-emerald-600", icon: "🟢" },
    { label: "BANNIS",       value: stats.bannedUsers,          color: "from-red-600 to-pink-600",      icon: "🚫" },
    { label: "EN ATTENTE",   value: stats.pendingVerifications, color: "from-yellow-600 to-orange-600", icon: "⏳" },
    { label: "TOURNOIS",     value: stats.totalTournaments,     color: "from-purple-600 to-indigo-600", icon: "🏆" },
    { label: "MATCHES",      value: stats.totalMatches,         color: "from-cyan-600 to-blue-600",     icon: "🎮" },
    { label: "TICKETS",      value: stats.openTickets,          color: "from-orange-600 to-red-600",    icon: "🎟️" },
    { label: "RAPPORTS",     value: stats.totalReports,         color: "from-pink-600 to-purple-600",   icon: "🚨" },
  ];

  return (
    <div className="text-white space-y-6 relative overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/25 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1.2s" }} />
        <div className="absolute top-[20%] right-[15%] w-64 h-64 bg-violet-500/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[25%] left-[10%] w-48 h-48 bg-blue-600/12 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-black mb-2 relative">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">SUPER ADMIN</span>
              <span className="absolute -top-3 -right-3 px-2 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-xs rounded-full shadow-lg shadow-purple-500/50">v2.0</span>
            </h1>
            <p className="text-white/40 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Bienvenue, {profile?.username || profile?.full_name || profile?.email?.split("@")[0]} - Contrôle total de la plateforme
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="group relative px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50">
              <span className="relative z-10">PANEL ADMIN</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition" />
            </Link>
            <button onClick={() => navigate(0)} className="px-6 py-3 bg-[#11152b] border border-purple-500/30 rounded-xl text-white/60 hover:text-white hover:border-purple-500 transition-all duration-300 hover:scale-105">
              ⟲ RAFRAÎCHIR
            </button>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl border ${message.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          {STAT_CARDS.map((item, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              onHoverStart={() => setHoveredCard(index)} onHoverEnd={() => setHoveredCard(null)}
              className="group relative bg-[#0a0a1a] rounded-xl p-4 overflow-hidden cursor-pointer"
              style={{ boxShadow: hoveredCard === index ? `0 20px 40px -10px ${item.color.split(" ")[0].replace("from-", "")}80` : "0 10px 20px -5px rgba(0,0,0,0.5)" }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
              <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:opacity-10 transition-opacity">{item.icon}</div>
              <p className="text-xs text-white/40 mb-2 relative z-10">{item.label}</p>
              <p className="text-2xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform origin-left">{item.value.toLocaleString()}</p>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${item.color} w-0 group-hover:w-full transition-all duration-500`} />
            </motion.div>
          ))}
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: "REVENU AUJOURD'HUI", value: stats.todayRevenue,  color: "from-purple-600/20 to-cyan-600/20", border: "border-purple-500/30" },
            { label: "REVENU CE MOIS",     value: stats.monthlyRevenue, color: "from-cyan-600/20 to-purple-600/20", border: "border-cyan-500/30"   },
          ].map(card => (
            <motion.div key={card.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`relative bg-gradient-to-r ${card.color} border ${card.border} rounded-xl p-6 overflow-hidden group`}
              whileHover={{ scale: 1.02 }}>
              <p className="text-sm text-white/40 mb-2">{card.label}</p>
              <p className="text-3xl font-bold text-white">{card.value} <span className="text-sm text-white/40">coins</span></p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-cyan-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(124,58,237,0.2)", overflowX: "auto" }}>
          {TABS.map(tab => {
            const color = TAB_COLORS[tab.color];
            const active = activeTab === tab.id;
            return (
              <motion.button key={tab.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, fontFamily: "JetBrains Mono,monospace", letterSpacing: 0.5, whiteSpace: "nowrap", background: "none", border: "none", cursor: "pointer", color: active ? color : "rgba(255,255,255,0.4)", transition: "color .2s", borderBottom: `2px solid ${active ? color : "transparent"}` }}>
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
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

        {/* Modals */}
        <AnimatePresence>
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
              onClose={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }}
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
              deleteTournament={async (id) => {
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
    </div>
  );
}
