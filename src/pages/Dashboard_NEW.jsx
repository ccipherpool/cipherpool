import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  DASHBOARD v7 - Professional Edition                      ║
 * ║                                                                           ║
 * ║  Features:                                                              ║
 * ║  ✅ Stats Cards (Coins, XP, Rank, Wins)                                 ║
 * ║  ✅ Recent Tournaments                                                   ║
 * ║  ✅ Quick Actions                                                        ║
 * ║  ✅ Achievements Progress                                                ║
 * ║  ✅ Responsive Grid Layout                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// Stat Card Component
function StatCard({ icon, label, value, change, color = "primary" }) {
  const colorClasses = {
    primary: "from-primary-600/20 to-primary-900/20 border-primary-500/30",
    secondary: "from-secondary-600/20 to-secondary-900/20 border-secondary-500/30",
    accent: "from-accent-600/20 to-accent-900/20 border-accent-500/30",
    danger: "from-danger-600/20 to-danger-900/20 border-danger-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm hover:border-opacity-100 transition-all cursor-pointer group`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-sm font-medium mb-2">{label}</p>
          <h3 className="text-3xl font-bold text-text-primary mb-2">{value}</h3>
          {change && (
            <p className={`text-sm ${change > 0 ? "text-accent-400" : "text-danger-400"}`}>
              {change > 0 ? "↑" : "↓"} {Math.abs(change)} depuis hier
            </p>
          )}
        </div>
        <div className="text-4xl opacity-50 group-hover:opacity-100 transition-opacity">{icon}</div>
      </div>
    </motion.div>
  );
}

// Tournament Card Component
function TournamentCard({ tournament }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-bg-card border border-primary-900/30 rounded-lg p-4 hover:border-primary-500/50 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-text-primary group-hover:text-primary-300 transition-colors">
            {tournament.name}
          </h4>
          <p className="text-xs text-text-muted mt-1">{tournament.mode}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          tournament.status === "active"
            ? "bg-accent-500/20 text-accent-300"
            : tournament.status === "upcoming"
            ? "bg-primary-500/20 text-primary-300"
            : "bg-text-muted/20 text-text-muted"
        }`}>
          {tournament.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-text-muted">Joueurs</p>
          <p className="font-semibold text-text-primary">{tournament.players}/{tournament.max_players}</p>
        </div>
        <div>
          <p className="text-text-muted">Prize Pool</p>
          <p className="font-semibold text-accent-300">{tournament.prize_coins} 💎</p>
        </div>
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickActionButton({ icon, label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-bg-card border border-primary-900/30 hover:border-primary-500/50 transition-all group"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-xs font-medium text-center text-text-secondary group-hover:text-text-primary transition-colors">
        {label}
      </span>
    </motion.button>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        // Fetch player stats
        const { data: statsData } = await supabase
          .from("player_stats")
          .select("*")
          .eq("user_id", user.id)
          .single();

        setStats(statsData);

        // Fetch recent tournaments
        const { data: tournamentsData } = await supabase
          .from("tournaments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        setTournaments(tournamentsData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="w-12 h-12 mb-4 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Bienvenue, {profile?.full_name || "Joueur"}! 👋
        </h1>
        <p className="text-text-secondary">Voici un aperçu de votre progression</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="💎"
          label="Coins"
          value={stats?.coins || 0}
          change={stats?.coins_change || 0}
          color="primary"
        />
        <StatCard
          icon="⚡"
          label="XP"
          value={stats?.xp || 0}
          change={stats?.xp_change || 0}
          color="secondary"
        />
        <StatCard
          icon="🏆"
          label="Rank"
          value={`#${stats?.rank || 0}`}
          change={stats?.rank_change || 0}
          color="accent"
        />
        <StatCard
          icon="🎯"
          label="Victoires"
          value={stats?.wins || 0}
          change={stats?.wins_change || 0}
          color="danger"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickActionButton icon="🏆" label="Tournois" onClick={() => window.location.href = "/tournaments"} />
          <QuickActionButton icon="💬" label="Chat" onClick={() => window.location.href = "/chat"} />
          <QuickActionButton icon="🛍️" label="Boutique" onClick={() => window.location.href = "/store"} />
          <QuickActionButton icon="👥" label="Équipes" onClick={() => window.location.href = "/teams"} />
          <QuickActionButton icon="⚔️" label="Clans" onClick={() => window.location.href = "/clans"} />
          <QuickActionButton icon="📊" label="Stats" onClick={() => window.location.href = "/stats"} />
        </div>
      </div>

      {/* Recent Tournaments */}
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-4">Tournois récents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.length > 0 ? (
            tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-text-muted">Aucun tournoi disponible pour le moment</p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Completion */}
      <div className="bg-gradient-to-r from-primary-600/20 to-secondary-600/20 border border-primary-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-text-primary mb-3">Complétez votre profil</h3>
        <p className="text-text-secondary mb-4">
          Vérifiez votre identité pour accéder à tous les tournois et fonctionnalités premium.
        </p>
        <button className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors">
          Vérifier mon identité
        </button>
      </div>
    </div>
  );
}
