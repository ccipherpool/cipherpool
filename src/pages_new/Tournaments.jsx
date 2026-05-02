import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button, Card, Badge, Input } from "../components/ui";
import { motion } from "framer-motion";
import { Search, Filter, Trophy, Users, Coins } from "lucide-react";

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

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    setFilteredTournaments(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "upcoming":
        return "primary";
      case "completed":
        return "secondary";
      default:
        return "secondary";
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Tournois</h1>
        <p className="text-text-secondary">Découvrez et participez aux tournois disponibles</p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          icon={Search}
          placeholder="Rechercher un tournoi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:col-span-2"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg bg-bg-card border border-primary-900/30 text-text-primary focus:border-primary-500 focus:outline-none transition-colors"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">En cours</option>
          <option value="upcoming">À venir</option>
          <option value="completed">Terminés</option>
        </select>
      </div>

      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-secondary">Chargement des tournois...</p>
          </div>
        </div>
      ) : filteredTournaments.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filteredTournaments.map((tournament, index) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant="hover" className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary mb-1">
                      {tournament.name}
                    </h3>
                    <p className="text-sm text-text-secondary">{tournament.mode}</p>
                  </div>
                  <Badge variant={getStatusColor(tournament.status)}>
                    {getStatusLabel(tournament.status)}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-text-tertiary mb-4 flex-1">
                  {tournament.description || "Tournoi compétitif"}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-t border-b border-primary-900/30">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-primary-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {tournament.current_players || 0}/{tournament.max_players || 0}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">Joueurs</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-secondary-400 mb-1">
                      <Coins className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {tournament.prize_coins || 0}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">Prize</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-accent-400 mb-1">
                      <Trophy className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {tournament.entry_fee || 0}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">Entrée</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  variant={
                    tournament.status === "active" ? "primary" : "outline"
                  }
                  className="w-full"
                  disabled={tournament.status === "completed"}
                >
                  {tournament.status === "active"
                    ? "Rejoindre"
                    : tournament.status === "upcoming"
                    ? "S'inscrire"
                    : "Terminé"}
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto text-text-muted mb-4 opacity-50" />
          <p className="text-text-secondary text-lg">Aucun tournoi trouvé</p>
          <p className="text-text-muted text-sm">Revenez bientôt pour de nouveaux tournois</p>
        </div>
      )}
    </div>
  );
}
