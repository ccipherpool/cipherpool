import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Zap, Shield, TrendingUp, Crown, Star, Flame, Target, Sword, Medal, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";

// Glassmorphism Card Component
function GlassCard({ children, className = "", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`rounded-2xl p-6 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all ${className}`}
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
      }}
    >
      {children}
    </motion.div>
  );
}

// Stat Card with Animation
function StatCard({ icon: Icon, label, value, trend, delay = 0 }) {
  return (
    <GlassCard delay={delay} className="group cursor-pointer hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:from-indigo-500/30 group-hover:to-purple-500/30 transition-all">
          <Icon className="w-6 h-6 text-indigo-400" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-bold text-green-400">
            <TrendingUp size={14} />
            {trend}%
          </div>
        )}
      </div>
      <p className="text-white/60 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </GlassCard>
  );
}

// Tournament Card
function TournamentCard({ tournament, delay = 0 }) {
  const statusColor = {
    active: "from-green-500/20 to-emerald-500/20",
    upcoming: "from-blue-500/20 to-cyan-500/20",
    completed: "from-gray-500/20 to-slate-500/20"
  };

  return (
    <GlassCard delay={delay} className="hover:scale-105">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{tournament.name}</h3>
          <p className="text-xs text-white/50">{tournament.game}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${statusColor[tournament.status]}`}>
          {tournament.status === "active" && "En cours"}
          {tournament.status === "upcoming" && "À venir"}
          {tournament.status === "completed" && "Terminé"}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Participants</span>
          <span className="text-white font-bold">{tournament.participants}/{tournament.maxParticipants}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(tournament.participants / tournament.maxParticipants) * 100}%` }}
            transition={{ duration: 1, delay: delay + 0.3 }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-white/60">Prize Pool</span>
          <span className="text-green-400 font-bold">{tournament.prizePool}</span>
        </div>
      </div>

      <button className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold text-sm transition-all">
        Rejoindre
      </button>
    </GlassCard>
  );
}

// Leaderboard Entry
function LeaderboardEntry({ rank, player, points, delay = 0 }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all"
    >
      <div className="flex items-center gap-4">
        <span className="text-2xl">{medals[rank] || `#${rank}`}</span>
        <div>
          <p className="text-white font-bold">{player}</p>
          <p className="text-xs text-white/50">Niveau {rank}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-white font-bold">{points}</p>
        <p className="text-xs text-white/50">points</p>
      </div>
    </motion.div>
  );
}

export default function Dashboard_Redesigned() {
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Mock tournaments data
        setTournaments([
          {
            id: 1,
            name: "Elite Cup 2026",
            game: "Free Fire",
            status: "active",
            participants: 128,
            maxParticipants: 256,
            prizePool: "50,000 CP"
          },
          {
            id: 2,
            name: "Squad Championship",
            game: "Free Fire",
            status: "upcoming",
            participants: 64,
            maxParticipants: 128,
            prizePool: "30,000 CP"
          },
          {
            id: 3,
            name: "Beginner's Battle",
            game: "Free Fire",
            status: "active",
            participants: 256,
            maxParticipants: 512,
            prizePool: "10,000 CP"
          }
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 backdrop-blur-xl border-b border-white/10 z-40"
          style={{ background: "rgba(15,23,42,0.8)" }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-black text-white">
                CP
              </div>
              <span className="font-black text-xl tracking-wider">CIPHERPOOL</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all text-sm font-medium">
                Profil
              </button>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all text-sm font-bold">
                Déconnexion
              </button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-12"
          >
            <h1 className="text-5xl font-black mb-2">
              Bienvenue, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{user?.email?.split("@")[0]}</span>
            </h1>
            <p className="text-white/60 text-lg">Prépare-toi pour la prochaine compétition</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard icon={Trophy} label="Tournois gagnés" value="12" trend="23" delay={0} />
            <StatCard icon={Users} label="Équipe" value="5" trend="0" delay={0.1} />
            <StatCard icon={Star} label="Points totaux" value="4,250" trend="15" delay={0.2} />
            <StatCard icon={Flame} label="Streak actuel" value="7" trend="100" delay={0.3} />
          </div>

          {/* Tournaments Section */}
          <div className="mb-12">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl font-black mb-6 flex items-center gap-3"
            >
              <Sword className="w-8 h-8 text-indigo-400" />
              Tournois actifs
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament, i) => (
                <TournamentCard key={tournament.id} tournament={tournament} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Players */}
            <GlassCard>
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-400" />
                Top Joueurs
              </h3>
              <div className="space-y-2">
                {[
                  { rank: 1, player: "Ahmed Pro", points: 15000 },
                  { rank: 2, player: "Yassine Gamer", points: 12500 },
                  { rank: 3, player: "Sara Esports", points: 11200 },
                  { rank: 4, player: "Karim Elite", points: 9800 },
                  { rank: 5, player: "Fatima Queen", points: 8500 }
                ].map((entry, i) => (
                  <LeaderboardEntry key={i} {...entry} delay={i * 0.05} />
                ))}
              </div>
            </GlassCard>

            {/* Recent Matches */}
            <GlassCard>
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-cyan-400" />
                Matchs récents
              </h3>
              <div className="space-y-4">
                {[
                  { opponent: "Team Legends", result: "Victoire", score: "3-1" },
                  { opponent: "Phoenix Squad", result: "Défaite", score: "1-2" },
                  { opponent: "Elite Force", result: "Victoire", score: "2-0" }
                ].map((match, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-all"
                  >
                    <div>
                      <p className="text-white font-bold">{match.opponent}</p>
                      <p className="text-xs text-white/50">{match.score}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      match.result === "Victoire" 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {match.result}
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>
        </main>
      </div>
    </div>
  );
}
