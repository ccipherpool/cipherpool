import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { Trophy, Flame, Zap, Target, Medal } from "lucide-react";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("user_id, total_points, kills, tournaments_played, wins, best_position")
        .gt("tournaments_played", 0)
        .order("total_points", { ascending: false })
        .limit(100);

      if (!statsData?.length) {
        setPlayers([]);
        setLoading(false);
        return;
      }

      const ids = statsData.map(s => s.user_id);

      const [{ data: profiles }, { data: wallets }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, free_fire_id, avatar_url").in("id", ids),
        supabase.from("wallets").select("user_id, balance").in("user_id", ids),
      ]);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      const walletMap = Object.fromEntries((wallets || []).map(w => [w.user_id, w.balance || 0]));
      const statsMap = Object.fromEntries(statsData.map(s => [s.user_id, s]));

      const playersWithCoins = ids
        .filter(id => profileMap[id])
        .map(id => ({
          id,
          name: profileMap[id]?.full_name || "Joueur",
          ffId: profileMap[id]?.free_fire_id || "—",
          avatar: profileMap[id]?.avatar_url,
          coins: walletMap[id] || 0,
          points: statsMap[id]?.total_points || 0,
          kills: statsMap[id]?.kills || 0,
          matches: statsMap[id]?.tournaments_played || 0,
          wins: statsMap[id]?.wins || 0,
          best: statsMap[id]?.best_position || null,
        }))
        .sort((a, b) => b.points !== a.points ? b.points - a.points : b.coins - a.coins)
        .map((player, index) => ({ ...player, rank: index + 1 }));

      setPlayers(playersWithCoins);
    } catch (e) {
      console.error("leaderboard error:", e);
    }
    setLoading(false);
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "from-yellow-500 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-orange-500 to-orange-600";
    return "from-purple-500 to-purple-600";
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        
        .leaderboard-row {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(75, 0, 130, 0.08));
          border: 1px solid rgba(139, 92, 246, 0.15);
          transition: all 0.3s ease;
        }
        
        .leaderboard-row:hover {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(75, 0, 130, 0.15));
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateX(4px);
        }
        
        .rank-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 18px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="text-yellow-500" size={32} />
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Classement
          </h1>
        </div>
        <p className="text-gray-400">Les meilleurs joueurs de la plateforme</p>
      </motion.div>

      {/* Period Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 flex gap-4 border-b border-purple-500/20 pb-4"
      >
        {[
          { key: "weekly", label: "Cette Semaine" },
          { key: "monthly", label: "Ce Mois" },
          { key: "alltime", label: "Tous les Temps" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              period === tab.key
                ? "text-purple-400 border-b-2 border-purple-500"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
          />
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-24">
          <Target size={48} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 text-lg">Aucun joueur trouvé</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-3"
        >
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">Rang</div>
            <div className="col-span-3">Joueur</div>
            <div className="col-span-2 text-center">Points</div>
            <div className="col-span-2 text-center">Kills</div>
            <div className="col-span-2 text-center">Matchs</div>
            <div className="col-span-2 text-center">Victoires</div>
          </div>

          {/* Player Rows */}
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02, duration: 0.3 }}
              className="leaderboard-row rounded-lg p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 items-center backdrop-blur-sm"
            >
              {/* Rank */}
              <div className="col-span-1 flex items-center gap-3">
                <div className={`rank-badge bg-gradient-to-br ${getRankColor(player.rank)}`}>
                  {getRankIcon(player.rank)}
                </div>
              </div>

              {/* Player Info */}
              <div className="col-span-1 md:col-span-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm"
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{player.name}</p>
                    <p className="text-gray-500 text-xs">{player.ffId}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-1 md:col-span-2 stat-item">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Zap size={14} />
                  <span className="font-bold">{player.points}</span>
                </div>
                <span className="text-xs text-gray-500">Points</span>
              </div>

              <div className="col-span-1 md:col-span-2 stat-item">
                <div className="flex items-center gap-1 text-red-400">
                  <Flame size={14} />
                  <span className="font-bold">{player.kills}</span>
                </div>
                <span className="text-xs text-gray-500">Kills</span>
              </div>

              <div className="col-span-1 md:col-span-2 stat-item">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Target size={14} />
                  <span className="font-bold">{player.matches}</span>
                </div>
                <span className="text-xs text-gray-500">Matchs</span>
              </div>

              <div className="col-span-1 md:col-span-2 stat-item">
                <div className="flex items-center gap-1 text-green-400">
                  <Medal size={14} />
                  <span className="font-bold">{player.wins}</span>
                </div>
                <span className="text-xs text-gray-500">Victoires</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
