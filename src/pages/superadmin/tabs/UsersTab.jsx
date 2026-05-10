import { motion } from "framer-motion";
import { 
  ShieldAlert, 
  Wallet, 
  Ban, 
  Trash2, 
  CheckCircle2, 
  MoreVertical, 
  Search,
  Filter,
  User,
  Crown,
  Zap,
  Layout,
  Activity
} from "lucide-react";

const ROLE_STYLE = {
  super_admin: { badge: "bg-red-500/10 text-red-500 border-red-500/20",  label: "SUPER", icon: Zap     },
  admin:       { badge: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "ADMIN", icon: ShieldAlert },
  designer:    { badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "DESIGN", icon: Layout },
  founder:     { badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "FOUNDER", icon: Crown },
  fondateur:   { badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "FOUNDER", icon: Crown },
  banned:      { badge: "bg-slate-800 text-slate-500 border-white/5", label: "BANNED", icon: Ban },
};

function RoleBadge({ role }) {
  const s = ROLE_STYLE[role] || { badge: "bg-white/5 text-slate-400 border-white/5", label: "USER", icon: User };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[8px] font-black rounded-full border ${s.badge} uppercase tracking-widest`}>
      <s.icon size={10} /> {s.label}
    </span>
  );
}

function ActionButtons({ user, setSelectedUser, setShowRoleModal, setShowBanModal, setShowWalletModal, unbanUser, deleteUser }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}
        className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-orange-400 hover:border-orange-400/30 transition-all"
        title="Override Role"
      ><Crown size={14} /></button>
      
      <button
        onClick={() => { setSelectedUser(user); setShowWalletModal(true); }}
        className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-400/30 transition-all"
        title="Sync Assets"
      ><Wallet size={14} /></button>

      {user.role !== "banned" ? (
        <button
          onClick={() => { setSelectedUser(user); setShowBanModal(true); }}
          className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-red-500 hover:border-red-500/30 transition-all"
          title="Terminate Access"
        ><Ban size={14} /></button>
      ) : (
        <button
          onClick={() => unbanUser(user.id)}
          className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-mint hover:border-mint/30 transition-all"
          title="Restore Access"
        ><CheckCircle2 size={14} /></button>
      )}

      {user.role !== "super_admin" && (
        <button
          onClick={() => deleteUser(user.id)}
          className="p-2 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-red-600 hover:border-red-600/30 transition-all"
          title="Purge Data"
        ><Trash2 size={14} /></button>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
         <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-mint transition-colors" size={16} />
            <input
              type="text"
              placeholder="Scan unit registry (ID, Email, Handle)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/5 rounded-2xl text-white text-sm focus:border-mint/30 transition-all outline-none font-mono uppercase"
            />
         </div>
         <div className="flex items-center gap-3">
            <Filter size={16} className="text-slate-600" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-mint/30"
            >
              <option value="all">Total Enlistment</option>
              <option value="admins">Command Staff</option>
              <option value="founders">Founders Only</option>
              <option value="banned">Blacklisted</option>
              <option value="pending">Awaiting Sync</option>
            </select>
         </div>
      </div>

      {/* Grid / Table Container */}
      <div className="ultra-glass overflow-hidden border-white/5">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identified Unit</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Logistics</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-impact text-xl text-slate-600 group-hover:text-mint group-hover:border-mint/30 transition-all">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                       </div>
                       <div>
                          <p className="font-bold text-white uppercase tracking-tight truncate max-w-[200px]">{user.username || user.full_name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-600 font-medium truncate max-w-[200px]">{user.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-2">
                          <Wallet size={12} className="text-cyber-gold" />
                          <span className="text-[10px] font-black text-white">{(user.coins || 0).toLocaleString()} <span className="text-cyber-gold">CP</span></span>
                       </div>
                       <div className="flex items-center gap-2 opacity-40">
                          <Activity size={12} />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">LVL {user.level || 1}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <ActionButtons user={user} {...actionProps} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-white/5">
           {displayed.map(user => (
              <div key={user.id} className="p-6 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-impact text-white">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                       </div>
                       <div>
                          <p className="text-sm font-bold text-white uppercase">{user.username || "Unknown"}</p>
                          <p className="text-[10px] text-slate-600">{user.email}</p>
                       </div>
                    </div>
                    <RoleBadge role={user.role} />
                 </div>
                 <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
                    <div>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Assets</p>
                       <p className="text-xs font-bold text-cyber-gold">{(user.coins || 0).toLocaleString()} CP</p>
                    </div>
                    <ActionButtons user={user} {...actionProps} />
                 </div>
              </div>
           ))}
        </div>

        {displayed.length === 0 && (
          <div className="py-20 text-center opacity-20">
             <User size={64} className="mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Registry Empty</p>
          </div>
        )}
      </div>

      {filteredUsers.length > 20 && (
        <div className="text-center pt-4">
           <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Showing top 20 active units</p>
        </div>
      )}
    </motion.div>
  );
}
