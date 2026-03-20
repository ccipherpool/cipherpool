// src/pages/SuperAdmin.jsx — FIXED: real stats + auto-refresh + no Math.random()

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

if (typeof document !== "undefined" && !document.getElementById("sa-fonts")) {
  const s = document.createElement("style");
  s.id = "sa-fonts";
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600;700&display=swap');`;
  document.head.appendChild(s);
}

// ── دالة مساعدة : قرا عدد بأمان بدون crash ──────────────────────
const safeCount = async (query) => {
  try {
    const r = await query;
    if (r.error) return 0;
    return r.count ?? 0;
  } catch { return 0; }
};

export default function SuperAdmin() {
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("dashboard");

  const [users,       setUsers]       = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reports,     setReports]     = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [admins,      setAdmins]      = useState([]);

  const [stats, setStats] = useState({
    totalUsers: 0, onlineUsers: 0, bannedUsers: 0,
    pendingVerifications: 0, totalTournaments: 0, activeTournaments: 0,
    totalMatches: 0, totalCoins: 0, totalReports: 0, openTickets: 0,
    newToday: 0, liveMatches: 0, todayRevenue: 0, monthlyRevenue: 0,
    conversionRate: 0,
  });

  const [lastRefresh, setLastRefresh] = useState(null);

  // Modals
  const [selectedUser,       setSelectedUser]       = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRoleModal,      setShowRoleModal]      = useState(false);
  const [showBanModal,       setShowBanModal]       = useState(false);
  const [showTournamentModal,setShowTournamentModal]= useState(false);
  const [showWalletModal,    setShowWalletModal]    = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [deleteLoading,      setDeleteLoading]      = useState(false);
  const [walletSearch,       setWalletSearch]       = useState("");
  const [banDuration,        setBanDuration]        = useState("24h");
  const [newRole,            setNewRole]            = useState("user");
  const [tournamentStatus,   setTournamentStatus]   = useState("open");
  const [search,             setSearch]             = useState("");
  const [filter,             setFilter]             = useState("all");
  const [message,            setMessage]            = useState({ type: "", text: "" });
  const [grantAmount,        setGrantAmount]        = useState("");
  const [grantReason,        setGrantReason]        = useState("");
  const [maintenanceMode,    setMaintenanceMode]    = useState(false);
  const [registrationEnabled,setRegistrationEnabled]= useState(true);
  const [tournamentsEnabled, setTournamentsEnabled] = useState(true);
  const [hoveredCard,        setHoveredCard]        = useState(null);
  const [error,              setError]              = useState(null);

  // ══════════════════════════════════════════════════════════════
  // FETCH STATS — بيانات حقيقية 100% بدون Math.random()
  // ══════════════════════════════════════════════════════════════
  const fetchStats = useCallback(async () => {
    try {
      const today      = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const online15   = new Date(Date.now() - 15 * 60 * 1000); // آخر 15 دقيقة

      const [
        totalUsers, bannedUsers, pendingVerif,
        totalTournaments, activeTournaments,
        totalMatches, liveMatches,
        totalReports, openTickets, newToday,
        onlineUsers,
      ] = await Promise.all([
        safeCount(supabase.from("profiles").select("*", { count:"exact", head:true })),
        safeCount(supabase.from("profiles").select("*", { count:"exact", head:true }).eq("role","banned")),
        safeCount(supabase.from("profiles").select("*", { count:"exact", head:true }).eq("verification_status","pending")),
        safeCount(supabase.from("tournaments").select("*", { count:"exact", head:true })),
        safeCount(supabase.from("tournaments").select("*", { count:"exact", head:true }).eq("status","open")),
        safeCount(supabase.from("match_results").select("*", { count:"exact", head:true })),
        safeCount(supabase.from("match_results").select("*", { count:"exact", head:true }).eq("status","pending")),
        safeCount(supabase.from("reports").select("*", { count:"exact", head:true }).eq("status","pending")),
        safeCount(supabase.from("support_tickets").select("*", { count:"exact", head:true }).in("status",["open","pending"])),
        safeCount(supabase.from("profiles").select("*", { count:"exact", head:true }).gte("created_at", today.toISOString())),
        // Online users = اللي عندهم last_seen في آخر 15 دقيقة (إذا الكولوم موجود)
        safeCount(supabase.from("profiles").select("*", { count:"exact", head:true }).gte("last_seen", online15.toISOString())),
      ]);

      // Coins
      let totalCoins = 0;
      try {
        const { data: wallets } = await supabase.from("wallets").select("balance");
        totalCoins = (wallets || []).reduce((s, w) => s + (w.balance || 0), 0);
      } catch {}

      // Coins échangés aujourd'hui (transactions du jour)
      let todayCoins = 0;
      try {
        const { data: txToday } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .gte("created_at", today.toISOString())
          .gt("amount", 0);
        todayCoins = (txToday || []).reduce((s, t) => s + (t.amount || 0), 0);
      } catch {}

      // Coins du mois
      let monthCoins = 0;
      try {
        const { data: txMonth } = await supabase
          .from("wallet_transactions")
          .select("amount")
          .gte("created_at", monthStart.toISOString())
          .gt("amount", 0);
        monthCoins = (txMonth || []).reduce((s, t) => s + (t.amount || 0), 0);
      } catch {}

      // Taux de conversion = joueurs ayant joué au moins 1 tournoi / total users
      let conversionRate = 0;
      try {
        const played = await safeCount(
          supabase.from("tournament_participants").select("user_id", { count:"exact", head:true })
        );
        conversionRate = totalUsers > 0 ? Math.round((played / totalUsers) * 100) : 0;
      } catch {}

      setStats({
        totalUsers, onlineUsers, bannedUsers,
        pendingVerifications: pendingVerif,
        totalTournaments, activeTournaments,
        totalMatches, liveMatches,
        totalCoins, totalReports, openTickets,
        newToday, todayRevenue: todayCoins,
        monthlyRevenue: monthCoins, conversionRate,
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error("fetchStats:", err);
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  const fetchUsers = useCallback(async () => {
    try {
      const { data: profilesData, error: pErr } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (pErr) throw pErr;

      const { data: walletsData } = await supabase.from("wallets").select("user_id, balance");
      const walletMap = {};
      (walletsData || []).forEach(w => { walletMap[w.user_id] = w.balance; });

      setUsers((profilesData || []).map(u => ({
        ...u,
        coins: walletMap[u.id] || 0,
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Inconnu",
      })));
    } catch (err) { console.error("fetchUsers:", err); }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("profiles")
        .select("*").in("role", ["admin","super_admin","founder","fondateur"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAdmins(data || []);
    } catch (err) { console.error("fetchAdmins:", err); }
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("tournaments")
        .select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      setTournaments(data || []);
    } catch { setTournaments([]); }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("reports")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch { setReports([]); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("admin_logs")
        .select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch { setLogs([]); }
  }, []);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_config").select("*").single();
      if (data) {
        setMaintenanceMode(data.maintenance_mode || false);
        setRegistrationEnabled(data.registration_enabled !== false);
        setTournamentsEnabled(data.tournaments_enabled !== false);
      }
    } catch {}
  }, []);

  // ══════════════════════════════════════════════════════════════
  // INIT — تحقق من super_admin ثم جلب كل البيانات
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data, error } = await supabase
          .from("profiles").select("*").eq("id", user.id).single();

        if (error || !data || data.role !== "super_admin") {
          navigate("/dashboard"); return;
        }

        setProfile(data);

        // Fetch tout en parallèle
        await Promise.all([
          fetchStats(), fetchUsers(), fetchTournaments(),
          fetchReports(), fetchLogs(), fetchAdmins(), fetchSystemConfig(),
        ]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ══════════════════════════════════════════════════════════════
  // AUTO-REFRESH — كل 30 ثانية (بعد ما profile يتحمّل)
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!profile) return;

    intervalRef.current = setInterval(() => {
      fetchStats();
      fetchUsers();
      fetchTournaments();
      fetchReports();
      fetchLogs();
    }, 30000);

    return () => clearInterval(intervalRef.current);
  }, [profile]);

  // تحديث last_seen ديال المستخدم الحالي
  useEffect(() => {
    if (!profile) return;
    const updateSeen = () => {
      supabase.from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", profile.id)
        .then(() => {});
    };
    updateSeen();
    const seen = setInterval(updateSeen, 60000);
    return () => clearInterval(seen);
  }, [profile]);

  // ══════════════════════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════════════════════
  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const updateUserRole = async (userId, role) => {
    try {
      // RPC d'abord, fallback direct
      const { error: rpcErr } = await supabase.rpc("set_user_role", {
        target_user: userId, new_role: role,
      });
      if (rpcErr) {
        const { error: dErr } = await supabase.from("profiles")
          .update({ role }).eq("id", userId);
        if (dErr) throw dErr;
      }
      await supabase.from("admin_logs").insert([{
        user_id: profile.id, action: "change_role",
        details: { target_user: userId, new_role: role },
      }]);
      showMsg("success", "Rôle modifié ✅");
      fetchUsers(); fetchAdmins();
      setShowRoleModal(false);
    } catch (err) { showMsg("error", err.message); }
  };

  const banUser = async (userId, duration) => {
    const banUntil = new Date();
    if (duration === "24h") banUntil.setHours(banUntil.getHours() + 24);
    else if (duration === "7d") banUntil.setDate(banUntil.getDate() + 7);
    else if (duration === "30d") banUntil.setDate(banUntil.getDate() + 30);
    else banUntil.setFullYear(banUntil.getFullYear() + 10);

    try {
      const { error } = await supabase.rpc("ban_user", {
        target_user: userId, banned_until: banUntil.toISOString(), banned_by: profile.id,
      });
      if (error) throw error;
      showMsg("success", "Utilisateur banni ✅");
      fetchUsers(); fetchStats();
      setShowBanModal(false);
    } catch (err) { showMsg("error", err.message); }
  };

  const unbanUser = async (userId) => {
    try {
      const { error } = await supabase.rpc("unban_user", { target_user: userId });
      if (error) throw error;
      showMsg("success", "Utilisateur débanni ✅");
      fetchUsers(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Supprimer définitivement cet utilisateur ?")) return;
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      showMsg("success", "Utilisateur supprimé ✅");
      fetchUsers(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const grantCoins = async () => {
    if (!selectedUser) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) { showMsg("error", "Montant invalide"); return; }
    if (!grantReason.trim()) { showMsg("error", "La raison est obligatoire"); return; }
    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", {
        p_target_user_id: selectedUser.id, p_amount: amount, p_reason: grantReason,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      const sign = amount > 0 ? "+" : "";
      showMsg("success", `${sign}${amount} coins → ${selectedUser.display_name || selectedUser.username} (solde: ${data.new_balance})`);
      setGrantAmount(""); setGrantReason("");
      setShowWalletModal(false);
      fetchUsers(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const updateTournamentStatus = async (tournamentId, status) => {
    try {
      const { error } = await supabase.from("tournaments")
        .update({ status }).eq("id", tournamentId);
      if (error) throw error;
      showMsg("success", "Statut du tournoi mis à jour ✅");
      setShowTournamentModal(false);
      fetchTournaments(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const deleteTournament = async (tournamentId) => {
    try {
      const { error } = await supabase.rpc("delete_tournament_complete", { tournament_id: tournamentId });
      if (error) throw error;
      showMsg("success", "Tournoi supprimé ✅");
      fetchTournaments(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const resolveReport = async (reportId, action) => {
    try {
      const { error } = await supabase.from("reports").update({
        status: "resolved", resolved_by: profile.id,
        resolved_action: action, resolved_at: new Date().toISOString(),
      }).eq("id", reportId);
      if (error) throw error;
      showMsg("success", "Rapport résolu ✅");
      fetchReports(); fetchStats();
    } catch (err) { showMsg("error", err.message); }
  };

  const updateSystemConfig = async () => {
    try {
      const { error } = await supabase.from("system_config").upsert({
        maintenance_mode: maintenanceMode,
        registration_enabled: registrationEnabled,
        tournaments_enabled: tournamentsEnabled,
        updated_by: profile.id, updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      showMsg("success", "Configuration sauvegardée ✅");
    } catch (err) { showMsg("error", err.message); }
  };

  const manualRefresh = async () => {
    await Promise.all([
      fetchStats(), fetchUsers(), fetchTournaments(),
      fetchReports(), fetchLogs(), fetchAdmins(),
    ]);
    showMsg("success", "Données mises à jour ✅");
  };

  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    const matchSearch = u.display_name?.toLowerCase().includes(s)
      || u.email?.toLowerCase().includes(s)
      || u.free_fire_id?.includes(s);
    if (filter === "all")     return matchSearch;
    if (filter === "admins")  return matchSearch && u.role === "admin";
    if (filter === "founders")return matchSearch && ["founder","fondateur"].includes(u.role);
    if (filter === "banned")  return matchSearch && u.role === "banned";
    if (filter === "pending") return matchSearch && u.verification_status === "pending";
    return matchSearch;
  });

  // ══════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60">Chargement du panneau de contrôle...</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#030014] text-white relative overflow-hidden">

      {/* Fond animé */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(124,58,237,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.05) 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">

        {/* ─── Header ─── */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
          className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-black">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                SUPER ADMIN
              </span>
              <span className="ml-2 text-xs px-2 py-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full">v2.0</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-white/40 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                {profile?.username || profile?.email?.split("@")[0]} — Contrôle total
              </p>
              {lastRefresh && (
                <span className="text-white/20 text-xs">
                  ↻ {lastRefresh.toLocaleTimeString("fr-FR")}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/admin"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-sm hover:opacity-90 transition-all hover:scale-105">
              PANEL ADMIN
            </Link>
            <button onClick={manualRefresh}
              className="px-5 py-2.5 bg-[#11152b] border border-purple-500/30 rounded-xl text-white/60 hover:text-white hover:border-purple-500 transition-all text-sm">
              ⟲ RAFRAÎCHIR
            </button>
          </div>
        </motion.div>

        {/* ─── Message ─── */}
        <AnimatePresence>
          {message.text && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className={`mb-4 p-4 rounded-xl border ${
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "UTILISATEURS",  value: stats.totalUsers,           color: "from-blue-600 to-cyan-600",    icon: "👥" },
            { label: "EN LIGNE",      value: stats.onlineUsers,          color: "from-green-600 to-emerald-600",icon: "🟢" },
            { label: "BANNIS",        value: stats.bannedUsers,          color: "from-red-600 to-pink-600",     icon: "🚫" },
            { label: "EN ATTENTE",    value: stats.pendingVerifications, color: "from-yellow-600 to-orange-600",icon: "⏳" },
            { label: "TOURNOIS",      value: stats.totalTournaments,     color: "from-purple-600 to-indigo-600",icon: "🏆" },
            { label: "MATCHES",       value: stats.totalMatches,         color: "from-cyan-600 to-blue-600",    icon: "🎮" },
            { label: "TICKETS",       value: stats.openTickets,          color: "from-orange-600 to-red-600",   icon: "🎟️" },
            { label: "RAPPORTS",      value: stats.totalReports,         color: "from-pink-600 to-purple-600",  icon: "🚨" },
          ].map((item, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
              onHoverStart={() => setHoveredCard(i)} onHoverEnd={() => setHoveredCard(null)}
              className="group relative bg-[#0a0a1a] rounded-xl p-4 overflow-hidden cursor-pointer"
              style={{ boxShadow: hoveredCard === i ? "0 20px 40px -10px rgba(124,58,237,0.4)" : "0 4px 12px rgba(0,0,0,0.5)" }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
              <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:opacity-10 transition-opacity">{item.icon}</div>
              <p className="text-xs text-white/40 mb-1 relative z-10">{item.label}</p>
              <p className="text-2xl font-bold text-white relative z-10">{item.value.toLocaleString()}</p>
              <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${item.color} w-0 group-hover:w-full transition-all duration-500`}></div>
            </motion.div>
          ))}
        </div>

        {/* ─── Revenue ─── */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "REVENU AUJOURD'HUI", value: stats.todayRevenue,   color1: "purple-600", color2: "cyan-600" },
            { label: "REVENU CE MOIS",     value: stats.monthlyRevenue, color1: "cyan-600",   color2: "purple-600" },
          ].map((r, i) => (
            <motion.div key={i} initial={{ opacity:0, x: i===0?-20:20 }} animate={{ opacity:1, x:0 }}
              whileHover={{ scale:1.02 }}
              className={`relative bg-gradient-to-r from-${r.color1}/20 to-${r.color2}/20 border border-purple-500/30 rounded-xl p-6`}>
              <p className="text-sm text-white/40 mb-1">{r.label}</p>
              <p className="text-3xl font-bold text-white">{r.value.toLocaleString()} <span className="text-sm text-white/40">coins</span></p>
            </motion.div>
          ))}
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 mb-6 border-b border-purple-500/20 pb-3 overflow-x-auto">
          {[
            { id:"dashboard",   label:`📊 DASHBOARD` },
            { id:"users",       label:`👥 UTILISATEURS (${users.length})` },
            { id:"admins",      label:`🛡️ ADMINS (${admins.length})` },
            { id:"tournaments", label:`🏆 TOURNOIS (${tournaments.length})` },
            { id:"reports",     label:`🚨 RAPPORTS (${reports.length})` },
            { id:"economy",     label:`💰 ÉCONOMIE` },
            { id:"security",    label:`🛡️ SÉCURITÉ` },
            { id:"logs",        label:`📋 LOGS` },
            { id:"system",      label:`⚙️ SYSTÈME` },
          ].map(tab => (
            <motion.button key={tab.id} whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-all relative rounded-lg ${
                activeTab === tab.id
                  ? "text-purple-400 bg-purple-500/10"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}>
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD ── */}
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="grid md:grid-cols-2 gap-6">

              {/* Actions rapides */}
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span> ACTIONS RAPIDES
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon:"✅", label:`Vérifier (${stats.pendingVerifications})`, action:() => { setActiveTab("users"); setFilter("pending"); }, color:"purple" },
                    { icon:"🚨", label:`Rapports (${stats.totalReports})`,         action:() => setActiveTab("reports"), color:"red" },
                    { icon:"💰", label:"Gérer Coins",  action:() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }, color:"yellow" },
                    { icon:"🏆", label:"Créer Tournoi", action:() => navigate("/create-tournament"), color:"green" },
                  ].map((a, i) => (
                    <motion.button key={i} whileHover={{ scale:1.05, y:-2 }} whileTap={{ scale:0.95 }}
                      onClick={a.action}
                      className="bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all border border-transparent">
                      <span className="text-2xl mb-1 block">{a.icon}</span>
                      <p className="text-xs font-medium">{a.label}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Activité récente */}
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span> ACTIVITÉ RÉCENTE
                </h2>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {logs.length === 0 ? (
                    <p className="text-white/40 text-center py-4 text-sm">Aucune activité récente</p>
                  ) : logs.slice(0, 10).map((log) => (
                    <div key={log.id} className="bg-[#11152b] rounded-lg p-2.5">
                      <p className="text-xs text-white">
                        <span className="text-purple-400">
                          {log.user_id ? (users.find(u=>u.id===log.user_id)?.display_name || log.user_id?.slice(0,8)) : "Système"}
                        </span> — {log.action}
                      </p>
                      <p className="text-xs text-white/30">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics — VRAIES DONNÉES */}
              <div className="md:col-span-2 bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                  ANALYTIQUES EN TEMPS RÉEL
                  {lastRefresh && <span className="text-white/20 text-xs font-normal ml-2">↻ auto 30s</span>}
                </h2>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label:"NOUVEAUX AUJOURD'HUI", value:`+${stats.newToday}`,          sub:"inscrits",       color:"text-green-400" },
                    { label:"MATCHES EN COURS",      value:stats.liveMatches,             sub:"⚡ Live",         color:"text-blue-400" },
                    { label:"COINS ÉCHANGÉS",        value:stats.todayRevenue.toLocaleString(), sub:"aujourd'hui",color:"text-yellow-400" },
                    { label:"TAUX DE CONVERSION",    value:`${stats.conversionRate}%`,    sub:"joueurs actifs", color:"text-purple-400" },
                  ].map((a, i) => (
                    <div key={i} className="bg-[#11152b] rounded-xl p-4">
                      <p className="text-xs text-white/40 mb-1">{a.label}</p>
                      <p className={`text-2xl font-bold ${a.color}`}>{a.value}</p>
                      <p className="text-xs text-white/30 mt-1">{a.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <motion.div key="users" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <div className="flex gap-3 mb-5">
                  <input type="text" placeholder="Rechercher nom, email ou FF ID..."
                    value={search} onChange={e=>setSearch(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-[#11152b] border border-purple-500/20 rounded-xl text-white text-sm focus:border-purple-500 transition-all"/>
                  <select value={filter} onChange={e=>setFilter(e.target.value)}
                    className="px-4 py-2.5 bg-[#11152b] border border-purple-500/20 rounded-xl text-white text-sm">
                    <option value="all">TOUS</option>
                    <option value="admins">ADMINS</option>
                    <option value="founders">FONDATEURS</option>
                    <option value="banned">BANNIS</option>
                    <option value="pending">EN ATTENTE</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#11152b]">
                        {["UTILISATEUR","RÔLE","STATUT","COINS","FF ID","INSCRIT","ACTIONS"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs text-white/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/10">
                      {filteredUsers.slice(0, 30).map(user => (
                        <motion.tr key={user.id} whileHover={{ backgroundColor:"rgba(124,58,237,0.08)" }}>
                          <td className="px-3 py-2.5">
                            <p className="text-sm font-medium text-white">{user.display_name}</p>
                            <p className="text-xs text-white/40">{user.email}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${
                              user.role==="super_admin" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                              user.role==="admin"       ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" :
                              user.role==="founder"||user.role==="fondateur" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              user.role==="designer"    ? "bg-pink-500/20 text-pink-400 border-pink-500/30" :
                              user.role==="banned"      ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              "bg-white/10 text-white/50 border-white/10"
                            }`}>{user.role?.toUpperCase()}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {user.role==="banned"
                              ? <span className="text-red-400 text-xs">🚫 BANNI</span>
                              : <span className="text-green-400 text-xs">✅ ACTIF</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-purple-400 font-bold text-sm">{(user.coins||0).toLocaleString()}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-white/60 text-xs">{user.free_fire_id || "—"}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-white/40 text-xs">{new Date(user.created_at).toLocaleDateString("fr-FR")}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5">
                              <button onClick={() => { setSelectedUser(user); setNewRole(user.role||"user"); setShowRoleModal(true); }}
                                className="p-1.5 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition-all" title="Changer rôle">👑</button>
                              <button onClick={() => { setSelectedUser(user); setGrantAmount(""); setGrantReason(""); setShowWalletModal(true); }}
                                className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-all" title="Coins">💰</button>
                              {user.role !== "banned" ? (
                                <button onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                                  className="p-1.5 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all" title="Ban">🚫</button>
                              ) : (
                                <button onClick={() => unbanUser(user.id)}
                                  className="p-1.5 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-all" title="Unban">✅</button>
                              )}
                              {user.role !== "super_admin" && (
                                <button onClick={() => deleteUser(user.id)}
                                  className="p-1.5 bg-red-500/10 text-red-400/70 rounded text-xs hover:bg-red-500/20 transition-all" title="Supprimer">🗑️</button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length > 30 && (
                    <p className="text-center text-white/40 text-xs mt-3">
                      Affichage 30/{filteredUsers.length} — affinez la recherche
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ADMINS ── */}
          {activeTab === "admins" && (
            <motion.div key="admins" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">GESTION DES ADMINS ({admins.length})</h2>
                <div className="space-y-3">
                  {admins.length === 0 ? (
                    <p className="text-white/40 text-sm">Aucun admin trouvé</p>
                  ) : admins.map(admin => (
                    <motion.div key={admin.id} whileHover={{ scale:1.01, x:4 }}
                      className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white text-sm">{admin.username || admin.full_name || admin.email?.split("@")[0]}</p>
                        <p className="text-xs text-white/40">{admin.email}</p>
                        <div className="flex gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${
                            admin.role==="super_admin"
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          }`}>{admin.role?.toUpperCase()}</span>
                          <span className="text-white/30 text-xs">{new Date(admin.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                      {admin.role !== "super_admin" && (
                        <div className="flex gap-2">
                          <button onClick={() => updateUserRole(admin.id, "user")}
                            className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs hover:bg-orange-500/30 transition-all">Rétrograder</button>
                          <button onClick={() => deleteUser(admin.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all">Supprimer</button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TOURNAMENTS ── */}
          {activeTab === "tournaments" && (
            <motion.div key="tournaments" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">TOURNOIS ({tournaments.length})</h2>
                <div className="space-y-3">
                  {tournaments.length === 0 ? <p className="text-white/40 text-sm">Aucun tournoi</p>
                  : tournaments.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                      whileHover={{ scale:1.01, x:4 }}
                      className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white text-sm">{t.name}</p>
                        <p className="text-xs text-white/40">{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${
                            t.status==="open"      ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            t.status==="ongoing"   ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                            t.status==="completed" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                            "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }`}>{t.status}</span>
                          <span className="px-2 py-0.5 bg-white/5 text-white/50 rounded-full text-xs border border-white/10">
                            {t.current_players}/{t.max_players} joueurs
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full text-xs border border-yellow-500/20">
                            🏆 {t.prize_coins}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedTournament(t); setTournamentStatus(t.status); setShowTournamentModal(true); }}
                          className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-all">Modifier</button>
                        <button onClick={() => { setTournamentToDelete(t); setShowDeleteConfirm(true); }}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all">Supprimer</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === "reports" && (
            <motion.div key="reports" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">RAPPORTS EN ATTENTE ({reports.length})</h2>
                {reports.length === 0
                  ? <p className="text-white/40 text-center py-8 text-sm">Aucun rapport en attente 🎉</p>
                  : <div className="space-y-3">
                    {reports.map(r => (
                      <motion.div key={r.id} whileHover={{ scale:1.01 }}
                        className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-red-500/40 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm text-white">{r.reason || "Sans raison"}</p>
                            <p className="text-xs text-white/40 mt-1">{new Date(r.created_at).toLocaleString("fr-FR")}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${
                            r.type==="cheat"  ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            r.type==="insult" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}>{r.type || "other"}</span>
                        </div>
                        <div className="flex gap-2">
                          {["warning","mute","ban","ignore"].map(action => (
                            <button key={action} onClick={() => resolveReport(r.id, action)}
                              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                                action==="ban"     ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" :
                                action==="warning" ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" :
                                action==="mute"    ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" :
                                "bg-white/10 text-white/60 hover:bg-white/20"
                              }`}>{action.charAt(0).toUpperCase()+action.slice(1)}</button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                }
              </div>
            </motion.div>
          )}

          {/* ── ECONOMY ── */}
          {activeTab === "economy" && (
            <motion.div key="economy" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">ÉCONOMIE</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label:"TOTAL COINS EN CIRCULATION", value: stats.totalCoins.toLocaleString(), color:"text-yellow-400" },
                    { label:"COINS ÉCHANGÉS AUJOURD'HUI", value: stats.todayRevenue.toLocaleString(), color:"text-green-400" },
                    { label:"COINS ÉCHANGÉS CE MOIS",     value: stats.monthlyRevenue.toLocaleString(), color:"text-green-400" },
                  ].map((c,i) => (
                    <motion.div key={i} whileHover={{ scale:1.05 }}
                      className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all">
                      <p className="text-xs text-white/40 mb-2">{c.label}</p>
                      <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">SÉCURITÉ</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label:"UTILISATEURS BANNIS",       value: stats.bannedUsers,          color:"text-red-400" },
                    { label:"VÉRIFICATIONS EN ATTENTE",  value: stats.pendingVerifications, color:"text-yellow-400" },
                    { label:"RAPPORTS NON RÉSOLUS",      value: stats.totalReports,         color:"text-orange-400" },
                    { label:"TICKETS OUVERTS",           value: stats.openTickets,          color:"text-blue-400" },
                  ].map((s,i) => (
                    <motion.div key={i} whileHover={{ scale:1.05 }}
                      className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all">
                      <p className="text-xs text-white/40 mb-2">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOGS ── */}
          {activeTab === "logs" && (
            <motion.div key="logs" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">LOGS ADMIN</h2>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {logs.length === 0 ? <p className="text-white/40 text-center py-8 text-sm">Aucun log</p>
                  : logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.02 }}
                      className="bg-[#11152b] rounded-lg p-2.5 border border-purple-500/10">
                      <p className="text-xs text-white">
                        <span className="text-purple-400">
                          {log.user_id ? (users.find(u=>u.id===log.user_id)?.display_name || log.user_id?.slice(0,8)) : "Système"}
                        </span> — {log.action}
                      </p>
                      <p className="text-xs text-white/30">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
                      {log.details && (
                        <pre className="text-xs text-white/20 mt-1 bg-black/20 p-1.5 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SYSTEM ── */}
          {activeTab === "system" && (
            <motion.div key="system" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4">CONFIGURATION SYSTÈME</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { label:"Mode Maintenance",  desc:"Désactive l'accès à la plateforme", val:maintenanceMode,     set:setMaintenanceMode },
                    { label:"Inscriptions",       desc:"Autoriser les nouveaux utilisateurs",val:registrationEnabled, set:setRegistrationEnabled },
                    { label:"Tournois",           desc:"Autoriser la création de tournois", val:tournamentsEnabled,  set:setTournamentsEnabled },
                  ].map((c,i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#11152b] rounded-xl border border-purple-500/20 hover:border-purple-500 transition-all">
                      <div>
                        <p className="font-medium text-white text-sm">{c.label}</p>
                        <p className="text-xs text-white/40">{c.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={c.val} onChange={e=>c.set(e.target.checked)} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={updateSystemConfig}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-white hover:opacity-90 transition-all">
                  SAUVEGARDER LA CONFIGURATION
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════ MODALS ══════ */}
        <AnimatePresence>

          {/* Role Modal */}
          {showRoleModal && selectedUser && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowRoleModal(false)}>
              <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                onClick={e=>e.stopPropagation()}
                style={{ background:"#0a0a1a", border:"1px solid rgba(124,58,237,0.3)", borderRadius:20, padding:28, width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(124,58,237,0.25)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>👑</div>
                  <div>
                    <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0, fontFamily:"Orbitron,sans-serif" }}>CHANGER LE RÔLE</h2>
                    <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12, margin:0 }}>{selectedUser.display_name || selectedUser.email}</p>
                  </div>
                </div>
                <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:18, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>RÔLE ACTUEL</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#a855f7" }}>{selectedUser.role?.toUpperCase()}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
                  {[
                    { value:"user",        icon:"👤", label:"UTILISATEUR",  color:"#6b7280", desc:"Joueur normal" },
                    { value:"founder",     icon:"⚡", label:"FONDATEUR",    color:"#f59e0b", desc:"Crée tournois" },
                    { value:"designer",    icon:"🎨", label:"DESIGNER",     color:"#ec4899", desc:"Gère le store" },
                    { value:"admin",       icon:"🛡️", label:"ADMIN",        color:"#06b6d4", desc:"Modération" },
                    { value:"super_admin", icon:"👑", label:"SUPER ADMIN",  color:"#f59e0b", desc:"Accès complet" },
                    { value:"banned",      icon:"🚫", label:"BANNI",        color:"#ef4444", desc:"Accès bloqué" },
                  ].map(r => (
                    <div key={r.value} onClick={() => setNewRole(r.value)}
                      style={{ padding:"12px 14px", borderRadius:10, cursor:"pointer", border:`1px solid ${newRole===r.value?r.color:"rgba(255,255,255,0.07)"}`, background:newRole===r.value?`${r.color}18`:"rgba(255,255,255,0.02)", transition:"all 0.2s", display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:20 }}>{r.icon}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:newRole===r.value?r.color:"rgba(255,255,255,0.6)", fontFamily:"Orbitron,sans-serif" }}>{r.label}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{r.desc}</div>
                      </div>
                      {newRole===r.value && <div style={{ marginLeft:"auto", width:16, height:16, borderRadius:"50%", background:r.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#000", fontWeight:700 }}>✓</div>}
                    </div>
                  ))}
                </div>
                {newRole==="super_admin" && <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)", fontSize:12, color:"#f59e0b" }}>⚠️ Ce rôle donne accès à TOUTES les fonctionnalités.</div>}
                {newRole==="banned"      && <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", fontSize:12, color:"#ef4444" }}>🚫 Ce joueur sera immédiatement déconnecté.</div>}
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setShowRoleModal(false)} style={{ flex:1, padding:"12px", borderRadius:10, cursor:"pointer", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:13, fontFamily:"Rajdhani,sans-serif" }}>ANNULER</button>
                  <button onClick={() => updateUserRole(selectedUser.id, newRole)} style={{ flex:2, padding:"12px", borderRadius:10, cursor:"pointer", background:newRole==="banned"?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#7c3aed,#06b6d4)", border:"none", color:"#fff", fontSize:13, fontWeight:700, fontFamily:"Orbitron,sans-serif" }}>
                    ✓ CONFIRMER → {newRole.toUpperCase().replace("_"," ")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Ban Modal */}
          {showBanModal && selectedUser && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowBanModal(false)}>
              <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                onClick={e=>e.stopPropagation()}
                className="bg-[#0a0a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20">
                <h2 className="text-lg font-bold text-white mb-3">Bannir l'utilisateur</h2>
                <p className="text-white/60 text-sm mb-4">Utilisateur: <span className="text-white">{selectedUser.display_name}</span></p>
                <select value={banDuration} onChange={e=>setBanDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-[#11152b] border border-red-500/20 rounded-xl text-white mb-4 text-sm">
                  <option value="24h">24 heures</option>
                  <option value="7d">7 jours</option>
                  <option value="30d">30 jours</option>
                  <option value="permanent">Permanent</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setShowBanModal(false)} className="flex-1 px-4 py-2 border border-red-500/20 rounded-xl text-white text-sm">Annuler</button>
                  <button onClick={() => banUser(selectedUser.id, banDuration)} className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/30 transition-all">Bannir</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Wallet Modal */}
          {showWalletModal && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }}>
              <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                onClick={e=>e.stopPropagation()}
                style={{ background:"#0a0a1a", border:"1px solid rgba(245,158,11,0.3)", borderRadius:20, padding:28, width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(245,158,11,0.2)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#f59e0b,#d97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>💰</div>
                  <div>
                    <h2 style={{ fontSize:15, fontWeight:800, color:"#fff", margin:0, fontFamily:"Orbitron,sans-serif" }}>GESTION DES PIÈCES</h2>
                    <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12, margin:0 }}>{selectedUser ? (selectedUser.display_name||selectedUser.username||selectedUser.email) : "Sélectionne un joueur"}</p>
                  </div>
                </div>

                {/* Recherche joueur */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.5, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>🔍 RECHERCHER UN JOUEUR</label>
                  <input placeholder="Nom, username ou email..." value={walletSearch} onChange={e=>setWalletSearch(e.target.value)}
                    style={{ width:"100%", padding:"10px 14px", boxSizing:"border-box", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, color:"#fff", fontSize:13, outline:"none" }}/>
                  {walletSearch.length > 0 && (
                    <div style={{ marginTop:6, borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", maxHeight:200, overflowY:"auto" }}>
                      {users.filter(u => u.display_name?.toLowerCase().includes(walletSearch.toLowerCase()) || u.email?.toLowerCase().includes(walletSearch.toLowerCase())).slice(0,8).map(u => (
                        <div key={u.id} onClick={() => { setSelectedUser(u); setWalletSearch(""); }}
                          style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff" }}>
                            {(u.display_name||u.email||"?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{u.display_name||u.username||"Inconnu"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{u.email} · 💰 {(u.coins||0).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Joueur sélectionné */}
                {selectedUser && (
                  <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:16, background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{selectedUser.display_name}</span>
                    <span style={{ fontSize:16, fontWeight:800, color:"#f59e0b", fontFamily:"Orbitron,sans-serif" }}>💰 {(selectedUser.coins||0).toLocaleString()}</span>
                  </div>
                )}

                {/* Montant */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.5, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>MONTANT (négatif pour retirer)</label>
                  <input type="number" placeholder="Ex: 500 ou -200" value={grantAmount} onChange={e=>setGrantAmount(e.target.value)}
                    style={{ width:"100%", padding:"11px 14px", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fff", fontSize:16, fontFamily:"Orbitron,sans-serif", outline:"none" }}/>
                  <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                    {[100,500,1000,2000,5000].map(n => (
                      <button key={n} onClick={() => setGrantAmount(String(n))}
                        style={{ padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:11, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.03)", color:"rgba(255,255,255,0.5)" }}>{n}</button>
                    ))}
                  </div>
                </div>

                {/* Raison */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, letterSpacing:1.5, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>RAISON *</label>
                  <input type="text" placeholder="Ex: Récompense tournoi, Bug fix..." value={grantReason} onChange={e=>setGrantReason(e.target.value)}
                    style={{ width:"100%", padding:"11px 14px", boxSizing:"border-box", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fff", fontSize:14, outline:"none" }}/>
                </div>

                {/* Preview */}
                {selectedUser && grantAmount !== "" && parseInt(grantAmount) !== 0 && (
                  <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>SOLDE APRÈS</span>
                    <span style={{ fontSize:14, fontWeight:700, fontFamily:"Orbitron,sans-serif", color: ((selectedUser.coins||0)+(parseInt(grantAmount)||0))<0?"#ef4444":"#10b981" }}>
                      💰 {Math.max(0,(selectedUser.coins||0)+(parseInt(grantAmount)||0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }}
                    style={{ flex:1, padding:"12px", borderRadius:10, cursor:"pointer", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:13 }}>ANNULER</button>
                  <button onClick={grantCoins} disabled={!selectedUser||!grantAmount||!grantReason.trim()}
                    style={{ flex:2, padding:"12px", borderRadius:10, cursor:(!selectedUser||!grantAmount||!grantReason.trim())?"not-allowed":"pointer", border:"none",
                      background:(!selectedUser||!grantAmount||!grantReason.trim())?"rgba(255,255,255,0.05)":(parseInt(grantAmount)||0)<0?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#10b981,#059669)",
                      color:(!selectedUser||!grantAmount||!grantReason.trim())?"rgba(255,255,255,0.2)":"#fff", fontSize:13, fontWeight:700, fontFamily:"Orbitron,sans-serif" }}>
                    {!selectedUser ? "👤 CHOISIR UN JOUEUR" : !grantAmount ? "ENTRER UN MONTANT" : (parseInt(grantAmount)||0)<0 ? `🔴 RETIRER ${Math.abs(parseInt(grantAmount))}` : `✅ AJOUTER ${parseInt(grantAmount)}`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Tournament Modal */}
          {showTournamentModal && selectedTournament && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowTournamentModal(false)}>
              <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                onClick={e=>e.stopPropagation()}
                className="bg-[#0a0a1a] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full">
                <h2 className="text-lg font-bold text-white mb-3">Modifier : {selectedTournament.name}</h2>
                <select value={tournamentStatus} onChange={e=>setTournamentStatus(e.target.value)}
                  className="w-full px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white mb-4 text-sm">
                  <option value="open">Ouvert</option>
                  <option value="ongoing">En cours</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <div className="flex gap-3">
                  <button onClick={() => setShowTournamentModal(false)} className="flex-1 px-4 py-2 border border-purple-500/20 rounded-xl text-white text-sm">Annuler</button>
                  <button onClick={() => updateTournamentStatus(selectedTournament.id, tournamentStatus)} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white font-bold text-sm">Mettre à jour</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Delete Confirm */}
          {showDeleteConfirm && tournamentToDelete && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowDeleteConfirm(false)}>
              <motion.div initial={{ scale:0.9 }} animate={{ scale:1 }} exit={{ scale:0.9 }}
                onClick={e=>e.stopPropagation()}
                className="bg-[#0a0a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
                <h2 className="text-lg font-bold text-white mb-3">Confirmer la suppression</h2>
                <p className="text-white/60 text-sm mb-4">Supprimer <span className="text-white font-bold">"{tournamentToDelete.name}"</span> ? Cette action est irréversible.</p>
                {deleteLoading ? (
                  <div className="flex justify-center py-4"><div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div></div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => { setShowDeleteConfirm(false); setTournamentToDelete(null); }} className="flex-1 px-4 py-2 border border-red-500/20 rounded-xl text-white text-sm">Annuler</button>
                    <button onClick={async () => { setDeleteLoading(true); await deleteTournament(tournamentToDelete.id); setDeleteLoading(false); setShowDeleteConfirm(false); setTournamentToDelete(null); }}
                      className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/30 transition-all">Supprimer</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}