import { motion, AnimatePresence } from "framer-motion";

export default function TournamentModal({ selectedTournament, tournamentStatus, setTournamentStatus, updateTournamentStatus, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0a1a] border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-purple-500/20"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-white mb-4">Modifier le tournoi</h2>
          <p className="text-white/60 mb-4">
            Tournoi: <span className="text-white">{selectedTournament?.name}</span>
          </p>
          <select
            value={tournamentStatus}
            onChange={e => setTournamentStatus(e.target.value)}
            className="w-full px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white mb-4 focus:border-purple-500 transition-all"
          >
            <option value="open">Ouvert</option>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-purple-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => updateTournamentStatus(selectedTournament.id, tournamentStatus)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white font-bold hover:opacity-90 transition-all hover:shadow-lg hover:shadow-purple-500/50"
            >
              Mettre à jour
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
