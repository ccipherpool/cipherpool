import { motion } from "framer-motion";

const ROLE_STYLE = {
  super_admin: { badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",  label: "👑 SUPER"     },
  admin:       { badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",         label: "🛡️ ADMIN"     },
  designer:    { badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",         label: "🎨 DESIGNER"  },
  founder:     { badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",   label: "⚡ FONDATEUR" },
  fondateur:   { badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",   label: "⚡ FONDATEUR" },
  banned:      { badge: "bg-red-500/20 text-red-400 border-red-500/30",            label: "🚫 BANNI"     },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { badge: "bg-white/10 text-white/50 border-white/10", label: "👤 USER" };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${s.badge}`}>
      {s.label}
    </span>
  );
}

function ActionButtons({ user, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}
        className="px-2.5 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-all"
        title="Changer rôle"
      >👑</motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
        className="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30 transition-all"
        title="Coins"
      >💰</motion.button>
      {user.role !== "banned" ? (
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
          className="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
          title="Ban"
        >🚫</motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => unbanUser(user.id)}
          className="px-2.5 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30 transition-all"
          title="Unban"
        >✅</motion.button>
      )}
      {user.role !== "super_admin" && (
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={() => deleteUser(user.id)}
          className="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-all"
          title="Supprimer"
        >🗑️</motion.button>
      )}
    </div>
  );
}

export default function UsersTab({
  filteredUsers, search, setSearch, filter, setFilter,
  setSelectedUser, setShowRoleModal, setShowBanModal,
  setShowWalletModal, unbanUser, deleteUser,
}) {
  const actionProps = { setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser };
  const displayed = filteredUsers.slice(0, 20);

  return (
    <motion.div
      key="users"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-[#0a0a1a] border border-purple-500/20 rounded-2xl p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Rechercher par nom, email ou FF ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[#11152b] border border-purple-500/20 rounded-xl text-white text-sm focus:border-purple-500 transition-all duration-300 outline-none"
          />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-[#11152b] border border-purple-500/20 rounded-xl text-white text-sm focus:border-purple-500 transition-all duration-300 outline-none"
          >
            <option value="all">TOUS</option>
            <option value="admins">ADMINS</option>
            <option value="founders">FONDATEURS</option>
            <option value="banned">BANNIS</option>
            <option value="pending">EN ATTENTE</option>
          </select>
        </div>

        {/* Mobile: card view */}
        <div className="md:hidden space-y-3">
          {displayed.map(user => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#11152b] border border-purple-500/10 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm truncate">
                    {user.display_name || user.username || user.full_name || "Inconnu"}
                  </p>
                  <p className="text-xs text-white/40 truncate">{user.email}</p>
                  {user.free_fire_id && (
                    <p className="text-xs text-purple-400">FF: {user.free_fire_id}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <RoleBadge role={user.role} />
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
                <span>
                  {user.banned_until && new Date(user.banned_until) > new Date()
                    ? <span className="text-red-400 font-bold">BANNI</span>
                    : <span className="text-green-400 font-bold">ACTIF</span>
                  }
                </span>
                <span className="text-purple-400 font-bold">💰 {(user.coins || 0).toLocaleString()} CP</span>
                <span>🎮 {user.stats?.tournaments_played || 0}</span>
                <span className="text-green-400">🏆 {user.stats?.wins || 0}</span>
              </div>

              <ActionButtons user={user} {...actionProps} />
            </motion.div>
          ))}

          {displayed.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Aucun utilisateur trouvé</p>
          )}
        </div>

        {/* Desktop: table view */}
        <div className="hidden md:block overflow-x-auto">
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
              {displayed.map(user => (
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
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    {user.banned_until && new Date(user.banned_until) > new Date()
                      ? <span className="text-red-400 text-xs font-bold">BANNI</span>
                      : <span className="text-green-400 text-xs font-bold">ACTIF</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-purple-400 font-bold">{(user.coins || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{user.stats?.tournaments_played || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-green-400">{user.stats?.wins || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionButtons user={user} {...actionProps} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {displayed.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">Aucun utilisateur trouvé</p>
          )}
        </div>

        {filteredUsers.length > 20 && (
          <p className="text-center text-white/40 text-sm mt-4">
            Affichage de 20 / {filteredUsers.length} utilisateurs
          </p>
        )}
      </div>
    </motion.div>
  );
}
