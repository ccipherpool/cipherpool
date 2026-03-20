import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";

// ── helpers ────────────────────────────────────────────────────────────────────
const ago = (ts) => {
  if (!ts) return "—";
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return `${d}s`;
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}j`;
};

const fmt = (n) => (n ?? 0).toLocaleString("fr-FR");

const AVATAR_COLORS = [
  "linear-gradient(135deg,#7c3aed,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
];
const avatarBg = (name) =>
  AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── component ──────────────────────────────────────────────────────────────────
export default function SuperAdmin() {
  const navigate   = useNavigate();
  const { profile } = useOutletContext();
  const [tab, setTab]         = useState("dashboard");
  const [stats, setStats]     = useState({});
  const [users, setUsers]     = useState([]);
  const [pending, setPending] = useState([]);
  const [admins, setAdmins]   = useState([]);
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  // guard
  useEffect(() => {
    if (profile && profile.role !== "super_admin") navigate("/dashboard");
  }, [profile, navigate]);

  // ── fetch all data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: totalTournois },
        { count: totalMatches },
        { count: totalTickets },
        { data: recentActivity },
        { data: allUsers },
        { data: pendingUsers },
        { data: adminList },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("tournaments").select("*", { count: "exact", head: true }),
        supabase.from("match_results").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }),
        supabase.from("admin_logs")
          .select("admin_id, action, target_id, created_at, admin:profiles!admin_logs_admin_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("profiles")
          .select("id, username, full_name, email, role, verification_status, coins, created_at, last_seen, is_banned")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.rpc("get_pending_users"),
        supabase.from("profiles")
          .select("id, username, full_name, email, role, created_at, last_seen")
          .in("role", ["admin", "super_admin", "founder", "fondateur", "designer"])
          .order("role"),
      ]);

      // online = last seen < 15 min
      const threshold = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const onlineCount = (allUsers || []).filter(u => u.last_seen && u.last_seen > threshold).length;
      const bannedCount = (allUsers || []).filter(u => u.is_banned).length;

      setStats({
        totalUsers: totalUsers || 0,
        online: onlineCount,
        banned: bannedCount,
        pending: (pendingUsers || []).length,
        tournois: totalTournois || 0,
        matches: totalMatches || 0,
        tickets: totalTickets || 0,
      });

      setUsers(allUsers || []);
      setPending(pendingUsers || []);
      setAdmins(adminList || []);
      setLogs(recentActivity || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("SuperAdmin fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // realtime — new user registered
  useEffect(() => {
    const sub = supabase
      .channel("superadmin-new-users")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "profiles",
      }, () => fetchAll())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
      }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [fetchAll]);

  // ── actions ───────────────────────────────────────────────────────────────
  const approveUser = async (userId) => {
    const { data } = await supabase.rpc("approve_user_verification", { p_user_id: userId });
    if (data?.success) fetchAll();
    else alert("Erreur lors de l'approbation");
  };

  const rejectUser = async (userId) => {
    if (!confirm("Rejeter cet utilisateur ?")) return;
    const { data } = await supabase.rpc("reject_user_verification", { p_user_id: userId });
    if (data?.success) fetchAll();
    else alert("Erreur lors du rejet");
  };

  const changeRole = async (userId, newRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    fetchAll();
  };

  const banUser = async (userId, ban) => {
    await supabase.from("profiles").update({ is_banned: ban }).eq("id", userId);
    fetchAll();
  };

  const deleteUser = async (userId) => {
    if (!confirm("Supprimer définitivement cet utilisateur ?")) return;
    await supabase.rpc("delete_user_complete", { p_user_id: userId });
    fetchAll();
  };

  // ── tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "dashboard",    label: "🏠 Dashboard" },
    { id: "pending",      label: `✅ Vérifier (${stats.pending || 0})`, badge: stats.pending },
    { id: "users",        label: `👥 Utilisateurs (${stats.totalUsers || 0})` },
    { id: "admins",       label: `🛡️ Admins (${admins.length})` },
    { id: "logs",         label: "📋 Logs" },
  ];

  if (!profile || profile.role !== "super_admin") return null;

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#07070f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>

      {/* ── header ── */}
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#0f172a)", borderBottom: "1px solid rgba(139,92,246,0.2)", padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, background: "linear-gradient(135deg,#a78bfa,#38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ⚡ SUPER ADMIN
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {profile.full_name} — {lastRefresh ? `Mise à jour: ${ago(lastRefresh)} ago` : "Chargement..."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {stats.pending > 0 && (
              <div onClick={() => setTab("pending")} style={{ cursor: "pointer", padding: "8px 16px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 10, fontSize: 13, color: "#22c55e", fontWeight: 700, animation: "pulse 2s infinite" }}>
                🔔 {stats.pending} en attente de vérification
              </div>
            )}
            <button onClick={fetchAll} style={{ padding: "8px 16px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 10, color: "#a78bfa", cursor: "pointer", fontSize: 13 }}>
              ↻ Rafraîchir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── stats cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Utilisateurs", val: stats.totalUsers, color: "#a78bfa", icon: "👥" },
            { label: "En ligne", val: stats.online, color: "#22c55e", icon: "🟢" },
            { label: "En attente", val: stats.pending, color: "#f59e0b", icon: "⏳" },
            { label: "Bannis", val: stats.banned, color: "#ef4444", icon: "🚫" },
            { label: "Tournois", val: stats.tournois, color: "#06b6d4", icon: "🏆" },
            { label: "Matches", val: stats.matches, color: "#8b5cf6", icon: "⚔️" },
            { label: "Tickets", val: stats.tickets, color: "#f97316", icon: "🎫" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#0f0f1a", border: `1px solid ${s.color}22`, borderRadius: 12, padding: "16px 14px" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{fmt(s.val)}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── tab bar ── */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 12, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", position: "relative",
                background: tab === t.id ? "rgba(139,92,246,0.2)" : "transparent",
                color: tab === t.id ? "#a78bfa" : "#64748b",
                outline: tab === t.id ? "1px solid rgba(139,92,246,0.4)" : "none",
              }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: DASHBOARD */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* Pending alert */}
            {pending.length > 0 && (
              <div onClick={() => setTab("pending")} style={{ gridColumn: "1/-1", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 15 }}>🔔 {pending.length} utilisateur{pending.length > 1 ? "s" : ""} en attente de vérification</div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Cliquez pour vérifier et approuver les nouveaux comptes</div>
                </div>
                <div style={{ color: "#22c55e", fontSize: 20 }}>→</div>
              </div>
            )}

            {/* Recent activity */}
            <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "#94a3b8", fontWeight: 700 }}>📋 ACTIVITÉ RÉCENTE</h3>
              {logs.length === 0 ? (
                <p style={{ color: "#334155", fontSize: 13 }}>Aucune activité</p>
              ) : logs.slice(0, 10).map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 12 }}>
                  <span style={{ color: "#a78bfa" }}>{l.admin?.full_name || "Admin"}</span>
                  <span style={{ color: "#64748b" }}>{l.action}</span>
                  <span style={{ color: "#334155" }}>{ago(l.created_at)}</span>
                </div>
              ))}
            </div>

            {/* Recent registrations */}
            <div style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, color: "#94a3b8", fontWeight: 700 }}>🆕 DERNIÈRES INSCRIPTIONS</h3>
              {users.slice(0, 8).map((u, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: avatarBg(u.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                      {(u.full_name || u.username || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{u.full_name || u.username}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 700,
                      background: u.verification_status === "verified" ? "rgba(34,197,94,0.15)" : u.verification_status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: u.verification_status === "verified" ? "#22c55e" : u.verification_status === "rejected" ? "#ef4444" : "#f59e0b"
                    }}>
                      {u.verification_status === "verified" ? "✓ Vérifié" : u.verification_status === "rejected" ? "✗ Rejeté" : "⏳ En attente"}
                    </span>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{ago(u.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: PENDING VERIFICATION */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "pending" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#f59e0b" }}>
              ✅ Utilisateurs en attente de vérification ({pending.length})
            </h2>

            {pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#334155" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Aucun compte en attente</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>Tous les utilisateurs sont vérifiés</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pending.map(u => (
                  <div key={u.id} style={{ background: "#0f0f1a", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: avatarBg(u.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                        {(u.full_name || u.username || "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{u.full_name || "—"}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>@{u.username} · {u.email}</div>
                        {u.free_fire_id && <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 2 }}>FF ID: {u.free_fire_id}</div>}
                        <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>Inscrit {ago(u.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={() => approveUser(u.id)}
                        style={{ padding: "10px 20px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 10, color: "#22c55e", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        ✅ Approuver
                      </button>
                      <button onClick={() => rejectUser(u.id)}
                        style={{ padding: "10px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, color: "#ef4444", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                        ✗ Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: USERS */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "users" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>👥 Tous les utilisateurs ({users.length})</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Utilisateur", "Email", "Rôle", "Statut", "Coins", "Inscrit", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: avatarBg(u.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {(u.full_name || u.username || "?")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{u.full_name || "—"}</div>
                            <div style={{ fontSize: 11, color: "#475569" }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "#64748b" }}>{u.email}</td>
                      <td style={{ padding: "12px" }}>
                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0", padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>
                          {["user","admin","super_admin","founder","fondateur","designer"].map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 10, fontWeight: 700,
                          background: u.verification_status === "verified" ? "rgba(34,197,94,0.15)" : u.verification_status === "rejected" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                          color: u.verification_status === "verified" ? "#22c55e" : u.verification_status === "rejected" ? "#ef4444" : "#f59e0b"
                        }}>
                          {u.verification_status || "pending"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#a78bfa" }}>{fmt(u.coins)}</td>
                      <td style={{ padding: "12px", color: "#475569", whiteSpace: "nowrap" }}>{ago(u.created_at)}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {u.verification_status === "pending" && (
                            <button onClick={() => approveUser(u.id)}
                              style={{ padding: "4px 10px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, color: "#22c55e", cursor: "pointer", fontSize: 11 }}>
                              ✅
                            </button>
                          )}
                          <button onClick={() => banUser(u.id, !u.is_banned)}
                            style={{ padding: "4px 10px", background: u.is_banned ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${u.is_banned ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, borderRadius: 6, color: u.is_banned ? "#22c55e" : "#f59e0b", cursor: "pointer", fontSize: 11 }}>
                            {u.is_banned ? "Débannir" : "Bannir"}
                          </button>
                          {u.role !== "super_admin" && (
                            <button onClick={() => deleteUser(u.id)}
                              style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 11 }}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: ADMINS */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "admins" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🛡️ Staff & Admins</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {admins.map(u => (
                <div key={u.id} style={{ background: "#0f0f1a", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: avatarBg(u.full_name), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                      {(u.full_name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, padding: "4px 10px", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, color: "#a78bfa", fontWeight: 700 }}>
                      {u.role}
                    </span>
                    <span style={{ fontSize: 11, color: "#334155" }}>Vu {ago(u.last_seen)}</span>
                    {u.role !== "super_admin" && (
                      <button onClick={() => changeRole(u.id, "user")}
                        style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, color: "#ef4444", cursor: "pointer", fontSize: 11 }}>
                        Rétrograder
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* TAB: LOGS */}
        {/* ══════════════════════════════════════════════════════ */}
        {tab === "logs" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📋 Logs d'activité</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {logs.map((l, i) => (
                <div key={i} style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#a78bfa" }}>{l.admin?.full_name || "System"}</span>
                  <span style={{ color: "#94a3b8" }}>{l.action}</span>
                  <span style={{ color: "#334155" }}>{new Date(l.created_at).toLocaleString("fr-FR")}</span>
                </div>
              ))}
              {logs.length === 0 && <p style={{ color: "#334155" }}>Aucun log disponible</p>}
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}