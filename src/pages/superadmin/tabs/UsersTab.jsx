import { motion } from "framer-motion";

export default function UsersTab({ filteredUsers, search, setSearch, filter, setFilter, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-6">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Rechercher par nom, email ou FF ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white focus:border-purple-500 transition-all duration-300"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-3 bg-[#11152b] border border-purple-500/20 rounded-xl text-white focus:border-purple-500 transition-all duration-300"
          >
            <option value="all">TOUS</option>
            <option value="admins">ADMINS</option>
            <option value="founders">FONDATEURS</option>
            <option value="banned">BANNIS</option>
            <option value="pending">EN ATTENTE</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#11152b]">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-white/40">UTILISATEUR</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">RÔLE</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">STATUT</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">SOLDE</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">MATCHES</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">VICTOIRES</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filteredUsers.slice(0, 20).map(user => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: "rgba(124,58,237,0.1)" }}
                  className="transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{user.display_name || user.username || user.full_name || "Inconnu"}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                    {user.free_fire_id && <p className="text-xs text-purple-400">FF: {user.free_fire_id}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === "super_admin" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      user.role === "admin"       ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                      user.role === "designer"    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" :
                      user.role === "founder"     ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                      user.role === "banned"      ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      "bg-white/10 text-white/50 border border-white/10"
                    }`}>
                      {user.role === "super_admin" ? "👑 SUPER" :
                       user.role === "admin"       ? "🛡️ ADMIN" :
                       user.role === "designer"    ? "🎨 DESIGNER" :
                       user.role === "founder"     ? "⚡ FONDATEUR" :
                       user.role === "banned"      ? "🚫 BANNI" : "👤 USER"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.banned_until && new Date(user.banned_until) > new Date()
                      ? <span className="text-red-400 text-xs">BANNI</span>
                      : <span className="text-green-400 text-xs">ACTIF</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-purple-400 font-bold">{user.coins || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{user.stats?.tournaments_played || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400">{user.stats?.wins || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}
                        className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition-all"
                        title="Changer rôle"
                      >👑</motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
                        className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30 transition-all"
                        title="Ajouter coins"
                      >💰</motion.button>
                      {user.role !== "banned" ? (
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all"
                          title="Ban"
                        >🚫</motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => unbanUser(user.id)}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-all"
                          title="Unban"
                        >✅</motion.button>
                      )}
                      {user.role !== "super_admin" && (
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => deleteUser(user.id)}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-all"
                          title="Supprimer"
                        >🗑️</motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 20 && (
          <p className="text-center text-white/40 text-sm mt-4">
            Affichage de 20 utilisateurs sur {filteredUsers.length}
          </p>
        )}
      </div>
    </motion.div>
  );
}
