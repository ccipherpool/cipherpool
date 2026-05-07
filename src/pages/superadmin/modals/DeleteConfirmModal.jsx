import { motion, AnimatePresence } from "framer-motion";

export default function DeleteConfirmModal({ tournamentToDelete, deleteLoading, deleteTournament, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0a1a] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h2>
          <p className="text-white/60 mb-6">
            Êtes-vous sûr de vouloir supprimer le tournoi{" "}
            <span className="text-white font-bold">"{tournamentToDelete?.name}"</span> ?
            <br /><br />
            <span className="text-red-400 text-sm">Cette action est irréversible !</span>
          </p>

          {deleteLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-red-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteTournament(tournamentToDelete.id)}
                className="flex-1 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/30"
              >
                Supprimer
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
