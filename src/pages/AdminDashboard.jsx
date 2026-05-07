import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Users,
  Zap,
  TrendingUp,
  Wallet,
  UserCheck,
  Trophy,
  Shield,
  Newspaper,
  ShoppingBag,
  Crown,
  ArrowRight,
  Activity,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────
const cardStyle = {
  background: "linear-gradient(135deg,rgba(12,12,26,1),rgba(20,20,38,0.98))",
  border: "1px solid rgba(255,255,255,0.06)",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCP(value) {
  // Format as "1 000 000 CP" with narrow-space thousands separator
  return value.toLocaleString("fr-FR").replace(/ /g, " ") + " CP";
}

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── sub-components ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, borderColor }) {
  return (
    <div
      style={{ ...cardStyle, borderTop: `2px solid ${borderColor}` }}
      className="rounded-xl p-5 relative overflow-hidden"
    >
      {/* icon top-right */}
      <div className="absolute top-4 right-4 opacity-20">
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
        {label}
      </p>
      <p className="text-3xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ActionButton({ to, icon: Icon, label, color }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200 group"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.07)";
        e.currentTarget.style.borderColor = color + "55";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color + "22" }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </span>
      <span className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors flex-1">
        {label}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
    </Link>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin: { label: "Admin", color: "#f97316" },
    moderator: { label: "Modo", color: "#a78bfa" },
    user: { label: "User", color: "#6366f1" },
  };
  const cfg = map[role] || map.user;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.color + "22", color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCoins: 0,
    totalTournaments: 0,
  });
  const [recentUsers, setRecentUsers]         = useState([]);
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      const { count: tournamentsCount } = await supabase
        .from("tournaments")
        .select("*", { count: "exact" });

      setStats({
        totalUsers: usersCount || 0,
        activeUsers: Math.floor((usersCount || 0) * 0.7),
        totalCoins: 1000000,
        totalTournaments: tournamentsCount || 0,
      });

      const { data: recentTournamentsData } = await supabase
        .from("tournaments")
        .select("id,name,status,prize_coins,current_players,max_players,created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      setRecentTournaments(recentTournamentsData || []);

      const { data: recentUsersData } = await supabase
        .from("profiles")
        .select("id,full_name,email,role,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentUsers(recentUsersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div
        style={cardStyle}
        className="rounded-xl px-6 py-5 flex items-center justify-between"
      >
        <div>
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: "linear-gradient(90deg,#6366f1,#818cf8,#a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ADMIN PANEL
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Gérez la plateforme CipherPool — accès restreint
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
            Live
          </span>
        </div>
      </div>

      {/* ── 2. STATS ROW ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Utilisateurs"
          value={stats.totalUsers}
          color="#818cf8"
          borderColor="#6366f1"
        />
        <StatCard
          icon={UserCheck}
          label="Actifs"
          value={stats.activeUsers}
          color="#34d399"
          borderColor="#34d399"
        />
        <StatCard
          icon={Trophy}
          label="Tournois"
          value={stats.totalTournaments}
          color="#a78bfa"
          borderColor="#a78bfa"
        />
        <StatCard
          icon={Wallet}
          label="CP Circulants"
          value={formatCP(stats.totalCoins)}
          color="#f97316"
          borderColor="#f97316"
        />
      </div>

      {/* ── 3. TWO-COLUMN ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left — Recent Tournaments */}
        <div className="lg:col-span-2 space-y-3">
          <div style={cardStyle} className="rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="font-black text-white text-sm uppercase tracking-widest">
                  Tournois Récents
                </h2>
              </div>
              <Link to="/create-tournament"
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", color: "#818cf8" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; }}
              >
                + Créer Tournoi
              </Link>
            </div>

            {recentTournaments.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">
                Aucun tournoi créé pour l'instant.
              </div>
            ) : (
              <div className="space-y-2">
                {recentTournaments.map(t => {
                  const sColor = { active: "#22d3ee", upcoming: "#f97316", completed: "rgba(255,255,255,.3)" }[t.status] || "#818cf8";
                  const sLabel = { active: "EN COURS", upcoming: "À VENIR", completed: "TERMINÉ" }[t.status] || "—";
                  return (
                    <Link key={t.id} to={`/tournaments/${t.id}`}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-150 group"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.07)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
                        🏆
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono" style={{ color: "#f97316" }}>{(t.prize_coins || 0).toLocaleString()} CP</span>
                          <span className="text-white/20">·</span>
                          <span className="text-xs text-white/30">{t.current_players || 0}/{t.max_players || 0} joueurs</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: sColor, background: sColor + "18" }}>{sLabel}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Quick Actions */}
        <div style={cardStyle} className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-400" />
            <h2 className="font-black text-white text-sm uppercase tracking-widest">
              Actions Rapides
            </h2>
          </div>
          <div className="space-y-2">
            <ActionButton
              to="/admin/support"
              icon={Shield}
              label="Support"
              color="#6366f1"
            />
            <ActionButton
              to="/admin/results"
              icon={TrendingUp}
              label="Résultats"
              color="#a78bfa"
            />
            <ActionButton
              to="/admin/news"
              icon={Newspaper}
              label="Actualités"
              color="#818cf8"
            />
            <ActionButton
              to="/admin-store"
              icon={ShoppingBag}
              label="Store Admin"
              color="#f97316"
            />
            <ActionButton
              to="/create-tournament"
              icon={Crown}
              label="Créer Tournoi"
              color="#34d399"
            />
          </div>
        </div>
      </div>

      {/* ── 4. RECENT USERS TABLE ─────────────────────────────────────────── */}
      <div style={cardStyle} className="rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-indigo-400" />
          <h2 className="font-black text-white text-sm uppercase tracking-widest">
            Utilisateurs Récents
          </h2>
          <span
            className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
          >
            10 derniers
          </span>
        </div>

        {recentUsers.length === 0 ? (
          <p className="text-center py-8 text-white/30 text-sm">
            Aucun utilisateur trouvé.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left pb-3 text-white/30 font-semibold text-xs uppercase tracking-widest">
                    Utilisateur
                  </th>
                  <th className="text-left pb-3 text-white/30 font-semibold text-xs uppercase tracking-widest">
                    Rôle
                  </th>
                  <th className="text-left pb-3 text-white/30 font-semibold text-xs uppercase tracking-widest">
                    Inscription
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {/* avatar initials */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg,#6366f1,#a78bfa)",
                            color: "#fff",
                          }}
                        >
                          {getInitials(user.full_name || user.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white/90 truncate">
                            {user.full_name || "—"}
                          </p>
                          <p className="text-white/35 text-xs truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="py-3 text-white/40 text-xs whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
