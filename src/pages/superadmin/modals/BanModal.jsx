import { motion, AnimatePresence } from "framer-motion";

export default function BanModal({ selectedUser, banDuration, setBanDuration, banUser, onClose }) {
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
          <h2 className="text-xl font-bold text-white mb-4">Bannir l'utilisateur</h2>
          <p className="text-white/60 mb-4">
            Utilisateur: <span className="text-white">{selectedUser?.display_name || selectedUser?.username || selectedUser?.email}</span>
          </p>
          <select
            value={banDuration}
            onChange={e => setBanDuration(e.target.value)}
            className="w-full px-4 py-3 bg-[#11152b] border border-red-500/20 rounded-xl text-white mb-4 focus:border-red-500 transition-all"
          >
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="permanent">Permanent</option>
          </select>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-red-500/20 rounded-xl text-white hover:bg-[#11152b] transition-all"
            >
              Annuler
            </button>
            <button
              onClick={() => banUser(selectedUser.id, banDuration)}
              className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/30"
            >
              Bannir
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
