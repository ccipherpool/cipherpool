import { motion } from "framer-motion";

export default function TournamentsTab({ tournaments, setSelectedTournament, setShowTournamentModal, setTournamentToDelete, setShowDeleteConfirm }) {
  return (
    <motion.div
      key="tournaments"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">GESTION DES TOURNOIS</h2>
        <div className="space-y-4">
          {tournaments.length === 0 ? (
            <p className="text-white/40">Aucun tournoi</p>
          ) : (
            tournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                className="bg-[#11152b] rounded-xl p-4 border border-purple-500/20 hover:border-purple-500 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-white">{tournament.name}</p>
                    <p className="text-sm text-white/60">
                      Créé par: {tournament.created_by || ""} • {new Date(tournament.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tournament.status === "registration_open" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                        tournament.status === "live"      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        tournament.status === "completed" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                        "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                      }`}>
                        {tournament.status}
                      </span>
                      <span className="px-2 py-1 bg-[#1a1f35] text-white/60 rounded-full text-xs border border-white/10">
                        {tournament.current_players}/{tournament.max_players} joueurs
                      </span>
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs border border-yellow-500/30">
                        {tournament.prize_coins} prix
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedTournament(tournament); setShowTournamentModal(true); }}
                      className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-all"
                    >
                      Modifier
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => { setTournamentToDelete(tournament); setShowDeleteConfirm(true); }}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
                    >
                      Supprimer
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
