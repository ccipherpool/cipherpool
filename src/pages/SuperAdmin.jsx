import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

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
import ProfileModal     from "./superadmin/modals/ProfileModal";

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
    { label: "UTILISATEURS", value: stats.totalUsers,           color: "text-blue-500",   icon: "👥", rotation: "rotate-[-1deg]" },
    { label: "EN LIGNE",     value: stats.onlineUsers,          color: "text-green-500",  icon: "🟢", rotation: "rotate-[1deg]" },
    { label: "BANNIS",       value: stats.bannedUsers,          color: "text-red-500",    icon: "🚫", rotation: "rotate-[-2deg]" },
    { label: "EN ATTENTE",   value: stats.pendingVerifications, color: "text-amber-500",  icon: "⏳", rotation: "rotate-[2deg]" },
    { label: "TOURNOIS",     value: stats.totalTournaments,     color: "text-purple-500", icon: "🏆", rotation: "rotate-[-1.5deg]" },
    { label: "MATCHES",      value: stats.totalMatches,         color: "text-cyan-500",   icon: "🎮", rotation: "rotate-[1.5deg]" },
    { label: "TICKETS",      value: stats.openTickets,          color: "text-orange-500", icon: "🎟️", rotation: "rotate-[-1deg]" },
    { label: "RAPPORTS",     value: stats.totalReports,         color: "text-pink-500",   icon: "🚨", rotation: "rotate-[1deg]" },
  ];

  return (
    <div className="text-zinc-900 dark:text-white space-y-10 relative overflow-hidden min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8 mb-12">
          <div className="relative group rotate-[-0.5deg]">
            <div className="absolute inset-0 bg-purple-500/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-white p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px] shadow-zinc-900 dark:shadow-white">
              <h1 className="text-4xl md:text-7xl font-handwritten font-bold mb-2">
                SUPER <span className="text-purple-500 underline decoration-wavy">ADMIN</span>
                <span className="ml-4 inline-flex px-4 py-1 bg-amber-400 text-zinc-900 border-2 border-zinc-900 text-xl rounded-full shadow-[4px_4px_0px_0px] shadow-zinc-900 rotate-12">v2.0 🚀</span>
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-3 group"
                  title="Modifier mon profil"
                >
                  <div className="relative w-10 h-10 rounded-full border-2 border-zinc-900 dark:border-white overflow-hidden bg-purple-100 dark:bg-purple-900 shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center font-handwritten font-bold text-purple-600 dark:text-purple-300 text-lg">
                        {(profile?.username || profile?.email || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="font-handwritten text-2xl text-zinc-500 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse shrink-0" />
                    Bienvenue, <span className="text-zinc-900 dark:text-white group-hover:text-purple-500 transition-colors">{profile?.username || profile?.full_name || profile?.email?.split("@")[0]}</span> ✨
                  </p>
                </button>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="text-xs font-handwritten text-zinc-400 hover:text-purple-500 transition-colors border border-zinc-200 dark:border-zinc-700 hover:border-purple-400 px-3 py-1 rounded-full"
                >
                  ✏️ Modifier profil
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 shrink-0 lg:rotate-[1deg]">
            <Link to="/admin" className="btn-creative bg-blue-500 text-white hover:bg-blue-400 text-2xl px-8 py-4">
              ADMIN PANNEL 🛡️
            </Link>
            <button onClick={() => navigate(0)} className="btn-creative bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-2xl px-8 py-4">
              ⟲ Refresh 📡
            </button>
          </div>
        </motion.div>

        {/* Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.9, rotate: 1 }}
              className={cn(
                "p-6 rounded-2xl border-4 font-handwritten text-2xl shadow-[6px_6px_0px_0px]",
                message.type === "success" 
                  ? "bg-green-100 border-green-500 text-green-700 shadow-green-500" 
                  : "bg-red-100 border-red-500 text-red-700 shadow-red-500"
              )}>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6 mb-12">
          {STAT_CARDS.map((item, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              onHoverStart={() => setHoveredCard(index)} onHoverEnd={() => setHoveredCard(null)}
              className={cn(
                "card-creative p-6 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900 group",
                item.rotation
              )}>
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-300 drop-shadow-sm">{item.icon}</div>
              <p className="font-handwritten text-lg text-zinc-500 mb-1 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.label}</p>
              <p className={cn("text-3xl font-bold font-handwritten", item.color)}>{item.value.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
          {[
            { label: "REVENU AUJOURD'HUI 💰", value: stats.todayRevenue,  color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-500", rotation: "rotate-[-1deg]" },
            { label: "REVENU CE MOIS 📈",     value: stats.monthlyRevenue, color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-500",   rotation: "rotate-[1deg]"   },
          ].map(card => (
            <motion.div key={card.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn(
                "card-creative p-8 bg-white dark:bg-zinc-900 group",
                card.rotation
              )}
              whileHover={{ scale: 1.02 }}>
              <p className="font-handwritten text-2xl text-zinc-500 mb-2">{card.label}</p>
              <p className={cn("text-5xl font-bold font-handwritten", card.color)}>{card.value} <span className="text-2xl text-zinc-400">coins</span></p>
              <div className={cn("mt-4 h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border-2 border-zinc-900 dark:border-white shadow-[2px_2px_0px_0px] shadow-zinc-900 dark:shadow-white")}>
                <div className={cn("h-full bg-gradient-to-r from-transparent to-current", card.color)} style={{ width: '65%' }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-4 mb-12 pb-4 overflow-x-auto scrollbar-hide border-b-4 border-zinc-900 dark:border-white">
          {TABS.map((tab, idx) => {
            const active = activeTab === tab.id;
            return (
              <motion.button key={tab.id} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-8 py-3 font-handwritten text-2xl border-2 transition-all relative whitespace-nowrap",
                  active 
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white rounded-t-2xl translate-y-1 shadow-[4px_-4px_0px_0px] shadow-zinc-400" 
                    : "bg-white dark:bg-zinc-900 text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white"
                )}>
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="relative">
          <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none opacity-10 dark:opacity-5">
            <div className="absolute top-0 left-0 text-[20rem] rotate-12 font-handwritten">✎</div>
            <div className="absolute bottom-0 right-0 text-[20rem] -rotate-12 font-handwritten">✏️</div>
          </div>
          
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
          {showProfileModal && (
            <ProfileModal
              profile={profile}
              onClose={() => setShowProfileModal(false)}
              onSaved={(updated) => setProfile(prev => ({ ...prev, ...updated }))}
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
