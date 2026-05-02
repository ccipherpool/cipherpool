import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import { Search, Filter, Trophy, Users, Coins, Flame, Clock, Target } from "lucide-react";

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    filterTournaments();
  }, [tournaments, searchTerm, filterStatus]);

  const fetchTournaments = async () => {
    try {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });

      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTournaments = () => {
    let filtered = tournaments;

    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    setFilteredTournaments(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "from-green-500 to-emerald-600";
      case "upcoming":
        return "from-blue-500 to-cyan-600";
      case "completed":
        return "from-gray-500 to-slate-600";
      default:
        return "from-purple-500 to-indigo-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "active":
        return "En cours";
      case "upcoming":
        return "À venir";
      case "completed":
        return "Terminé";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        
        .tournament-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(75, 0, 130, 0.1));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          transition: all 0.3s ease;
        }
        
        .tournament-card:hover {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(75, 0, 130, 0.15));
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(139, 92, 246, 0.2);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Tournois
        </h1>
        <p className="text-gray-400">Découvrez et participez aux tournois disponibles</p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Rechercher un tournoi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/15 transition-all duration-200"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-gray-100 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/15 transition-all duration-200"
        >
          <option value="all" className="bg-slate-900">Tous les statuts</option>
          <option value="active" className="bg-slate-900">En cours</option>
          <option value="upcoming" className="bg-slate-900">À venir</option>
          <option value="completed" className="bg-slate-900">Terminés</option>
        </select>
      </motion.div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
          />
        </div>
      ) : filteredTournaments.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {filteredTournaments.map((tournament, index) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="tournament-card p-6 rounded-xl flex flex-col h-full cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {tournament.name}
                  </h3>
                  <p className="text-sm text-gray-400">{tournament.mode || "Mode Compétitif"}</p>
                </div>
                <span className={`status-badge bg-gradient-to-r ${getStatusColor(tournament.status)}`}>
                  {getStatusLabel(tournament.status)}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-4 flex-1">
                {tournament.description || "Tournoi compétitif passionnant"}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-t border-b border-purple-500/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                    <Users size={14} />
                    <span className="text-sm font-semibold">
                      {tournament.current_players || 0}/{tournament.max_players || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Joueurs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
                    <Coins size={14} />
                    <span className="text-sm font-semibold">
                      {tournament.prize_coins || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Prize</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                    <Trophy size={14} />
                    <span className="text-sm font-semibold">
                      {tournament.entry_fee || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Entrée</p>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-2 rounded-lg font-semibold transition-all duration-200 ${
                  tournament.status === "active"
                    ? "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white"
                    : tournament.status === "upcoming"
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white"
                    : "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                }`}
                disabled={tournament.status === "completed"}
              >
                {tournament.status === "active"
                  ? "Rejoindre"
                  : tournament.status === "upcoming"
                  ? "S'inscrire"
                  : "Terminé"}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-24">
          <Target size={48} className="mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400 text-lg">Aucun tournoi trouvé</p>
          <p className="text-gray-500 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
        </div>
      )}
    </div>
  );
}
