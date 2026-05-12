import React, { useState, useEffect, useCallback, memo, lazy, Suspense, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, ShieldCheck, Trophy, AlertTriangle,
  TrendingUp, Lock, FileText, Settings, RefreshCw, ChevronRight,
  ShieldOff, Clock, Gamepad2, Ticket, Flag, Wifi, UserCircle2,
  ArrowUpRight, CheckCircle, Zap, Crown, Sparkles, BarChart3, Coins,
} from "lucide-react";

// ── Lazy tabs ──────────────────────────────────────────────────────────────
const DashboardTab   = lazy(() => import("./superadmin/tabs/DashboardTab"));
const UsersTab       = lazy(() => import("./superadmin/tabs/UsersTab"));
const StaffTab       = lazy(() => import("./superadmin/tabs/StaffTab"));
const TournamentsTab = lazy(() => import("./superadmin/tabs/TournamentsTab"));
const ReportsTab     = lazy(() => import("./superadmin/tabs/ReportsTab"));
const EconomyTab     = lazy(() => import("./superadmin/tabs/EconomyTab"));
const SecurityTab    = lazy(() => import("./superadmin/tabs/SecurityTab"));
const LogsTab        = lazy(() => import("./superadmin/tabs/LogsTab"));
const SystemTab      = lazy(() => import("./superadmin/tabs/SystemTab"));

// ── Modals ─────────────────────────────────────────────────────────────────
import RoleModal          from "./superadmin/modals/RoleModal";
import BanModal           from "./superadmin/modals/BanModal";
import WalletModal        from "./superadmin/modals/WalletModal";
import TournamentModal    from "./superadmin/modals/TournamentModal";
import DeleteConfirmModal from "./superadmin/modals/DeleteConfirmModal";
import ProfileModal       from "./superadmin/modals/ProfileModal";

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bg:          "#0A0A0F",
  surface:     "#111116",
  surface2:    "#16161D",
  border:      "rgba(255,255,255,0.06)",
  accent:      "#8B5CF6",
  accentLight: "#A78BFA",
  green:       "#10B981",
  red:         "#EF4444",
  amber:       "#F59E0B",
  blue:        "#3B82F6",
  pink:        "#EC4899",
  text:        "#FFFFFF",
  text2:       "#A1A1AA",
  text3:       "#52525B",
  glow:        "0 0 20px rgba(139,92,246,0.35)",
  font:        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const glassCard = {
  background: `linear-gradient(135deg, ${T.surface} 0%, ${T.surface2} 100%)`,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  backdropFilter: "blur(12px)",
};

// ── Neural Vortex Canvas (WebGL background) ────────────────────────────────
const NeuralCanvas = memo(() => {
  const canvasRef = useRef(null);
  const ptrRef    = useRef({ x: 0, y: 0, tX: 0, tY: 0 });
  const rafRef    = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const gl = el.getContext("webgl") || el.getContext("experimental-webgl");
    if (!gl) return;

    const vs = `precision mediump float;attribute vec2 a_pos;varying vec2 vUv;void main(){vUv=.5*(a_pos+1.);gl_Position=vec4(a_pos,0.,1.);}`;
    const fs = `precision mediump float;varying vec2 vUv;uniform float u_t;uniform float u_ratio;uniform vec2 u_ptr;
      vec2 rot(vec2 u,float th){return mat2(cos(th),sin(th),-sin(th),cos(th))*u;}
      float shape(vec2 u,float t,float p){vec2 sa=vec2(0.),r=vec2(0.);float s=8.;
        for(int j=0;j<15;j++){u=rot(u,1.);sa=rot(sa,1.);vec2 l=u*s+float(j)+sa-t;sa+=sin(l)+2.4*p;r+=(.5+.5*cos(l))/s;s*=1.2;}
        return r.x+r.y;}
      void main(){vec2 u=.5*vUv;u.x*=u_ratio;vec2 ptr=vUv-u_ptr;ptr.x*=u_ratio;float p=clamp(length(ptr),0.,1.);p=.5*pow(1.-p,2.);
        float t=.001*u_t;float n=shape(u,t,p);n=1.2*pow(n,3.)+pow(n,10.);n=max(.0,n-.5);n*=(1.-length(vUv-.5));
        vec3 c=mix(vec3(.5,.15,.65),vec3(.02,.7,.9),.32);c+=vec3(.15,0.,.6)*sin(2.);c*=n;gl_FragColor=vec4(c,n);}`;

    const compile = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const prog = gl.createProgram();
    const vsS = compile(vs, gl.VERTEX_SHADER);
    const fsS = compile(fs, gl.FRAGMENT_SHADER);
    if (!vsS || !fsS) return;
    gl.attachShader(prog, vsS); gl.attachShader(prog, fsS); gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uT   = gl.getUniformLocation(prog, "u_t");
    const uR   = gl.getUniformLocation(prog, "u_ratio");
    const uPtr = gl.getUniformLocation(prog, "u_ptr");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      el.width  = window.innerWidth  * dpr;
      el.height = window.innerHeight * dpr;
      gl.viewport(0, 0, el.width, el.height);
      gl.uniform1f(uR, el.width / el.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const p = ptrRef.current;
      p.x += (p.tX - p.x) * 0.15;
      p.y += (p.tY - p.y) * 0.15;
      gl.uniform1f(uT, performance.now());
      gl.uniform2f(uPtr, p.x / window.innerWidth, 1 - p.y / window.innerHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    const move = e => { ptrRef.current.tX = e.clientX; ptrRef.current.tY = e.clientY; };
    window.addEventListener("pointermove", move);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity: 0.18, zIndex: 0,
      }}
    />
  );
});

// ── 3D Stat Card ────────────────────────────────────────────────────────────
const Stat3DCard = memo(({ card }) => {
  const ref = useRef(null);
  const [rot, setRot]         = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top  - r.height / 2;
    setRot({ x: -(y / r.height) * 8, y: (x / r.width) * 8 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setRot({ x: 0, y: 0 }); }}
      animate={{ rotateX: rot.x, rotateY: rot.y, y: hovered ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      style={{
        ...glassCard,
        padding: 18,
        cursor: "default",
        transformStyle: "preserve-3d",
        position: "relative",
        overflow: "hidden",
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${card.color}30` : "none",
        transition: "box-shadow 0.3s",
      }}
    >
      {/* glow bottom */}
      <motion.div
        animate={{ opacity: hovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "65%",
          background: `radial-gradient(ellipse at bottom, ${card.color}70 -30%, transparent 70%)`,
          filter: "blur(18px)", pointerEvents: "none",
        }}
      />
      {/* reflection */}
      <motion.div
        animate={{ opacity: hovered ? 0.07 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      {/* bottom border glow */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${card.color}, transparent)`,
          boxShadow: `0 0 12px ${card.color}`,
          pointerEvents: "none",
        }}
      />
      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: card.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: hovered ? `0 4px 12px ${card.color}40` : "none",
            transition: "box-shadow 0.3s",
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
      </div>
    </motion.div>
  );
});

// ── Main Component ─────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const navigate = useNavigate();
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [users, setUsers]             = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [reports, setReports]         = useState([]);
  const [logs, setLogs]               = useState([]);
  const [admins, setAdmins]           = useState([]);
  const [stats, setStats]             = useState({
    totalUsers: 0, onlineUsers: 0, totalTournaments: 0, activeTournaments: 0,
    totalMatches: 0, totalCoins: 0, totalReports: 0, bannedUsers: 0,
    pendingVerifications: 0, openTickets: 0, todayRevenue: 0, monthlyRevenue: 0,
  });

  // UI
  const [selectedUser, setSelectedUser]             = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showRoleModal, setShowRoleModal]           = useState(false);
  const [showBanModal, setShowBanModal]             = useState(false);
  const [showWalletModal, setShowWalletModal]       = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading]           = useState(false);
  const [banDuration, setBanDuration]               = useState("24h");
  const [tournamentStatus, setTournamentStatus]     = useState("open");
  const [search, setSearch]                         = useState("");
  const [filter, setFilter]                         = useState("all");
  const [message, setMessage]                       = useState({ type: "", text: "" });
  const [grantAmount, setGrantAmount]               = useState("");
  const [grantReason, setGrantReason]               = useState("");
  const [walletSearch, setWalletSearch]             = useState("");
  const [maintenanceMode, setMaintenanceMode]       = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [tournamentsEnabled, setTournamentsEnabled] = useState(true);
  const [showProfileModal, setShowProfileModal]     = useState(false);
  const [profileMenuOpen, setProfileMenuOpen]       = useState(false);

  const showMsg = useCallback((type, text, delay = 3500) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), delay);
  }, []);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const { data: pr } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: wal } = await supabase.from("wallets").select("user_id,balance");
      const wm = {};
      (wal || []).forEach(w => { wm[w.user_id] = w.balance; });
      setUsers((pr || []).map(u => ({
        ...u,
        coins: wm[u.id] || 0,
        display_name: u.username || u.full_name || u.email?.split("@")[0] || "—",
      })));
    } catch {}
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data } = await supabase.from("profiles").select("*")
        .in("role", ["admin","super_admin","founder","fondateur","designer"])
        .order("created_at", { ascending: false });
      setAdmins(data || []);
    } catch {}
  }, []);

  const fetchTournaments = useCallback(async () => {
    try {
      const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(50);
      setTournaments(data || []);
    } catch { setTournaments([]); }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      setReports(data || []);
    } catch { setReports([]); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
    } catch { setLogs([]); }
  }, []);

  const fetchStats = useCallback(async () => {
    const cnt = async q => { try { const r = await q; return r.count || 0; } catch { return 0; } };
    const [totalUsers, bannedUsers, pendingVerif, totalTournaments, activeTournaments, totalMatches, totalReports, openTickets] = await Promise.all([
      cnt(supabase.from("profiles").select("*",{count:"exact",head:true})),
      cnt(supabase.from("profiles").select("*",{count:"exact",head:true}).eq("role","banned")),
      cnt(supabase.from("profiles").select("*",{count:"exact",head:true}).eq("verification_status","pending")),
      cnt(supabase.from("tournaments").select("*",{count:"exact",head:true})),
      cnt(supabase.from("tournaments").select("*",{count:"exact",head:true}).eq("status","open")),
      cnt(supabase.from("match_results").select("*",{count:"exact",head:true})),
      cnt(supabase.from("reports").select("*",{count:"exact",head:true}).eq("status","pending")),
      cnt(supabase.from("support_tickets").select("*",{count:"exact",head:true}).eq("status","open")),
    ]);
    let totalCoins = 0;
    try { const { data } = await supabase.from("wallets").select("balance"); totalCoins = (data||[]).reduce((s,w)=>s+(w.balance||0),0); } catch {}
    setStats({ totalUsers, onlineUsers: 0, totalTournaments, activeTournaments, totalMatches, totalCoins, totalReports, bannedUsers, pendingVerifications: pendingVerif, openTickets, todayRevenue: 0, monthlyRevenue: 0 });
  }, []);

  const fetchSystemConfig = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_config").select("*").single();
      setMaintenanceMode(data?.maintenance_mode || false);
      setRegistrationEnabled(data?.registration_enabled !== false);
      setTournamentsEnabled(data?.tournaments_enabled !== false);
    } catch {}
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchTournaments(), fetchReports(), fetchLogs(), fetchAdmins(), fetchStats(), fetchSystemConfig()]);
    setLoading(false);
  }, [fetchUsers, fetchTournaments, fetchReports, fetchLogs, fetchAdmins, fetchStats, fetchSystemConfig]);

  const checkSuperAdmin = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      if (!data || data.role !== "super_admin") { navigate("/dashboard"); return; }
      setProfile(data);
      await fetchAllData();
    } catch { setLoading(false); }
  }, [navigate, fetchAllData]);

  useEffect(() => {
    checkSuperAdmin();
    const iv = setInterval(() => { if (profile?.role === "super_admin") fetchStats(); }, 30000);
    return () => clearInterval(iv);
  }, [checkSuperAdmin]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const updateUserRole = useCallback(async (userId, role) => {
    try {
      const { error } = await supabase.rpc("set_user_role", { target_user: userId, new_role: role });
      if (error) {
        const { error: e2 } = await supabase.from("profiles").update({ role }).eq("id", userId);
        if (e2) throw e2;
      }
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "change_role", details: { target_user: userId, new_role: role } }]);
      showMsg("success", "Rôle modifié ✨");
      await Promise.all([fetchUsers(), fetchAdmins()]);
      setShowRoleModal(false);
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchUsers, fetchAdmins, showMsg]);

  const banUser = useCallback(async (userId, duration) => {
    const until = new Date();
    if (duration === "24h") until.setHours(until.getHours() + 24);
    else if (duration === "7d") until.setDate(until.getDate() + 7);
    else if (duration === "30d") until.setDate(until.getDate() + 30);
    else until.setFullYear(until.getFullYear() + 10);
    try {
      const { error } = await supabase.rpc("ban_user", { target_user: userId, banned_until: until.toISOString(), banned_by: profile.id });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "ban_user", details: { target_user: userId, duration } }]);
      showMsg("success", "Utilisateur banni 🔨");
      await fetchUsers(); setShowBanModal(false);
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchUsers, showMsg]);

  const unbanUser = useCallback(async (userId) => {
    try {
      const { error } = await supabase.rpc("unban_user", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "unban_user", details: { target_user: userId } }]);
      showMsg("success", "Utilisateur débanni 🎉");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchUsers, showMsg]);

  const deleteUser = useCallback(async (userId) => {
    if (!window.confirm("⚠️ Supprimer définitivement ? Action irréversible.")) return;
    try {
      const { error } = await supabase.rpc("delete_user_complete", { target_user: userId });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_user", details: { target_user: userId } }]);
      showMsg("success", "Utilisateur supprimé 🗑️");
      await fetchUsers();
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchUsers, showMsg]);

  const grantCoins = useCallback(async () => {
    if (!selectedUser) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) { showMsg("error", "Montant invalide"); return; }
    if (!grantReason.trim()) { showMsg("error", "Raison obligatoire"); return; }
    try {
      const { data, error } = await supabase.rpc("admin_adjust_coins", { p_target_user_id: selectedUser.id, p_amount: amount, p_reason: grantReason });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur");
      showMsg("success", `${amount > 0 ? "➕" : "➖"} ${Math.abs(amount)} CP → ${selectedUser.display_name} (${data.new_balance} total)`, 4000);
      setGrantAmount(""); setGrantReason(""); setShowWalletModal(false);
      await fetchUsers();
    } catch (err) { showMsg("error", err.message); }
  }, [selectedUser, grantAmount, grantReason, fetchUsers, showMsg]);

  const deleteTournament = useCallback(async (id) => {
    try {
      const { error } = await supabase.rpc("delete_tournament_complete", { tournament_id: id });
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "delete_tournament", details: { tournament_id: id } }]);
      showMsg("success", "Tournoi supprimé 🏆");
      await fetchTournaments();
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchTournaments, showMsg]);

  const updateTournamentStatus = useCallback(async (id, status) => {
    try {
      const { error } = await supabase.from("tournaments").update({ status }).eq("id", id);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "update_tournament_status", details: { tournament_id: id, status } }]);
      showMsg("success", "Statut mis à jour 📋");
      setShowTournamentModal(false); await fetchTournaments();
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchTournaments, showMsg]);

  const resolveReport = useCallback(async (reportId, action) => {
    try {
      const { error } = await supabase.from("reports").update({ status: "resolved", resolved_by: profile.id, resolved_action: action, resolved_at: new Date().toISOString() }).eq("id", reportId);
      if (error) throw error;
      await supabase.from("admin_logs").insert([{ user_id: profile.id, action: "resolve_report", details: { report_id: reportId, action } }]);
      showMsg("success", "Rapport résolu ✅");
      await fetchReports();
    } catch (err) { showMsg("error", err.message); }
  }, [profile, fetchReports, showMsg]);

  const updateSystemConfig = useCallback(async () => {
    try {
      const { error } = await supabase.from("system_config").upsert({ maintenance_mode: maintenanceMode, registration_enabled: registrationEnabled, tournaments_enabled: tournamentsEnabled, updated_by: profile.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      showMsg("success", "Configuration mise à jour ⚙️");
    } catch (err) { showMsg("error", err.message); }
  }, [maintenanceMode, registrationEnabled, tournamentsEnabled, profile, showMsg]);

  // ── Filtered users ────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const match = u.display_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.free_fire_id?.includes(search);
    if (filter === "all")      return match;
    if (filter === "admins")   return match && u.role === "admin";
    if (filter === "founders") return match && u.role === "founder";
    if (filter === "banned")   return match && u.role === "banned";
    if (filter === "pending")  return match && u.verification_status === "pending";
    return match;
  });

  // ── Tabs + Stats ──────────────────────────────────────────────────────────
  const TABS = [
    { id: "dashboard",   label: "Dashboard",     icon: LayoutDashboard },
    { id: "users",       label: "Utilisateurs",  icon: Users,       badge: users.length },
    { id: "staff",       label: "Staff",         icon: ShieldCheck, badge: admins.length },
    { id: "tournaments", label: "Tournois",       icon: Trophy,      badge: tournaments.length },
    { id: "reports",     label: "Signalements",  icon: AlertTriangle, badge: reports.length },
    { id: "economy",     label: "Économie",      icon: TrendingUp },
    { id: "security",    label: "Sécurité",      icon: Lock },
    { id: "logs",        label: "Logs",          icon: FileText },
    { id: "system",      label: "Système",       icon: Settings },
  ];

  const STAT_CARDS = [
    { label: "UTILISATEURS",  value: stats.totalUsers,           icon: Users,      color: T.accent, bg: `${T.accent}18` },
    { label: "EN LIGNE",      value: stats.onlineUsers,          icon: Wifi,       color: T.green,  bg: `${T.green}18` },
    { label: "BANNIS",        value: stats.bannedUsers,          icon: ShieldOff,  color: T.red,    bg: `${T.red}18` },
    { label: "EN ATTENTE",    value: stats.pendingVerifications, icon: Clock,      color: T.amber,  bg: `${T.amber}18` },
    { label: "TOURNOIS",      value: stats.totalTournaments,     icon: Trophy,     color: T.accentLight, bg: `${T.accentLight}18` },
    { label: "MATCHES",       value: stats.totalMatches,         icon: Gamepad2,   color: T.blue,   bg: `${T.blue}18` },
    { label: "TICKETS",       value: stats.openTickets,          icon: Ticket,     color: T.pink,   bg: `${T.pink}18` },
    { label: "REPORTS",       value: stats.totalReports,         icon: Flag,       color: T.amber,  bg: `${T.amber}18` },
  ];

  const initials = (profile?.username || profile?.email || "SA")[0]?.toUpperCase();

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, position: "relative" }}>
      <NeuralCanvas />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Crown size={48} color={T.accent} />
        </motion.div>
        <p style={{ color: T.text2, marginTop: 16, fontSize: 12, letterSpacing: 3 }}>CHARGEMENT SUPER ADMIN</p>
      </motion.div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, position: "relative" }}>
      <NeuralCanvas />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { scrollbar-width: thin; scrollbar-color: ${T.accent} ${T.surface2}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: ${T.surface2}; }
        ::-webkit-scrollbar-thumb { background: ${T.accent}; border-radius: 10px; }
        .sa-btn { transition: all 0.2s; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; }
        .sa-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .sa-btn:active { transform: scale(0.97); }
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header style={{
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(180deg, ${T.surface}ee 0%, ${T.surface2}cc 100%)`,
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(20px)",
        boxShadow: `0 1px 0 ${T.border}`,
      }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <motion.div whileHover={{ scale: 1.03 }} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: T.glow,
              }}>
                <Crown size={18} color="#fff" />
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>CipherPool</span>
                <span style={{ fontSize: 10, color: T.accent, marginLeft: 8, fontWeight: 700, letterSpacing: 2 }}>SUPER ADMIN</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: 40, background: `${T.green}12`, border: `1px solid ${T.green}30` }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
              <span style={{ fontSize: 10, color: T.green, fontWeight: 700, letterSpacing: 1 }}>OPERATIONAL</span>
            </motion.div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Refresh */}
            <button
              className="sa-btn"
              onClick={() => { fetchAllData(); showMsg("success", "Actualisé 🔄"); }}
              style={{ padding: "8px 16px", borderRadius: 10, background: T.surface2, border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, fontWeight: 500 }}
            >
              <RefreshCw size={14} /> Rafraîchir
            </button>

            {/* Admin panel link */}
            <Link to="/admin" style={{ textDecoration: "none" }}>
              <button className="sa-btn" style={{ padding: "8px 16px", borderRadius: 10, background: T.surface2, border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, fontWeight: 500 }}>
                <ShieldCheck size={14} /> Admin Panel
              </button>
            </Link>

            {/* Profile dropdown */}
            <div style={{ position: "relative" }}>
              <button
                className="sa-btn"
                onClick={() => setProfileMenuOpen(p => !p)}
                style={{ padding: "4px 14px 4px 6px", borderRadius: 40, background: T.surface2, border: `1px solid ${T.border}` }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.accent}, ${T.accentLight})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: T.glow,
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                    : <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{initials}</span>
                  }
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  {profile?.username || profile?.email?.split("@")[0]}
                </span>
                <ChevronRight size={13} style={{ color: T.text3, transform: profileMenuOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 210, ...glassCard, padding: 8, zIndex: 1000 }}
                    >
                      {[
                        { label: "Modifier profil", icon: UserCircle2, action: () => { setShowProfileModal(true); setProfileMenuOpen(false); } },
                        { label: "Retour site",     icon: ArrowUpRight, action: () => navigate("/dashboard") },
                      ].map((item, i) => (
                        <React.Fragment key={i}>
                          {i === 1 && <div style={{ height: 1, background: T.border, margin: "6px 0" }} />}
                          <button
                            onClick={item.action}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "transparent", border: "none", color: T.text2, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                            onMouseEnter={e => e.currentTarget.style.background = T.border}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <item.icon size={15} /> {item.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </motion.div>
                    <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setProfileMenuOpen(false)} />
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ══ MAIN ════════════════════════════════════════════════════════════ */}
      <main style={{ maxWidth: 1600, margin: "0 auto", padding: "32px 28px", position: "relative", zIndex: 1 }}>

        {/* Toast */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              style={{
                position: "fixed", top: 76, right: 28, zIndex: 2000,
                padding: "12px 20px", borderRadius: 12,
                background: message.type === "success" ? `${T.green}18` : `${T.red}18`,
                border: `1px solid ${message.type === "success" ? T.green + "40" : T.red + "40"}`,
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "center", gap: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {message.type === "success"
                ? <CheckCircle size={16} color={T.green} />
                : <AlertTriangle size={16} color={T.red} />
              }
              <span style={{ fontSize: 13, fontWeight: 500, color: message.type === "success" ? T.green : T.red }}>
                {message.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", background: `linear-gradient(135deg, ${T.text}, ${T.accentLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Panneau de Contrôle Suprême
          </motion.h1>
          <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}
            style={{ fontSize: 13, color: T.text3, margin: 0 }}>
            Gestion avancée — utilisateurs, tournois, économie et configuration système
          </motion.p>
        </div>

        {/* 3D Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28, perspective: 1000 }}>
          {STAT_CARDS.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Stat3DCard card={card} />
            </motion.div>
          ))}
        </div>

        {/* Revenue row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "REVENU AUJOURD'HUI", value: stats.todayRevenue,   icon: TrendingUp, color: T.accent },
            { label: "REVENU CE MOIS",     value: stats.monthlyRevenue, icon: BarChart3,  color: T.blue },
            { label: "COINS EN CIRCULATION", value: stats.totalCoins,   icon: Coins,      color: T.amber },
          ].map((c, i) => (
            <div key={i} style={{ ...glassCard, padding: "18px 22px", display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <c.icon size={22} color={c.color} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, letterSpacing: 1, marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>
                  {c.value.toLocaleString()} <span style={{ fontSize: 12, color: T.text3 }}>CP</span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Tab navigation */}
        <div style={{ borderBottom: `1px solid ${T.border}`, display: "flex", gap: 2, marginBottom: 24, overflowX: "auto", paddingBottom: 1 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 18px", border: "none",
                  borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                  background: active ? `${T.accent}12` : "transparent",
                  color: active ? T.text : T.text3,
                  cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
                  display: "flex", alignItems: "center", gap: 8,
                  whiteSpace: "nowrap", transition: "all 0.2s",
                  borderRadius: "8px 8px 0 0", fontFamily: T.font,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.text2; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.text3; }}
              >
                <tab.icon size={15} style={{ color: active ? T.accent : "inherit" }} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span style={{
                    fontSize: 10, padding: "1px 8px", borderRadius: 20,
                    background: active ? `${T.accent}22` : T.surface2,
                    color: active ? T.accent : T.text3, fontWeight: 700,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{ ...glassCard, padding: 24, minHeight: 500 }}
        >
          <Suspense fallback={
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                <Zap size={30} color={T.accent} />
              </motion.div>
            </div>
          }>
            {activeTab === "dashboard"   && <DashboardTab stats={stats} users={users} logs={logs} setActiveTab={setActiveTab} setFilter={setFilter} setSelectedUser={setSelectedUser} setGrantAmount={setGrantAmount} setGrantReason={setGrantReason} setWalletSearch={setWalletSearch} setShowWalletModal={setShowWalletModal} />}
            {activeTab === "users"       && <UsersTab filteredUsers={filteredUsers} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setSelectedUser={setSelectedUser} setShowRoleModal={setShowRoleModal} setShowBanModal={setShowBanModal} setShowWalletModal={setShowWalletModal} unbanUser={unbanUser} deleteUser={deleteUser} />}
            {activeTab === "staff"       && <StaffTab users={users} updateUserRole={updateUserRole} currentUserRole={profile?.role} />}
            {activeTab === "tournaments" && <TournamentsTab tournaments={tournaments} setSelectedTournament={setSelectedTournament} setShowTournamentModal={setShowTournamentModal} setTournamentToDelete={setTournamentToDelete} setShowDeleteConfirm={setShowDeleteConfirm} />}
            {activeTab === "reports"     && <ReportsTab reports={reports} resolveReport={resolveReport} />}
            {activeTab === "economy"     && <EconomyTab stats={stats} setMessage={setMessage} />}
            {activeTab === "security"    && <SecurityTab />}
            {activeTab === "logs"        && <LogsTab logs={logs} users={users} />}
            {activeTab === "system"      && <SystemTab maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode} registrationEnabled={registrationEnabled} setRegistrationEnabled={setRegistrationEnabled} tournamentsEnabled={tournamentsEnabled} setTournamentsEnabled={setTournamentsEnabled} updateSystemConfig={updateSystemConfig} />}
          </Suspense>
        </motion.div>
      </main>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showProfileModal && <ProfileModal profile={profile} onClose={() => setShowProfileModal(false)} onSaved={u => setProfile(p => ({ ...p, ...u }))} />}
        {showRoleModal && selectedUser && <RoleModal selectedUser={selectedUser} updateUserRole={updateUserRole} onClose={() => setShowRoleModal(false)} />}
        {showBanModal && selectedUser && <BanModal selectedUser={selectedUser} banDuration={banDuration} setBanDuration={setBanDuration} banUser={banUser} onClose={() => setShowBanModal(false)} />}
        {showWalletModal && <WalletModal users={users} selectedUser={selectedUser} setSelectedUser={setSelectedUser} walletSearch={walletSearch} setWalletSearch={setWalletSearch} grantAmount={grantAmount} setGrantAmount={setGrantAmount} grantReason={grantReason} setGrantReason={setGrantReason} grantCoins={grantCoins} onClose={() => { setShowWalletModal(false); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setSelectedUser(null); }} />}
        {showTournamentModal && selectedTournament && <TournamentModal selectedTournament={selectedTournament} tournamentStatus={tournamentStatus} setTournamentStatus={setTournamentStatus} updateTournamentStatus={updateTournamentStatus} onClose={() => setShowTournamentModal(false)} />}
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
