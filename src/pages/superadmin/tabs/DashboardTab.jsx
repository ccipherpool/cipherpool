import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function DashboardTab({ stats, users, logs, setActiveTab, setFilter, setSelectedUser, setGrantAmount, setGrantReason, setWalletSearch, setShowWalletModal }) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="grid md:grid-cols-2 gap-8"
    >
      {/* Actions Rapides */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
        whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="w-1 h-5 bg-purple-500 rounded-full" />
          ACTIONS RAPIDES
        </h2>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setActiveTab("users"); setFilter("pending"); }}
            className="bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
          >
            <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">✅</span>
            <p className="text-sm font-medium">Vérifier ({stats.pendingVerifications})</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("reports")}
            className="bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
          >
            <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">🚨</span>
            <p className="text-sm font-medium">Rapports ({stats.totalReports})</p>
          </motion.button>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
            <div
              onClick={() => { setSelectedUser(null); setGrantAmount(""); setGrantReason(""); setWalletSearch(""); setShowWalletModal(true); }}
              className="block bg-[#11152b] rounded-xl p-4 text-center hover:border-yellow-500 transition-all duration-300 border border-transparent group/btn cursor-pointer"
            >
              <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">💰</span>
              <p className="text-sm font-medium">Gérer Coins</p>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
            <Link
              to="/create-tournament"
              className="block bg-[#11152b] rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 border border-transparent group/btn"
            >
              <span className="text-2xl mb-2 block group-hover/btn:scale-110 transition-transform">🏆</span>
              <p className="text-sm font-medium">Créer Tournoi</p>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Activité Récente */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
        whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="w-1 h-5 bg-purple-500 rounded-full" />
          ACTIVITÉ RÉCENTE
        </h2>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 relative z-10">
          {logs.length === 0 ? (
            <p className="text-white/40 text-center py-4">Aucune activité récente</p>
          ) : (
            logs.slice(0, 10).map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#11152b] rounded-lg p-3 hover:bg-[#1a1f35] transition-colors"
              >
                <p className="text-sm text-white">
                  <span className="text-purple-400">
                    {log?.user_id ? (users.find(u => u.id === log.user_id)?.display_name || log.user_id?.slice(0, 8)) : "Système"}
                  </span>{" "}
                  - {log.action}
                </p>
                <p className="text-xs text-white/40">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Analytiques */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="md:col-span-2 bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group"
        whileHover={{ boxShadow: "0 20px 40px -10px rgba(124,58,237,0.5)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="w-1 h-5 bg-purple-500 rounded-full" />
          ANALYTIQUES EN TEMPS RÉEL
        </h2>
        <div className="grid md:grid-cols-4 gap-4 relative z-10">
          {(() => {
            const todayUsers = users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length;
            const staffCount = users.filter(u => ["admin", "super_admin", "founder", "designer"].includes(u.role)).length;
            return (
              <>
                <div className="bg-[#11152b] rounded-xl p-4">
                  <p className="text-sm text-white/40 mb-2">INSCRITS AUJOURD'HUI</p>
                  <p className="text-2xl font-bold text-white">+{todayUsers}</p>
                  <p className="text-xs text-green-400 mt-1">Comptes créés</p>
                </div>
                <div className="bg-[#11152b] rounded-xl p-4">
                  <p className="text-sm text-white/40 mb-2">TOURNOIS ACTIFS</p>
                  <p className="text-2xl font-bold text-white">{stats.activeTournaments}</p>
                  <p className="text-xs text-blue-400 mt-1">⚡ En cours</p>
                </div>
                <div className="bg-[#11152b] rounded-xl p-4">
                  <p className="text-sm text-white/40 mb-2">TOTAL COINS</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.totalCoins.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-white/30 mt-1">En circulation</p>
                </div>
                <div className="bg-[#11152b] rounded-xl p-4">
                  <p className="text-sm text-white/40 mb-2">MEMBRES STAFF</p>
                  <p className="text-2xl font-bold text-purple-400">{staffCount}</p>
                  <p className="text-xs text-white/30 mt-1">Admins + Founders</p>
                </div>
              </>
            );
          })()}
        </div>
      </motion.div>
    </motion.div>
  );
}
