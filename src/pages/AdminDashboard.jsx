import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Users,
  Zap,
  TrendingUp,
  Wallet,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
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
  const [seasons, setSeasons] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    reset_coins: 0,
    reset_xp: 0,
  });
  const [loading, setLoading] = useState(true);

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

      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("*")
        .order("created_at", { ascending: false });

      setSeasons(seasonsData || []);

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

  const handleCreateSeason = async () => {
    try {
      const { error } = await supabase.from("seasons").insert({
        ...seasonForm,
        status: "active",
      });
      if (error) throw error;
      setShowSeasonModal(false);
      setSeasonForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        reset_coins: 0,
        reset_xp: 0,
      });
      fetchDashboardData();
    } catch (error) {
      console.error("Error creating season:", error);
    }
  };

  const handleDeleteSeason = async (id) => {
    if (!window.confirm("Supprimer cette season ?")) return;
    try {
      const { error } = await supabase.from("seasons").delete().eq("id", id);
      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error("Error deleting season:", error);
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

        {/* Left — Seasons management */}
        <div className="lg:col-span-2 space-y-3">
          <div style={cardStyle} className="rounded-xl p-5">
            {/* header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h2 className="font-black text-white text-sm uppercase tracking-widest">
                  Gestion des Seasons
                </h2>
              </div>
              <button
                onClick={() => setShowSeasonModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200"
                style={{
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.4)",
                  color: "#818cf8",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(99,102,241,0.2)";
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle Season
              </button>
            </div>

            {/* season list */}
            {seasons.length === 0 ? (
              <div className="text-center py-10 text-white/30 text-sm">
                Aucune season créée pour l'instant.
              </div>
            ) : (
              <div className="space-y-3">
                {seasons.map((season) => (
                  <div
                    key={season.id}
                    className="rounded-lg p-4"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">
                          {season.name}
                        </p>
                        {season.description && (
                          <p className="text-white/40 text-xs mt-0.5 truncate">
                            {season.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-white/40">
                            {formatDate(season.start_date)} → {formatDate(season.end_date)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(249,115,22,0.15)",
                              color: "#f97316",
                            }}
                          >
                            Reset {season.reset_coins} CP
                          </span>
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(167,139,250,0.15)",
                              color: "#a78bfa",
                            }}
                          >
                            {season.reset_xp} XP
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                          style={{
                            background: "rgba(99,102,241,0.1)",
                            border: "1px solid rgba(99,102,241,0.2)",
                            color: "#818cf8",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(99,102,241,0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(99,102,241,0.1)";
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSeason(season.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                          style={{
                            background: "rgba(244,63,94,0.1)",
                            border: "1px solid rgba(244,63,94,0.2)",
                            color: "#f43f5e",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(244,63,94,0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(244,63,94,0.1)";
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

      {/* ── 5. SEASON MODAL ───────────────────────────────────────────────── */}
      {showSeasonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSeasonModal(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-5"
            style={{
              background:
                "linear-gradient(135deg,rgba(8,8,20,0.99),rgba(16,16,36,0.99))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-white text-lg">
                  Créer une Season
                </h3>
              </div>
              <button
                onClick={() => setShowSeasonModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                ✕
              </button>
            </div>

            {/* fields */}
            <div className="space-y-4">
              <ModalField label="Nom de la Season">
                <input
                  type="text"
                  placeholder="ex: Season 1"
                  value={seasonForm.name}
                  onChange={(e) =>
                    setSeasonForm({ ...seasonForm, name: e.target.value })
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(99,102,241,0.6)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                />
              </ModalField>

              <ModalField label="Description">
                <input
                  type="text"
                  placeholder="Description de la season"
                  value={seasonForm.description}
                  onChange={(e) =>
                    setSeasonForm({ ...seasonForm, description: e.target.value })
                  }
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(99,102,241,0.6)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                />
              </ModalField>

              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Date de début">
                  <input
                    type="date"
                    value={seasonForm.start_date}
                    onChange={(e) =>
                      setSeasonForm({ ...seasonForm, start_date: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      colorScheme: "dark",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.6)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </ModalField>
                <ModalField label="Date de fin">
                  <input
                    type="date"
                    value={seasonForm.end_date}
                    onChange={(e) =>
                      setSeasonForm({ ...seasonForm, end_date: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      colorScheme: "dark",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.6)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </ModalField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Reset Coins">
                  <input
                    type="number"
                    value={seasonForm.reset_coins}
                    onChange={(e) =>
                      setSeasonForm({
                        ...seasonForm,
                        reset_coins: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.6)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </ModalField>
                <ModalField label="Reset XP">
                  <input
                    type="number"
                    value={seasonForm.reset_xp}
                    onChange={(e) =>
                      setSeasonForm({
                        ...seasonForm,
                        reset_xp: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(99,102,241,0.6)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </ModalField>
              </div>
            </div>

            {/* actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setShowSeasonModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white/50 hover:text-white transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSeason}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg,#6366f1,#818cf8)",
                  boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(99,102,241,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(99,102,241,0.35)";
                }}
              >
                Créer Season
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// tiny helper to keep modal fields tidy
function ModalField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}
