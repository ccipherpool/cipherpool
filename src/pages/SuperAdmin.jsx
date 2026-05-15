import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, ShieldCheck, Trophy, AlertTriangle,
  TrendingUp, Lock, FileText, Settings, RefreshCw,
  ShieldOff, Clock, Gamepad2, Ticket, Flag, Wifi, UserCircle2,
  ArrowUpRight, Activity, Calendar, ChevronDown, LogOut,
  Zap, BarChart3, Globe, Megaphone, Lightbulb,
} from "lucide-react";

import DashboardTab    from "./superadmin/tabs/DashboardTab";
import UsersTab        from "./superadmin/tabs/UsersTab";
import StaffTab        from "./superadmin/tabs/StaffTab";
import TournamentsTab  from "./superadmin/tabs/TournamentsTab";
import ReportsTab      from "./superadmin/tabs/ReportsTab";
import EconomyTab      from "./superadmin/tabs/EconomyTab";
import SecurityTab     from "./superadmin/tabs/SecurityTab";
import LogsTab         from "./superadmin/tabs/LogsTab";
import SystemTab       from "./superadmin/tabs/SystemTab";
import SeasonsTab       from "./superadmin/tabs/SeasonsTab";
import AnnouncementsTab from "./superadmin/tabs/AnnouncementsTab";
import AnalyticsTab     from "./superadmin/tabs/AnalyticsTab";
import CommunityTab     from "./superadmin/tabs/CommunityTab";

import RoleModal          from "./superadmin/modals/RoleModal";
import BanModal           from "./superadmin/modals/BanModal";
import WalletModal        from "./superadmin/modals/WalletModal";
import TournamentModal    from "./superadmin/modals/TournamentModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import ProfileModal       from "./superadmin/modals/ProfileModal";

const T = {
  bg:        "#08080d",
  sidebar:   "#0c0c15",
  surface:   "#111119",
  surface2:  "#171720",
  surface3:  "#1e1e2a",
  border:    "rgba(255,255,255,0.06)",
  border2:   "rgba(255,255,255,0.1)",
  accent:    "#6366f1",
  accentDim: "rgba(99,102,241,0.12)",
  green:     "#10b981",
  red:       "#ef4444",
  amber:     "#f59e0b",
  purple:    "#8b5cf6",
  cyan:      "#06b6d4",
  pink:      "#ec4899",
  orange:    "#f97316",
  text:      "#f4f4f5",
  text2:     "#a1a1aa",
  text3:     "#52525b",
  text4:     "#3f3f46",
  font:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard",   label: "Dashboard",    icon: LayoutDashboard, badgeKey: null },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "users",       label: "Users",         icon: Users,          badgeKey: "users",        urgent: false },
      { id: "staff",       label: "Staff",          icon: ShieldCheck,    badgeKey: "admins",       urgent: false },
      { id: "tournaments", label: "Tournaments",    icon: Trophy,         badgeKey: "tournaments",  urgent: false },
      { id: "reports",     label: "Reports",        icon: AlertTriangle,  badgeKey: "reports",      urgent: true  },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "analytics",     label: "Analytics",      icon: BarChart3,  badgeKey: null },
      { id: "community",     label: "Community",      icon: Lightbulb,  badgeKey: null },
      { id: "economy",       label: "Economy",        icon: TrendingUp, badgeKey: null },
      { id: "security",      label: "Security",       icon: Lock,       badgeKey: null },
      { id: "seasons",       label: "Seasons",        icon: Calendar,   badgeKey: null },
      { id: "announcements", label: "Announcements",  icon: Megaphone,  badgeKey: null },
      { id: "logs",          label: "Audit Logs",     icon: FileText,   badgeKey: null },
      { id: "system",        label: "System",         icon: Settings,   badgeKey: null },
    ],
  },
];

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

  const showMsg = (type, text, delay = 3500) => {
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
        display_name: u.username || u.full_name || u.name || u.email?.split("@")[0] || "Unknown",
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
    } catch { setTournaments([]); }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch { setReports([]); }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch { setLogs([]); }
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
      } else if (rpcData && !rpcData.success) throw new Error(rpcData.error || "Role change error");
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "change_role", details: { target_user: userId, new_role: role } }]);
      showMsg("success", "Role updated successfully");
      await fetchUsers(); await fetchAdmins();
      setShowRoleModal(false);
    } catch (err) { showMsg("error", err.message || "Role change failed"); }
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
      showMsg("success", "User banned successfully");
      await fetchUsers(); setShowBanModal(false);
    } catch (err) { showMsg("error", err.message || "Ban failed"); }
  };

  const unbanUser = async (userId) => {
    try {
      const { error } = await supabase.rpc("unban_user", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "unban_user", details: { target_user: userId } }]);
      showMsg("success", "User unbanned");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Unban failed"); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Permanently delete this user?")) return;
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_user", details: { target_user: userId } }]);
      showMsg("success", "User permanently deleted");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Delete failed"); }
  };

  const grantCoins = async () => {
    if (!selectedUser) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) { showMsg("error", "Invalid amount"); return; }
    if (!grantReason.trim()) { showMsg("error", "Reason is required"); return; }
    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", { p_target_user_id: selectedUser.id, p_amount: amount, p_reason: grantReason });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Error");
      showMsg("success", `${amount > 0 ? "+" : ""}${amount} CP → ${selectedUser.display_name || selectedUser.username} (${data.new_balance} total)`, 4000);
      setGrantAmount(""); setGrantReason(""); setShowWalletModal(false);
      await fetchUsers();
    } catch (err) { showMsg("error", err.message || "Coin adjustment failed"); }
  };

  const deleteTournament = async (tournamentId) => {
    try {
      const { error } = await supabase.rpc("delete_tournament_complete", { tournament_id: tournamentId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_tournament", details: { tournament_id: tournamentId } }]);
      showMsg("success", "Tournament deleted");
      await fetchTournaments();
    } catch (err) { showMsg("error", err.message || "Delete failed"); }
  };

  const updateTournamentStatus = async (tournamentId, status) => {
    try {
      const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "update_tournament_status", details: { tournament_id: tournamentId, status } }]);
      showMsg("success", "Tournament status updated");
      setShowTournamentModal(false); await fetchTournaments();
    } catch (err) { showMsg("error", err.message || "Update failed"); }
  };

  const resolveReport = async (reportId, action) => {
    try {
      const { error } = await supabase.from("reports").update({ status: "resolved", resolved_by: profile.id, resolved_action: action, resolved_at: new Date().toISOString() }).eq("id", reportId);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "resolve_report", details: { report_id: reportId, action } }]);
      showMsg("success", "Report resolved");
      await fetchReports();
    } catch (err) { showMsg("error", err.message || "Failed to resolve"); }
  };

  const updateSystemConfig = async () => {
    try {
      const { error } = await supabase.from("system_config").upsert({ maintenance_mode: maintenanceMode, registration_enabled: registrationEnabled, tournaments_enabled: tournamentsEnabled, updated_by: profile.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "update_system_config", details: { maintenanceMode, registrationEnabled, tournamentsEnabled } }]);
      showMsg("success", "System config updated");
    } catch (err) { showMsg("error", err.message || "Error"); }
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

  const pendingReportsCount = reports.filter(r => r.status === "pending").length;

  const getBadge = (key) => {
    if (key === "users")       return users.length;
    if (key === "admins")      return admins.length;
    if (key === "tournaments") return tournaments.length;
    if (key === "reports")     return pendingReportsCount;
    return null;
  };

  const STAT_CARDS = [
    { label: "Users",        value: stats.totalUsers,           icon: Users,       color: T.accent  },
    { label: "Banned",       value: stats.bannedUsers,          icon: ShieldOff,   color: T.red     },
    { label: "Pending",      value: stats.pendingVerifications, icon: Clock,       color: T.amber   },
    { label: "Tournaments",  value: stats.totalTournaments,     icon: Trophy,      color: T.purple  },
    { label: "Matches",      value: stats.totalMatches,         icon: Gamepad2,    color: T.cyan    },
    { label: "Tickets",      value: stats.openTickets,          icon: Ticket,      color: T.orange  },
    { label: "Reports",      value: stats.totalReports,         icon: Flag,        color: T.pink    },
    { label: "Total CP",     value: stats.totalCoins,           icon: BarChart3,   color: T.green   },
  ];

  const initials = (profile?.username || profile?.email || "?")[0]?.toUpperCase();

  // ─── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${T.accent}, #818cf8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: `0 0 32px ${T.accent}50`,
            animation: "sa-pulse 1.5s ease-in-out infinite",
          }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <p style={{ color: T.text3, fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>Initializing CipherPool Control</p>
        </div>
        <style>{`@keyframes sa-pulse { 0%,100%{opacity:0.7;transform:scale(0.96)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font }}>
      <style>{`
        .sa-nav-item { transition: background 0.12s, color 0.12s, border-color 0.12s; }
        .sa-nav-item:hover { background: rgba(255,255,255,0.04) !important; color: ${T.text} !important; }
        .sa-icon-btn { transition: background 0.12s, color 0.12s, border-color 0.12s; }
        .sa-icon-btn:hover { background: rgba(255,255,255,0.07) !important; color: ${T.text} !important; }
        .sa-stat-card { transition: border-color 0.15s, transform 0.15s; }
        .sa-stat-card:hover { border-color: rgba(255,255,255,0.12) !important; transform: translateY(-1px); }
        .sa-profile-btn { transition: background 0.12s; }
        .sa-profile-btn:hover { background: rgba(255,255,255,0.06) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        zIndex: 20,
      }}>

        {/* Logo */}
        <div style={{ padding: "18px 16px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg, ${T.accent} 0%, #818cf8 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${T.accent}35`,
            }}>
              <ShieldCheck size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, letterSpacing: -0.2, lineHeight: 1.2 }}>CipherPool</div>
              <div style={{ fontSize: 10, color: T.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", lineHeight: 1.4 }}>Control Panel</div>
            </div>
          </div>

          {/* Status indicator */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 8, background: maintenanceMode ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${maintenanceMode ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: maintenanceMode ? T.red : T.green, boxShadow: `0 0 6px ${maintenanceMode ? T.red : T.green}` }} />
            <span style={{ fontSize: 11, color: maintenanceMode ? T.red : T.green, fontWeight: 600 }}>
              {maintenanceMode ? "Maintenance" : "Operational"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? 24 : 0 }}>
              <div style={{
                fontSize: 9.5, fontWeight: 700, color: T.text4, letterSpacing: 1.5,
                textTransform: "uppercase", padding: "0 8px", marginBottom: 4,
              }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const active = activeTab === item.id;
                const badge = item.badgeKey ? getBadge(item.badgeKey) : null;
                return (
                  <button
                    key={item.id}
                    className="sa-nav-item"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      width: "100%", padding: "7px 8px", border: "none", borderRadius: 8,
                      borderLeft: `2px solid ${active ? T.accent : "transparent"}`,
                      background: active ? T.accentDim : "transparent",
                      color: active ? T.text : T.text3,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 9,
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      textAlign: "left", marginBottom: 1, outline: "none",
                    }}
                  >
                    <item.icon size={14.5} color={active ? T.accent : "currentColor"} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {badge !== null && badge > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                        background: item.urgent ? `${T.red}18` : `${T.accent}18`,
                        color: item.urgent ? T.red : T.accent,
                        minWidth: 18, textAlign: "center",
                      }}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Profile section at bottom */}
        <div style={{ padding: "12px 8px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ position: "relative" }}>
            <button
              className="sa-profile-btn"
              onClick={() => setProfileMenuOpen(p => !p)}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${T.border}`,
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, outline: "none",
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${T.accent}40, ${T.purple}40)`,
                border: `2px solid ${T.accent}40`,
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  : <span style={{ fontSize: 12, fontWeight: 800, color: T.accent }}>{initials}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile?.username || profile?.email?.split("@")[0]}
                </div>
                <div style={{ fontSize: 10, color: T.accent, fontWeight: 600, letterSpacing: 0.5 }}>Super Admin</div>
              </div>
              <ChevronDown size={12} color={T.text3} style={{ transform: profileMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.13 }}
                  style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
                    background: T.surface2, border: `1px solid ${T.border2}`,
                    borderRadius: 10, padding: 6,
                    boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
                    zIndex: 100,
                  }}
                >
                  {[
                    { icon: UserCircle2, label: "Edit Profile", action: () => { setShowProfileModal(true); setProfileMenuOpen(false); } },
                    { icon: Globe, label: "Back to Site", action: () => navigate("/dashboard") },
                    { icon: ArrowUpRight, label: "Admin Panel", action: () => navigate("/admin") },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action} style={{
                      width: "100%", padding: "8px 10px", borderRadius: 7, border: "none",
                      background: "transparent", color: T.text2, fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 9, textAlign: "left", outline: "none",
                    }} className="sa-nav-item">
                      <item.icon size={13} color={T.text3} />
                      {item.label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: T.border, margin: "4px 0" }} />
                  <button onClick={() => { supabase.auth.signOut(); navigate("/login"); }} style={{
                    width: "100%", padding: "8px 10px", borderRadius: 7, border: "none",
                    background: "transparent", color: T.red, fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 9, textAlign: "left", outline: "none",
                  }}>
                    <LogOut size={13} />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* TOP BAR */}
        <header style={{
          height: 52, borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: T.bg, flexShrink: 0,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
              {NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label || "Control Panel"}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/super-admin/grant" style={{ padding: "5px 12px", borderRadius: 7, background: T.accentDim, border: `1px solid ${T.accent}30`, color: T.accent, fontSize: 11, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 5, letterSpacing: 0.3 }}>
              <Zap size={12} /> Grant CP
            </Link>
            <button
              onClick={fetchAllData}
              className="sa-icon-btn"
              style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${T.border}`, background: "transparent", color: T.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
              title="Refresh all data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Toast */}
          <AnimatePresence>
            {message.text && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                style={{
                  marginBottom: 16, padding: "10px 16px", borderRadius: 10,
                  display: "flex", alignItems: "center", gap: 10,
                  background: message.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                  color: message.type === "success" ? "#34d399" : "#f87171",
                  fontSize: 13, fontWeight: 600,
                  boxShadow: `0 4px 16px ${message.type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}`,
                }}
              >
                {message.type === "success" ? <Activity size={14} /> : <AlertTriangle size={14} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Stats Row ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {STAT_CARDS.map((s, i) => (
              <motion.div
                key={i}
                className="sa-stat-card"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: "14px",
                  cursor: "default",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <s.icon size={13} color={s.color} />
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 3 }}>
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 0.8, textTransform: "uppercase" }}>
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ─── Revenue Strip ─── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Revenue Today", value: stats.todayRevenue, color: T.purple },
              { label: "Revenue This Month", value: stats.monthlyRevenue, color: T.cyan },
            ].map(c => (
              <div key={c.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${c.color}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingUp size={16} color={c.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1 }}>
                    {c.value.toLocaleString()} <span style={{ fontSize: 11, color: T.text3, fontWeight: 500 }}>CP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Tab Content ─── */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "20px", minHeight: 400 }}>
            <AnimatePresence mode="wait">
              {activeTab === "dashboard"   && <DashboardTab   key="dashboard"   stats={stats} users={users} logs={logs} setActiveTab={setActiveTab} setFilter={setFilter} setSelectedUser={setSelectedUser} setGrantAmount={setGrantAmount} setGrantReason={setGrantReason} setWalletSearch={setWalletSearch} setShowWalletModal={setShowWalletModal} />}
              {activeTab === "users"       && <UsersTab        key="users"       filteredUsers={filteredUsers} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setSelectedUser={setSelectedUser} setShowRoleModal={setShowRoleModal} setShowBanModal={setShowBanModal} setShowWalletModal={setShowWalletModal} unbanUser={unbanUser} deleteUser={deleteUser} />}
              {activeTab === "staff"       && <StaffTab        key="staff"       users={users} updateUserRole={updateUserRole} currentUserRole={profile?.role} />}
              {activeTab === "tournaments" && <TournamentsTab  key="tournaments" tournaments={tournaments} setSelectedTournament={setSelectedTournament} setShowTournamentModal={setShowTournamentModal} setTournamentToDelete={setTournamentToDelete} setShowDeleteConfirm={setShowDeleteConfirm} />}
              {activeTab === "reports"     && <ReportsTab      key="reports"     reports={reports} resolveReport={resolveReport} />}
              {activeTab === "analytics"   && <AnalyticsTab    key="analytics" />}
              {activeTab === "community"   && <CommunityTab    key="community" />}
              {activeTab === "economy"     && <EconomyTab      key="economy"     stats={stats} setMessage={setMessage} />}
              {activeTab === "security"    && <SecurityTab     key="security" />}
              {activeTab === "seasons"       && <SeasonsTab       key="seasons" />}
              {activeTab === "announcements" && <AnnouncementsTab key="announcements" />}
              {activeTab === "logs"          && <LogsTab         key="logs"        logs={logs} users={users} />}
              {activeTab === "system"      && <SystemTab       key="system"      maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode} registrationEnabled={registrationEnabled} setRegistrationEnabled={setRegistrationEnabled} tournamentsEnabled={tournamentsEnabled} setTournamentsEnabled={setTournamentsEnabled} updateSystemConfig={updateSystemConfig} />}
            </AnimatePresence>
          </div>

        </div>
      </div>

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

      {profileMenuOpen && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setProfileMenuOpen(false)} />}
    </div>
  );
}
